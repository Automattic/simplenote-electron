'use strict';

/**
 * External Dependencies
 */
const { app, shell } = require('electron');
const fetch = require('electron-fetch').default;
const yaml = require('js-yaml');
const semver = require('semver');

/**
 * Internal dependencies
 */
const Updater = require('../lib/Updater');

class ManualUpdater extends Updater {
  constructor({ apiUrl, downloadUrl, changelogUrl, options = {} }) {
    super(changelogUrl, options);

    this.apiUrl = apiUrl;
    this.downloadUrl = downloadUrl;
  }

  async ping() {
    const options = {
      headers: {
        'User-Agent': `Simplenote/${app.getVersion()}`,
      },
    };

    try {
      const releaseResp = await fetch(this.apiUrl, options);

      if (releaseResp.status !== 200) {
        return;
      }

      const releaseBody = await releaseResp.json();

      const releaseAsset = releaseBody.assets.find(
        release => release.name === 'latest.yml'
      );
      if (releaseAsset) {
        const configResp = await fetch(
          releaseAsset.browser_download_url,
          options
        );

        if (configResp.status !== 200) {
          return;
        }

        const configBody = await configResp.text();
        const releaseConfig = yaml.safeLoad(configBody);

        if (semver.lt(app.getVersion(), releaseConfig.version)) {
          console.log(
            'New update is available, prompting user to update to',
            releaseConfig.version
          );
          this.setVersion(releaseConfig.version);
          this.notify();
        } else {
          return;
        }
      }
    } catch (err) {
      console.log(err.message);
    }
  }

  onConfirm() {
    shell.openExternal(this.downloadUrl);
  }
}

module.exports = ManualUpdater;
