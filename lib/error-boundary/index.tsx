import React, { Component, FunctionComponent } from 'react';
import * as Sentry from '@sentry/react';
import WarningIcon from '../icons/warning';
import { viewExternalUrl } from '../utils/url-utils';

const helpEmail = 'mailto:support@simplenote.com?subject=Simplenote%20Support';

const ErrorMessage: FunctionComponent = () => (
  <div className="error-message">
    <div className="error-message__content">
      <div className="error-message__icon theme-color-fg-dim">
        <WarningIcon />
      </div>
      <h1 className="error-message__heading">An Error Occurred</h1>
      <p>
        Sorry, something appears to have gone wrong. Rest assured that our
        systems have captured the details of the error so that we may work to
        fix the issue. Please reload the application.
      </p>
      <div className="error-message__action">
        <button
          className="button button-primary"
          onClick={() => window.history.go()}
        >
          Reload application
        </button>
      </div>
      <p>
        If you continue to encounter issues, please email us at{' '}
        <a
          href={helpEmail}
          onClick={(e) => {
            e.preventDefault();
            viewExternalUrl(helpEmail);
          }}
        >
          support@simplenote.com
        </a>{' '}
        and one of our Happiness Engineers will be in touch.
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
