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
const setupProgressUpdates = require('../lib/setup-progress-updates');

class ManualUpdater extends Updater {
  constructor({ apiUrl, downloadUrl, changelogUrl, options = {} }) {
    super(changelogUrl, options);

    this.apiUrl = apiUrl;
    this.downloadUrl = downloadUrl;
  }

  // For user-initiated checks.
  // Will check and display a progress dialog.
  pingAndShowProgress() {
    setupProgressUpdates({ updater: this, willAutoDownload: false });
    this.ping();
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
        this.emit('error');
        console.log(releaseResp); // eslint-disable-line no-console
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
          this.emit('error');
          console.log(configResp); // eslint-disable-line no-console
          return;
        }

        const configBody = await configResp.text();
        const releaseConfig = yaml.safeLoad(configBody);

        if (semver.lt(app.getVersion(), releaseConfig.version)) {
          // eslint-disable-next-line no-console
          console.log(
            'New update is available, prompting user to update to',
            releaseConfig.version
          );
          this.setVersion(releaseConfig.version);
          this.emit('update-available');
        } else {
          this.emit('update-not-available');
          return;
        }
      }
    } catch (err) {
      this.emit('error');
      console.log(err.message); // eslint-disable-line no-console
    }
  }

  onConfirm() {
    shell.openExternal(this.downloadUrl);
  }
}

module.exports = ManualUpdater;
