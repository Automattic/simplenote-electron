// electron-builder `win.sign` callback: signs Windows artifacts with Azure Trusted Signing,
// falling back to the legacy PFX certificate.
//
// Once `win.sign` is set, electron-builder routes ALL Windows signing through this callback, so
// it carries both paths. It prefers Azure Trusted Signing (the migration target); when the Azure
// env is absent it falls back to the existing PFX cert — a cutover safety net retained until the
// Azure-signed distribution is confirmed shipping (campaign step `remove-pfx-fallback`).
//
// electron-builder calls this once per file after `rcedit` rewrites the PE resource directory, so
// signatures are not orphaned. Azure Trusted Signing is SHA256-only — hence
// `signingHashAlgorithms: ["sha256"]` in electron-builder.json, so there is no SHA1 pass.
//
// Azure env vars come from a8c-ci-toolkit's `setup_azure_trusted_signing.ps1`; the PFX inputs
// (`CSC_LINK`, `CSC_KEY_PASSWORD`) from `setup_windows_code_signing.ps1`. With neither present
// (local `make package-win32`), signing is skipped so the build still produces an unsigned exe.

const fs = require('node:fs');
const childProcess = require('node:child_process');

const AZURE_ENV_VARS = [
  'SIGNTOOL_PATH',
  'AZURE_CODE_SIGNING_DLIB',
  'AZURE_METADATA_JSON',
];
const DEFAULT_TIMESTAMP_SERVER = 'http://timestamp.acs.microsoft.com';

function nonBlank(value) {
  return typeof value === 'string' && value.trim() !== ''
    ? value.trim()
    : undefined;
}

function hasAzureEnv(env) {
  return AZURE_ENV_VARS.every((name) => nonBlank(env[name]) !== undefined);
}

function pfxInputs(env) {
  const file = nonBlank(env.CSC_LINK);
  return {
    file: file && fs.existsSync(file) ? file : undefined,
    password: nonBlank(env.CSC_KEY_PASSWORD),
  };
}

function buildAzureArgs(file, env) {
  return [
    'sign',
    '/v',
    // `/debug` surfaces Azure auth/quota/network diagnostics instead of a generic SignTool error.
    '/debug',
    '/fd',
    'SHA256',
    '/tr',
    nonBlank(env.AZURE_TIMESTAMP_SERVER) || DEFAULT_TIMESTAMP_SERVER,
    '/td',
    'SHA256',
    '/dlib',
    nonBlank(env.AZURE_CODE_SIGNING_DLIB),
    '/dmdf',
    nonBlank(env.AZURE_METADATA_JSON),
    file,
  ];
}

function buildPfxArgs(file, env, pfx) {
  return [
    'sign',
    '/v',
    '/fd',
    'SHA256',
    '/f',
    pfx.file,
    '/p',
    pfx.password,
    '/tr',
    nonBlank(env.AZURE_TIMESTAMP_SERVER) || DEFAULT_TIMESTAMP_SERVER,
    '/td',
    'SHA256',
    file,
  ];
}

function runSigntool(signtool, args, file, method) {
  // eslint-disable-next-line no-console
  console.log(`[azure-sign] Signing ${file} with ${method}`);
  const result = childProcess.spawnSync(signtool, args, { stdio: 'inherit' });
  if (result.error) {
    throw result.error;
  }
  if (result.signal) {
    throw new Error(
      `[azure-sign] signtool terminated by signal ${result.signal} signing ${file}`
    );
  }
  if (result.status !== 0) {
    throw new Error(
      `[azure-sign] signtool exited with code ${result.status} signing ${file}`
    );
  }
}

module.exports = async function sign(configuration) {
  const file = configuration.path;
  const env = process.env;

  if (hasAzureEnv(env)) {
    runSigntool(
      nonBlank(env.SIGNTOOL_PATH),
      buildAzureArgs(file, env),
      file,
      'Azure Trusted Signing'
    );
    return;
  }

  const pfx = pfxInputs(env);
  if (env.CI && process.platform === 'win32') {
    if (pfx.file && pfx.password) {
      const signtool = nonBlank(env.SIGNTOOL_PATH) || 'signtool';
      runSigntool(
        signtool,
        buildPfxArgs(file, env, pfx),
        file,
        'PFX certificate'
      );
      return;
    }
    throw new Error(
      `[azure-sign] No Windows signing credentials in CI for ${file}. ` +
        `Azure not configured (${AZURE_ENV_VARS.join(', ')}); ` +
        `PFX fallback unavailable (CSC_LINK ${pfx.file ? 'present' : 'missing'}, ` +
        `CSC_KEY_PASSWORD ${pfx.password ? 'set' : 'missing'}).`
    );
  }

  // eslint-disable-next-line no-console
  console.log(
    `[azure-sign] No signing env set; skipping ${file} (expected for local builds).`
  );
};

module.exports.hasAzureEnv = hasAzureEnv;
module.exports.pfxInputs = pfxInputs;
module.exports.buildAzureArgs = buildAzureArgs;
module.exports.buildPfxArgs = buildPfxArgs;
module.exports.AZURE_ENV_VARS = AZURE_ENV_VARS;
