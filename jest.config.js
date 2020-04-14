module.exports = {
  setupFilesAfterEnv: ["<rootDir>/setup-tests.js"],
  globals: {
    config: {
      appVersion: "foo",
    },
  },
  roots: ["desktop", "lib"],
  testRegex: "(/test/.*\\.[jt]sx?)|(test\\.[jt]sx?)$",
};
