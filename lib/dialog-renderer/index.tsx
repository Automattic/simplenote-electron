import React, { Component, Fragment } from 'react';
import { connect } from 'react-redux';
import Modal from 'react-modal';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { get } from 'lodash';

import AboutDialog from '../dialogs/about';
import ImportDialog from '../dialogs/import';
import SettingsDialog from '../dialogs/settings';
import ShareDialog from '../dialogs/share';

import * as S from '../state';
import * as T from '../types';

type StateProps = {
  dialogs: T.DialogType[];
};

type DispatchProps = {
  closeDialog: () => any;
};

type Props = StateProps & DispatchProps;

export class DialogRenderer extends Component<Props> {
  static displayName = 'DialogRenderer';

  static propTypes = {
    appProps: PropTypes.object.isRequired,
    buckets: PropTypes.object,
    themeClass: PropTypes.string,
    isElectron: PropTypes.bool.isRequired,
    isMacApp: PropTypes.bool.isRequired,
  };

  render() {
    const {
      appProps,
      buckets,
      themeClass,
      isElectron,
      isMacApp,
      closeDialog,
    } = this.props;

    return (
      <Fragment>
        {this.props.dialogs.map(dialog =>
          'ABOUT' === dialog ? (
            <AboutDialog key="about" themeClass={themeClass} />
          ) : 'IMPORT' === dialog ? (
            <ImportDialog
              key="import"
              buckets={buckets}
              isElectron={isElectron}
              themeClass={themeClass}
            />
          ) : 'SETTINGS' === dialog ? (
            <SettingsDialog
              key="settings"
              buckets={buckets}
              isElectron={isElectron}
              isMacApp={isMacApp}
              themeClass={themeClass}
              {...appProps}
            />
          ) : 'SHARE' === dialog ? (
            <ShareDialog key="share" themeClass={themeClass} />
          ) : null
        )}
      </Fragment>
    );
  }
}

const mapStateToProps: S.MapState<StateProps> = ({ ui: { dialogs } }) => ({
  dialogs,
});

const mapDispatchToProps: S.MapDispatch<DispatchProps> = dispatch => ({
  closeDialog: () => {
    dispatch(closeDialog());
  },
});

export default connect(mapStateToProps, mapDispatchToProps)(DialogRenderer);
