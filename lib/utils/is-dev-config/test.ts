import isDevConfig from './';

describe('isDevConfig', () => {
  const unmockedConsole = global.console;

  beforeEach(() => {
    global.console = {
      info: jest.fn(),
      warn: jest.fn(),
    };
  });

  afterEach(() => {
    global.process.env.NODE_ENV = 'test';
    global.console = unmockedConsole;
  });

  it('should return a boolean of whether config is dev or not', () => {
    expect(isDevConfig({ development: true })).toBe(true);
    expect(isDevConfig({})).toBe(false);
  });

  it('should console.warn when NODE_ENV is production and Simperium is not', () => {
    global.process.env.NODE_ENV = 'production';
    global.console.warn = jest.fn();
    const config = { development: true };
    isDevConfig(config);
    expect(global.console.warn).toHaveBeenCalled();
  });
});
