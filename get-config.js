function readConfig() {
  try {
    const config = require('./config-local');
    if (typeof config === 'function') {
      throw new Error('Invalid config file. Config must be JSON.');
    }
    return config;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(
      `Could not load the required configuration file.\n` +
        'Please consult the project README.md for further information.'
    );

    throw e;
  }
}

function getConfig() {
  var config = readConfig();
  var pkg = require('./package.json');
  config.version = pkg.version;
  return config;
}

module.exports = getConfig;
