import checkConfig from './';

describe('checkConfig', () => {
  const consoleWarn = global.console.warn;

  afterEach(() => {
    global.process.env.NODE_ENV = 'test';
    global.console.warn = consoleWarn;
  });

  it('should console.warn when NODE_ENV is production and Simperium is not', () => {
    global.process.env.NODE_ENV = 'production';
    global.console.warn = jest.fn();
    const config = { development: true };
    checkConfig(config);
    expect(global.console.warn).toHaveBeenCalled();
  });
});
