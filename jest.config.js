module.exports = {
  setupFilesAfterEnv: ['<rootDir>/setup-tests.js'],
  globals: {
    config: {
      appVersion: 'foo',
    },
  },
  roots: ['desktop', 'lib', 'scripts'],
  testEnvironment: 'jsdom',
  testRegex: '(/test/.*\\.[jt]sx?)|(test\\.[jt]sx?)$',
};
