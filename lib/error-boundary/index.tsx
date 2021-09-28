import React, { Component, FunctionComponent } from 'react';
import * as Sentry from '@sentry/react';
import WarningIcon from '../icons/warning';
import { viewExternalUrl } from '../utils/url-utils';
import { isElectron } from '../utils/platform';
import { connect } from 'react-redux';

import * as S from '../state';
import * as T from '../types';
import * as selectors from '../state/selectors';

const helpEmail = 'mailto:support@simplenote.com?subject=Simplenote%20Support';

type ErrorMessageProps = {
  allowAnalytics?: boolean;
};

const ErrorMessage: FunctionComponent<ErrorMessageProps> = ({
  allowAnalytics,
}) => (
  <div className="error-message">
    <div className="error-message__content">
      <div className="error-message__icon">
        <WarningIcon />
      </div>
      <h1 className="error-message__heading">Oops!</h1>
      <p>
        We’re sorry — something went wrong.{' '}
        {allowAnalytics
          ? 'Our team has been notified so that we can work to fix the issue. '
          : ''}
        Please refresh or try again later.{' '}
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

class ErrorBoundary extends Component {
  state = {
    hasError: false,
  };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return <ErrorMessage />;
    }

    return this.props.children;
  }
}

type ErrorBoundaryWithSentryOwnProps = {
  children: React.ReactNode;
  isDevConfig: boolean;
};

type ErrorBoundaryWithSentryStateProps = {
  allowAnalytics: boolean;
  theme: T.Theme;
};

type ErrorBoundaryWithSentryProps = ErrorBoundaryWithSentryOwnProps &
  ErrorBoundaryWithSentryStateProps;

const ErrorBoundaryWithSentry: FunctionComponent<ErrorBoundaryWithSentryProps> = ({
  allowAnalytics,
  children,
  isDevConfig,
  theme,
}) => {
  return (
    <div>
      {isDevConfig || !allowAnalytics ? (
        <ErrorBoundary>{children}</ErrorBoundary>
      ) : (
        <Sentry.ErrorBoundary
          fallback={() => <ErrorMessage allowAnalytics={allowAnalytics} />}
        >
          {children}
        </Sentry.ErrorBoundary>
      )}
    </div>
  );
};

const mapStateToProps: S.MapState<ErrorBoundaryWithSentryStateProps> = (
  state
) => ({
  allowAnalytics: !!state.data.analyticsAllowed,
  theme: selectors.getTheme(state),
});

export const ErrorBoundaryWithAnalytics = connect(mapStateToProps)(
  ErrorBoundaryWithSentry
);

export default ErrorBoundary;
