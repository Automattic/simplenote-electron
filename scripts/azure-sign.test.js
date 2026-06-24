const childProcess = require('node:child_process');
const signer = require('./azure-sign.cjs');

const AZURE_ENV = {
  SIGNTOOL_PATH: 'C:\\sdk\\signtool.exe',
  AZURE_CODE_SIGNING_DLIB: 'C:\\azure\\Azure.CodeSigning.Dlib.dll',
  AZURE_METADATA_JSON: 'C:\\azure\\metadata.json',
};

describe('hasAzureEnv', () => {
  it('is true only when all Azure vars are non-blank', () => {
    expect(signer.hasAzureEnv(AZURE_ENV)).toBe(true);
  });

  it('is false when any Azure var is missing or blank', () => {
    expect(signer.hasAzureEnv({ ...AZURE_ENV, AZURE_METADATA_JSON: '' })).toBe(
      false
    );
    expect(signer.hasAzureEnv({ ...AZURE_ENV, SIGNTOOL_PATH: '   ' })).toBe(
      false
    );
    expect(signer.hasAzureEnv({})).toBe(false);
  });
});

describe('missingAzureEnv', () => {
  it('lists the missing or blank Azure vars', () => {
    expect(
      signer.missingAzureEnv({
        ...AZURE_ENV,
        SIGNTOOL_PATH: '',
        AZURE_METADATA_JSON: '   ',
      })
    ).toEqual(['SIGNTOOL_PATH', 'AZURE_METADATA_JSON']);
  });
});

describe('buildAzureArgs', () => {
  it('signs SHA256-only via /dlib + /dmdf', () => {
    const args = signer.buildAzureArgs('app.exe', AZURE_ENV);
    expect(args).toEqual([
      'sign',
      '/v',
      '/debug',
      '/fd',
      'SHA256',
      '/tr',
      'http://timestamp.acs.microsoft.com',
      '/td',
      'SHA256',
      '/dlib',
      AZURE_ENV.AZURE_CODE_SIGNING_DLIB,
      '/dmdf',
      AZURE_ENV.AZURE_METADATA_JSON,
      'app.exe',
    ]);
  });

  it('honours an overridden timestamp server', () => {
    const args = signer.buildAzureArgs('app.exe', {
      ...AZURE_ENV,
      AZURE_TIMESTAMP_SERVER: 'http://ts.example',
    });
    expect(args[args.indexOf('/tr') + 1]).toBe('http://ts.example');
  });
});

describe('sign callback dispatch', () => {
  const originalEnv = process.env;
  const originalPlatform = process.platform;
  let spawn;

  beforeEach(() => {
    process.env = {};
    spawn = jest
      .spyOn(childProcess, 'spawnSync')
      .mockReturnValue({ status: 0 });
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    process.env = originalEnv;
    Object.defineProperty(process, 'platform', { value: originalPlatform });
    jest.restoreAllMocks();
  });

  const setPlatform = (value) =>
    Object.defineProperty(process, 'platform', { value });

  it('skips signing (no throw, no signtool) off-CI', async () => {
    setPlatform('darwin');
    await expect(signer({ path: 'app.exe' })).resolves.toBeUndefined();
    expect(spawn).not.toHaveBeenCalled();
  });

  it('signs via Azure when the Azure env is present', async () => {
    setPlatform('win32');
    process.env = { ...AZURE_ENV };
    await signer({ path: 'app.exe' });
    expect(spawn).toHaveBeenCalledWith(
      AZURE_ENV.SIGNTOOL_PATH,
      expect.arrayContaining(['/dlib']),
      expect.anything()
    );
  });

  it('skips the sha1 pass (Azure is SHA256-only)', async () => {
    setPlatform('win32');
    process.env = { ...AZURE_ENV };
    await expect(
      signer({ path: 'app.exe', hash: 'sha1' })
    ).resolves.toBeUndefined();
    expect(spawn).not.toHaveBeenCalled();
  });

  it('signs on the sha256 pass', async () => {
    setPlatform('win32');
    process.env = { ...AZURE_ENV };
    await signer({ path: 'app.exe', hash: 'sha256' });
    expect(spawn).toHaveBeenCalledWith(
      AZURE_ENV.SIGNTOOL_PATH,
      expect.arrayContaining(['/dlib']),
      expect.anything()
    );
  });

  it('fails in CI on Windows when Azure env is incomplete', async () => {
    setPlatform('win32');
    process.env = {
      CI: 'true',
      CSC_LINK: 'C:\\repo\\certificate.pfx',
      CSC_KEY_PASSWORD: 's3cret',
    };
    await expect(signer({ path: 'app.exe' })).rejects.toThrow(
      /SIGNTOOL_PATH.*AZURE_CODE_SIGNING_DLIB.*AZURE_METADATA_JSON/s
    );
    expect(spawn).not.toHaveBeenCalled();
  });
});
