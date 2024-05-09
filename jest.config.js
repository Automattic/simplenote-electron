module.exports = {
  setupFilesAfterEnv: ['<rootDir>/setup-tests.js'],
  globals: {
    config: {
      appVersion: 'foo',
    },
  },
  roots: ['desktop', 'lib'],
  testEnvironment: 'jsdom',
  testRegex: '(/test/.*\\.[jt]sx?)|(test\\.[jt]sx?)$',
};
