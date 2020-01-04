const isDevConfig = config => {
  const isDev = Boolean(config.development);
  const whichDB = isDev ? 'Development' : 'Production';
  const shouldWarn =
    process.env.NODE_ENV === 'production' && config.development;
  const consoleMode = shouldWarn ? 'warn' : 'info';
  console[consoleMode](`Simperium config: ${whichDB}`); // eslint-disable-line no-console

  return isDev;
};

export default isDevConfig;
