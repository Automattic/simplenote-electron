module.exports = {
  setupFilesAfterEnv: ['./setup-tests.js'],
  globals: {
    config: {
      appVersion: 'foo',
    },
  },
  roots: ['desktop', 'lib'],
  testRegex: '(/test/.*\\.jsx?)|(test\\.jsx?)$',
};
