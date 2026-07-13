const fs = require('fs');
const os = require('os');
const path = require('path');
const dotenv = require('dotenv');

function writeAppStoreConnectApiKey() {
  const key = process.env.APP_STORE_CONNECT_API_KEY_KEY;
  // mkdtemp gives a fresh, owner-only (0700) directory, so the key can't land
  // on a pre-existing path; `wx` then refuses to follow a planted symlink.
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'simplenote-asc-key-'));
  const keyPath = path.join(dir, 'app_store_connect_api_key.p8');

  fs.writeFileSync(keyPath, key.replace(/\\n/g, '\n'), {
    mode: 0o600,
    flag: 'wx',
  });

  return keyPath;
}

module.exports = async function (params) {
  // Only notarize the app on Mac OS only.
  if (process.platform !== 'darwin') {
    return;
  }

  const envPath = path.join(
    process.env.HOME,
    '.a8c-apps/simplenote-electron.env'
  );
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
  } else {
    // eslint-disable-next-line no-console
    console.log(
      `No env file found at ${envPath}. Looking for required env vars individually...`
    );
  }

  let errors = [];
  if (process.env.APP_STORE_CONNECT_API_KEY_KEY_ID === undefined) {
    errors.push(
      'APP_STORE_CONNECT_API_KEY_KEY_ID value not found in env. Please set it.'
    );
  }
  if (process.env.APP_STORE_CONNECT_API_KEY_ISSUER_ID === undefined) {
    errors.push(
      'APP_STORE_CONNECT_API_KEY_ISSUER_ID value not found in env. Please set it.'
    );
  }
  if (process.env.APP_STORE_CONNECT_API_KEY_KEY === undefined) {
    errors.push(
      'APP_STORE_CONNECT_API_KEY_KEY value not found in env. Please set it.'
    );
  }

  if (errors.length > 0) {
    throw new Error(
      `Could not begin signing macOS build. Errors: ${errors.join('\n')}`
    );
  } else {
    console.log('All required env vars found. Moving on...'); // eslint-disable-line no-console
  }

  // Same appId in electron-builder.
  let appId = 'com.automattic.simplenote';

  let appPath = params.appOutDir
    ? path.join(
        params.appOutDir,
        `${params.packager.appInfo.productFilename}.app`
      )
    : params.artifactPaths[0].replace(new RegExp('.blockmap'), '');

  if (!fs.existsSync(appPath)) {
    throw new Error(`Cannot find application at: ${appPath}`);
  }

  console.log(`Notarizing ${appId} found at ${appPath}`); // eslint-disable-line no-console

  const appStoreConnectKeyPath = writeAppStoreConnectApiKey();

  try {
    const electron_notarize = require('@electron/notarize');
    await electron_notarize.notarize({
      appPath: appPath,
      appleApiKey: appStoreConnectKeyPath,
      appleApiKeyId: process.env.APP_STORE_CONNECT_API_KEY_KEY_ID,
      appleApiIssuer: process.env.APP_STORE_CONNECT_API_KEY_ISSUER_ID,
    });
  } catch (error) {
    throw new Error(`Notarization failed with error:\n${error}`);
  } finally {
    fs.rmSync(path.dirname(appStoreConnectKeyPath), {
      recursive: true,
      force: true,
    });
  }

  console.log(`Done notarizing ${appId}`); // eslint-disable-line no-console
};
