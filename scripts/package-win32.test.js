const childProcess = require('node:child_process');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..');

function packageWin32DryRun(envOverrides = {}) {
  const env = { ...process.env, ...envOverrides };
  Object.keys(env).forEach((key) => {
    if (env[key] === undefined) {
      delete env[key];
    }
  });

  const result = childProcess.spawnSync(
    'make',
    ['-n', 'package-win32', 'PUBLISH=never', 'SKIP_BUILD=true'],
    {
      cwd: repoRoot,
      encoding: 'utf8',
      env,
    }
  );

  if (result.status !== 0) {
    throw new Error(
      `make dry-run failed with ${result.status}\n${result.stdout}\n${result.stderr}`
    );
  }

  return `${result.stdout}\n${result.stderr}`;
}

describe('package-win32 signing mode', () => {
  it('uses Azure signing by default', () => {
    const output = packageWin32DryRun({ USE_PFX_CODE_SIGNING: undefined });

    expect(output).toContain('-c.win.sign=./scripts/azure-sign.cjs');
    expect(output).toContain(
      'env -u CSC_LINK -u CSC_KEY_PASSWORD -u WIN_CSC_LINK -u WIN_CSC_KEY_PASSWORD'
    );
  });

  it('uses native PFX signing when requested', () => {
    const output = packageWin32DryRun({ USE_PFX_CODE_SIGNING: '1' });

    expect(output).not.toContain('-c.win.sign=./scripts/azure-sign.cjs');
    expect(output).not.toContain(
      'env -u CSC_LINK -u CSC_KEY_PASSWORD -u WIN_CSC_LINK -u WIN_CSC_KEY_PASSWORD'
    );
  });
});
