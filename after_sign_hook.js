const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

module.exports = async function (params) {
  // Only notarize the app on Mac OS only.
  if (process.platform !== 'darwin') {
    return;
  }

  const appStoreConnectKeyPath = path.join(
    process.env.HOME,
    '.configure',
    'simplenote-electron',
    'secrets',
    'app_store_connect_api_key.p8'
  );

  const envPath = path.join(
    process.env.HOME,
    '.a8c-apps/simplenote-electron.env'
  );
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
  } else {
    console.log(
      `No env file found at ${envPath}. Will check for individual env variables...`
    ); // eslint-disable-line no-console
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
    if (fs.existsSync(appStoreConnectKeyPath) == false) {
      errors.push(
        `Key file not found at ${appStoreConnectKeyPath}. Please add it.`
      );
    }

    if (errors.length > 0) {
      throw new Error(
        `Could not begin signing macOS build. Errors: ${errors.join('\n')}`
      );
    }
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
  }

  console.log(`Done notarizing ${appId}`); // eslint-disable-line no-console
};
