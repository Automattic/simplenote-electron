import React, { Component } from 'react';
import { connect } from 'react-redux';
import SimplenoteLogo from '../../icons/simplenote';
import CrossIcon from '../../icons/cross';
import TopRightArrowIcon from '../../icons/arrow-top-right';
import Dialog from '../../dialog';

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
        <Dialog hideTitleBar onDone={closeDialog} title="About">
          <div className="about-top">
            <SimplenoteLogo />

            <h1>Simplenote</h1>
            <small>Version {appVersion}</small>
          </div>

          <ul className="about-links">
            <li>
              <a
                target="_blank"
                href="https://simplenote.com/blog/"
                rel="noopener noreferrer"
              >
                <span className="about-links-title">Blog</span>
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
                <span className="about-links-title">Contribute</span>
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
                Made with love by the folks at Automattic.
                <br />
                Are you a developer? We&rsquo;re hiring.
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
                Privacy Policy
              </a>{' '}
              &nbsp;&bull;&nbsp;{' '}
              <a
                target="_blank"
                href="https://simplenote.com/terms/"
                rel="noopener noreferrer"
              >
                Terms of Service
              </a>
            </p>
            <p>
              <a
                target="_blank"
                href="https://automattic.com/privacy/#california-consumer-privacy-act-ccpa"
                rel="noopener noreferrer"
              >
                Privacy Notice for California Users
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
            aria-label="Close dialog"
            className="about-done button"
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
