import { spawnSync } from 'node:child_process';
import {
  copyFileSync,
  existsSync,
  readFileSync,
  readdirSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const dist = join(root, 'dist');
const cliJs = join(dist, 'cli.js');
const blob = join(dist, 'sea.blob');
const configPath = join(dist, 'sea-config.json');
const exeName =
  process.platform === 'win32' ? 'simplenote-cli.exe' : 'simplenote-cli';
const outExe = join(dist, exeName);

// Sentinel fuse expected by recent Node SEA releases (NODE_SEA_FUSE_... in
// src/node_sea.cc). Older releases used a different constant; using the wrong
// one makes postject report "Could not find the sentinel ... in the binary".
// The host version is preflighted below so the failure message names the real
// cause instead of a postject error.
const SENTINEL_FUSE = 'NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2';

function fail(message) {
  console.error(`\u2717 ${message}`);
  process.exit(1);
}

// The CLI's runtime floor is Node 18.13 (readline's {signal} option); the SEA
// host must at least match it so the bundled artifact behaves like the source.
const [nodeMajor, nodeMinor] = process.versions.node
  .split('.')
  .map((part) => Number(part));
if (nodeMajor < 18 || (nodeMajor === 18 && nodeMinor < 13)) {
  fail(
    `SEA build requires Node >=18.13 (got ${process.version}). ` +
      `Upgrade and rerun.`
  );
}

function step(label) {
  console.log(`\u2192 ${label}`);
}

/**
 * Locate an upstream, unmodified Node binary to use as the SEA host.
 *
 * Sandboxed or tool-wrapped distributions (e.g. some IDE-managed runtimes)
 * can ship a node.exe with the original signature stripped, which makes
 * `postject` fail with "signature seems corrupted" / "Could not find the
 * sentinel ... in the binary". Falling back to a standard install keeps the
 * build reproducible on such hosts.
 *
 * Returns an absolute path, or throws if nothing usable is found.
 */
function resolveHostNode() {
  const userProfile = process.env.USERPROFILE ?? '';
  const localAppData = process.env.LOCALAPPDATA ?? '';
  const roots = [
    join(localAppData, 'nodejs', 'node.exe'),
    'C:/Program Files/nodejs/node.exe',
    'C:/Program Files (x86)/nodejs/node.exe',
  ];
  for (const candidate of roots) {
    if (candidate && existsSync(candidate)) return candidate;
  }
  // ~/.trae-cn/binaries/node holds `versions/<x.y.z>/node.exe`; pick the
  // newest numeric subdir under versions.
  const versionsRoot = join(
    userProfile,
    '.trae-cn',
    'binaries',
    'node',
    'versions'
  );
  try {
    const entries = readdirSync(versionsRoot)
      .filter((name) => /^\d+\.\d+\.\d+$/.test(name))
      .sort()
      .reverse();
    if (entries.length) {
      const perVersion = join(versionsRoot, entries[0], 'node.exe');
      if (existsSync(perVersion)) return perVersion;
    }
  } catch {
    // ignore; fall through
  }
  // Last resort: trust the running node.exe (works on hosts without IDE
  // sandboxes; on those, the standard path above usually wins first).
  if (existsSync(process.execPath)) return process.execPath;
  throw new Error(
    `No standard node.exe found. Looked under ${roots.join(', ')} and ` +
      `${versionsRoot}. Install Node 18.13+ from nodejs.org and rerun.`
  );
}

if (!existsSync(cliJs)) {
  fail(
    `dist/cli.js not found at ${cliJs}. Run \`npm run build\` inside lib/cli ` +
      `first; sea bundles whatever the esbuild step produced.`
  );
}

const hostNode = resolveHostNode();
step(`Using host node: ${hostNode}`);

// 1. SEA config: bundle the esbuild output as the entry point. `main` and
//    `output` are resolved against the spawn cwd; absolute paths keep the
//    script independent of where it is invoked from.
writeFileSync(
  configPath,
  JSON.stringify(
    {
      main: cliJs,
      output: blob,
      disableExperimentalSEAWarning: true,
      useSnapshot: false,
      useCodeCache: false,
    },
    null,
    2
  )
);

// 2. Generate the SEA blob from the bundled CLI. Run the host node from the
//    dist directory so the optional "main" path semantics stay stable if
//    anyone switches back to a relative path in the future.
step('Generating SEA blob with --experimental-sea-config');
const seaGen = spawnSync(hostNode, ['--experimental-sea-config', configPath], {
  cwd: dist,
  stdio: 'inherit',
});
if (seaGen.status !== 0) {
  fail(
    `${hostNode} --experimental-sea-config exited with code ${seaGen.status}. ` +
      `SEA requires Node 18.13+; current version is ${process.version}.`
  );
}
if (!existsSync(blob)) {
  fail(`SEA blob not produced at ${blob}`);
}

// 3. Copy the host node binary as our distribution exe.
step(`Copying ${hostNode} -> ${outExe}`);
try {
  copyFileSync(hostNode, outExe);
} catch (error) {
  fail(`Failed to copy node executable: ${error.message}`);
}

// 4. Inject the blob with postject. We invoke via npx so the script works
//    even when postject is not declared as a dependency of lib/cli or the
//    repo root. SEA itself does not depend on postject, but the official
//    Node docs ship postject as the documented injection tool.
step('Injecting SEA blob into the executable');
const postject = spawnSync(
  'cmd.exe',
  [
    '/c',
    'npx',
    '--yes',
    'postject@1.0.0-alpha.6',
    outExe,
    'NODE_SEA_BLOB',
    blob,
    '--sentinel-fuse',
    SENTINEL_FUSE,
  ],
  { encoding: 'utf8' }
);
if (postject.stdout) process.stdout.write(postject.stdout);
if (postject.stderr) process.stderr.write(postject.stderr);
if (postject.status !== 0) {
  fail(`postject exited with code ${postject.status}.`);
}

// 5. Smoke test: the resulting exe must answer --version without a Node
//    runtime on PATH.
step(`Smoke test: ${outExe} --version`);

// The expected version comes from the manifest written by build.mjs (the
// same file install.mjs reads), not a hard-coded string that goes stale on
// the next release.
const expectedVersion = JSON.parse(
  readFileSync(join(dist, 'package.json'), 'utf8')
).version;

const smoke = spawnSync(outExe, ['--version'], { encoding: 'utf8' });
if (smoke.stdout) process.stdout.write(smoke.stdout);
if (smoke.stderr) process.stderr.write(smoke.stderr);
if (smoke.status !== 0) {
  fail(`smoke test exited with code ${smoke.status}`);
}
if (!smoke.stdout.includes(expectedVersion)) {
  fail(`smoke test did not report the expected version ${expectedVersion}`);
}

console.log(
  `\u2713 SEA executable built at ${outExe}. Distribution: copy this single file.`
);

// 6. Remove build-time intermediates so the dist/ directory only ships what the
//    runtime needs: the bundled CLI, the version manifest, and the final exe.
for (const tmp of [blob, configPath]) {
  try {
    unlinkSync(tmp);
  } catch {
    // ignore — already gone, or never written
  }
}
