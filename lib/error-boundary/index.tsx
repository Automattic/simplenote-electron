import React, { Component, FunctionComponent } from 'react';
import * as Sentry from '@sentry/react';
import WarningIcon from '../icons/warning';
import { viewExternalUrl } from '../utils/url-utils';
import { isElectron } from '../utils/platform';

const helpEmail = 'mailto:support@simplenote.com?subject=Simplenote%20Support';

const ErrorMessage: FunctionComponent = () => (
  <div className="error-message">
    <div className="error-message__content">
      <div className="error-message__icon">
        <WarningIcon />
      </div>
      <h1 className="error-message__heading">Oops!</h1>
      <p>
        We’re sorry — something went wrong. Our team has been notified so that
        we can work to fix the issue. Please refresh or try again later.
      </p>
      <div className="error-message__action">
        <button
          className="button button-primary"
          onClick={() => {
            if (isElectron) {
              window.electron?.send('reload');
            } else {
              window.history.go();
            }
          }}
        >
          Refresh application
        </button>
      </div>
      <p className="error-message__footnote">
        If the problem persists, please email us at{' '}
        <a
          href={helpEmail}
          onClick={(e) => {
            e.preventDefault();
            viewExternalUrl(helpEmail);
          }}
        >
          support@simplenote.com
        </a>
        .
      </p>
    </div>
  </div>
);

type ErrorBoundaryProps = {
  isDevConfig: boolean;
};

const ErrorBoundary: FunctionComponent<ErrorBoundaryProps> = ({
  children,
  isDevConfig,
}) => {
  return isDevConfig ? (
    <>{children}</>
  ) : (
    <Sentry.ErrorBoundary fallback={ErrorMessage}>
      {children}
    </Sentry.ErrorBoundary>
  );
};

export default ErrorBoundary;
