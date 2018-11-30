const checkConfig = config => {
  const whichDB = config.development ? 'Development' : 'Production';
  const shouldWarn =
    process.env.NODE_ENV === 'production' && config.development;
  const consoleMode = shouldWarn ? 'warn' : 'info';
  console[consoleMode](`Simperium config: ${whichDB}`); // eslint-disable-line no-console
};

export default checkConfig;
