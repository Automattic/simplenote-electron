import React, { Component } from 'react';
import SimplenoteLogo from '../../icons/simplenote';
import CrossIcon from '../../icons/cross';
import TopRightArrowIcon from '../../icons/arrow-top-right';
import Dialog from '../../dialog';
// const i18n = require('../../i18n');
const i18n = require('i18n-calypso');

const appVersion = config.version; // eslint-disable-line no-undef

type OwnProps = {
  closeDialog: () => any;
};

type Props = OwnProps;

export class AboutDialog extends Component<Props> {
  render() {
    const { closeDialog } = this.props;
    const thisYear = new Date().getFullYear();

    return (
      <div className="about">
        <Dialog
          hideTitleBar
          onDone={closeDialog}
          title={i18n.translate('About')}
        >
          <div className="about-top">
            <SimplenoteLogo />

            <h1>Simplenote</h1>
            <small>
              {i18n.translate('Version')} {appVersion}
            </small>
          </div>

          <ul className="about-links">
            <li>
              <a
                target="_blank"
                href="https://simplenote.com/blog/"
                rel="noopener noreferrer"
              >
                <span className="about-links-title">
                  {i18n.translate('Blog')}
                </span>
                <br />
                simplenote.com/blog/
              </a>
              <TopRightArrowIcon />
            </li>
            <li>
              <a
                target="_blank"
                href="https://twitter.com/simplenoteapp"
                rel="noopener noreferrer"
              >
                <span className="about-links-title">Twitter</span>
                <br />
                @simplenoteapp
              </a>
              <TopRightArrowIcon />
            </li>
            <li>
              <a
                target="_blank"
                href="https://github.com/Automattic/simplenote-electron"
                rel="noopener noreferrer"
              >
                <span className="about-links-title">
                  {i18n.translate('Contribute')}
                </span>
                <br />
                GitHub.com
              </a>
              <TopRightArrowIcon />
            </li>
            <li>
              <a
                target="_blank"
                href="https://automattic.com/work-with-us/"
                rel="noopener noreferrer"
              >
                {i18n.translate('Made with love by the folks at Automattic.')}
                <br />
                {i18n.translate("Are you a developer? We're hiring.")}
              </a>
              <TopRightArrowIcon />
            </li>
          </ul>

          <div className="about-bottom">
            <p>
              <a
                target="_blank"
                href="https://simplenote.com/privacy/"
                rel="noopener noreferrer"
              >
                {i18n.translate('Privacy Policy')}
              </a>{' '}
              &nbsp;&bull;&nbsp;{' '}
              <a
                target="_blank"
                href="https://simplenote.com/terms/"
                rel="noopener noreferrer"
              >
                {i18n.translate('Terms of Service')}
              </a>
            </p>
            <p>
              <a
                target="_blank"
                href="https://automattic.com/privacy/#california-consumer-privacy-act-ccpa"
                rel="noopener noreferrer"
              >
                {i18n.translate('Privacy Notice for California Users')}
              </a>
            </p>
            <p>
              <a
                target="_blank"
                href="https://automattic.com/"
                rel="noopener noreferrer"
              >
                &copy; {thisYear} Automattic, Inc.
              </a>
            </p>
          </div>

          <button
            type="button"
            aria-label={i18n.translate('Close dialog')}
            className="about-done button button-borderless"
            onClick={closeDialog}
          >
            <CrossIcon />
          </button>
        </Dialog>
      </div>
    );
  }
}

export default AboutDialog;
