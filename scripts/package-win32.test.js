const childProcess = require('node:child_process');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..');

function packageWin32DryRun() {
  const result = childProcess.spawnSync(
    'make',
    ['-n', 'package-win32', 'PUBLISH=never', 'SKIP_BUILD=true'],
    {
      cwd: repoRoot,
      encoding: 'utf8',
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
  it('signs via Azure unconditionally', () => {
    const output = packageWin32DryRun();

    expect(output).toContain('-c.win.sign=./scripts/azure-sign.cjs');
    expect(output).toContain(
      'env -u CSC_LINK -u CSC_KEY_PASSWORD -u WIN_CSC_LINK -u WIN_CSC_KEY_PASSWORD'
    );
  });
});
