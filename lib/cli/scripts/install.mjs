import { spawnSync } from 'node:child_process';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  unlinkSync,
} from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const dist = join(root, 'dist');
const exe = join(dist, 'simplenote-cli.exe');
const versionManifest = join(dist, 'package.json');

const userBin = join(process.env.USERPROFILE ?? '', '.local', 'bin');
const installed = join(userBin, 'simplenote-cli.exe');
// Namespaced so it cannot clobber another tool's package.json in the same
// directory; uninstall() below removes the same name.
const installedManifest = join(userBin, 'simplenote-cli.package.json');

function fail(message) {
  console.error(`\u2717 ${message}`);
  process.exit(1);
}

function step(label) {
  console.log(`\u2192 ${label}`);
}

function uninstall() {
  for (const path of [installed, installedManifest]) {
    try {
      unlinkSync(path);
      console.log(`\u2713 removed ${path}`);
    } catch (error) {
      if (error.code === 'ENOENT') {
        console.log(`  ${path} not installed, skipping.`);
      } else {
        console.error(`  ${error.message}`);
        process.exit(1);
      }
    }
  }
  console.log('\u2713 uninstalled.');
}

if (process.argv[2] === '--uninstall') {
  uninstall();
  process.exit(0);
}

if (!existsSync(exe)) {
  fail(
    `Binary not found at ${exe}. Run \`npm run build:sea\` inside lib/cli ` +
      `first; install only copies the SEA artifact into your PATH.`
  );
}

if (!existsSync(versionManifest)) {
  fail(
    `Version manifest not found at ${versionManifest}; SEA artifact incomplete.`
  );
}

if (!existsSync(userBin)) {
  fail(
    `User bin directory ${userBin} does not exist. Add it to your PATH first, ` +
      `or pass an explicit destination as the second argument.`
  );
}

step(`Copying ${exe} -> ${installed}`);
try {
  mkdirSync(userBin, { recursive: true });
  copyFileSync(exe, installed);
} catch (error) {
  fail(`copy failed: ${error.message}`);
}

step(`Copying ${versionManifest} -> ${installedManifest}`);
try {
  copyFileSync(versionManifest, installedManifest);
} catch (error) {
  fail(`manifest copy failed: ${error.message}`);
}

step(`Smoke test: simplenote-cli --version`);
// Expected version comes from the manifest the build produced, never a
// hard-coded literal — the check would otherwise fail with a misleading
// message on the next version bump.
const expectedVersion = JSON.parse(
  readFileSync(versionManifest, 'utf8')
).version;
const probe = spawnSync('simplenote-cli', ['--version'], {
  encoding: 'utf8',
  shell: false,
});
if (probe.stdout) process.stdout.write(probe.stdout);
if (probe.stderr) process.stderr.write(probe.stderr);
if (probe.status !== 0) {
  fail(`installed binary exited with code ${probe.status}`);
}
if (!probe.stdout.includes(expectedVersion)) {
  fail(
    `installed binary did not report ${expectedVersion} (got: ${probe.stdout.trim()})`
  );
}

console.log('\u2713 installed.');
console.log(`  PATH directory : ${userBin}`);
console.log(`  command name   : simplenote-cli`);
console.log(`  uninstall with : node lib/cli/scripts/install.mjs --uninstall`);
