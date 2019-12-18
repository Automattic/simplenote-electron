const fs = require('fs');
const path = require('path');
var electron_notarize = require('electron-notarize');

module.exports = async function(params) {
  // Only notarize the app on Mac OS only.
  if (process.platform !== 'darwin') {
    return;
  }

  if (!process.env.CIRCLE_TAG || process.env.CIRCLE_TAG.length === 0) {
    console.log('Not on a tag. Skipping notarization'); // eslint-disable-line no-console
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
    await electron_notarize.notarize({
      appBundleId: appId,
      appPath: appPath,
      appleId: process.env.NOTARIZATION_ID,
      appleIdPassword: process.env.NOTARIZATION_PWD,
      ascProvider: 'AutomatticInc',
    });
  } catch (error) {
    console.error(error); // eslint-disable-line no-console
  }

  console.log(`Done notarizing ${appId}`); // eslint-disable-line no-console
};
