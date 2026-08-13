// Coverage gate for the CLI module. Not auto-picked-up by `npx jest lib/cli`
// (jest resolves upward from cwd to the root jest.config.js and stops), so it
// must be invoked explicitly: `npx jest --config lib/cli/jest.config.cjs
// --coverage`. Keeping it separate means the repo-wide suite stays as it is
// while the module gets its own enforceable floor.
//
// `.cjs` rather than `.js` on purpose: jest treats config files as CommonJS,
// and a `.cjs` extension keeps that true even if package.json gains a
// `"type": "module"` field later.
module.exports = {
  setupFilesAfterEnv: ['<rootDir>/../../setup-tests.js'],
  roots: ['<rootDir>'],
  // The CLI is a Node program (fetch/streams/process); jsdom would inject a
  // DOM global the code never uses and slow every suite down for nothing.
  testEnvironment: 'node',
  testRegex: '(__tests__/.*\\.test\\.ts)$',
  transform: {
    // babel.config.js is a root-level config that babel only reads from its
    // cwd (here: lib/cli, the rootDir). `rootMode: "upward"` makes babel walk
    // up to the repository root where the config actually lives; without it
    // the TS preset is never applied and every .ts file fails to parse.
    '^.+\\.[jt]sx?$': ['babel-jest', { rootMode: 'upward' }],
  },
  collectCoverageFrom: [
    '<rootDir>/*.ts',
    '<rootDir>/commands/*.ts',
    '<rootDir>/domain/*.ts',
    '<rootDir>/infra/*.ts',
  ],
  coverageThreshold: {
    global: { statements: 80, branches: 75, functions: 80, lines: 80 },
  },
};
