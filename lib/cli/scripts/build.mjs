import { build } from 'esbuild';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));

mkdirSync(join(root, 'dist'), { recursive: true });

await build({
  entryPoints: [join(root, 'bootstrap.ts')],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: ['node18'],
  banner: { js: '#!/usr/bin/env node' },
  // `platform: 'node'` already marks Node built-ins as external; the explicit
  // list is a defensive declaration of the subpaths we rely on, so a reader
  // does not have to infer them from the imports.
  external: [
    'readline/promises',
    'stream/promises',
    'fs/promises',
    'timers/promises',
  ],
  // Stamp the version into the bundle so packaged copies (dist/cli.js, the SEA
  // executable) report what they were built from even when no package.json
  // sits next to them. `getVersion()` reads this first and falls back to the
  // manifest chain only when it is absent (source/tests).
  define: {
    'process.env.SIMPLENOTE_CLI_VERSION': JSON.stringify(pkg.version),
  },
  outfile: join(root, 'dist', 'cli.js'),
  logLevel: 'info',
});

writeFileSync(
  join(root, 'dist', 'package.json'),
  JSON.stringify({ name: pkg.name, version: pkg.version }, null, 2)
);
