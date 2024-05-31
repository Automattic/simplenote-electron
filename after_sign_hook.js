const fs = require('fs');
const path = require('path');

module.exports = async function (params) {
  // Only notarize the app on Mac OS only.
  if (process.platform !== 'darwin') {
    return;
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
      // TODO: Move to using API key
      appleId: process.env.NOTARIZATION_ID,
      appleIdPassword: process.env.NOTARIZATION_PWD,
      teamId: '99KV9Z6BKV',
    });
  } catch (error) {
    console.error(error); // eslint-disable-line no-console
  }

  console.log(`Done notarizing ${appId}`); // eslint-disable-line no-console
};
