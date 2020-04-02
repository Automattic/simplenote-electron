import React, { Component, Fragment } from 'react';
import { connect } from 'react-redux';
import Modal from 'react-modal';
import classNames from 'classnames';

import AboutDialog from '../dialogs/about';
import ImportDialog from '../dialogs/import';
import KeybindingsDialog from '../dialogs/keybindings';
import SettingsDialog from '../dialogs/settings';
import ShareDialog from '../dialogs/share';
import { closeDialog } from '../state/ui/actions';

import * as S from '../state';
import * as T from '../types';

type OwnProps = {
  appProps: object;
  buckets: Record<'noteBucket' | 'tagBucket' | 'preferencesBucket', T.Bucket>;
  themeClass: string;
  isElectron: boolean;
  isMacApp: boolean;
};

type StateProps = {
  dialogs: T.DialogType[];
};

type DispatchProps = {
  closeDialog: () => any;
};

type Props = OwnProps & StateProps & DispatchProps;

export class DialogRenderer extends Component<Props> {
  static displayName = 'DialogRenderer';

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
        {this.props.dialogs.map(dialog => (
          <Modal
            key={dialog}
            className="dialog-renderer__content"
            contentLabel={dialog}
            isOpen
            onRequestClose={closeDialog}
            overlayClassName="dialog-renderer__overlay"
            portalClassName={classNames('dialog-renderer__portal', themeClass)}
          >
            {'ABOUT' === dialog ? (
              <AboutDialog key="about" />
            ) : 'IMPORT' === dialog ? (
              <ImportDialog
                key="import"
                buckets={buckets}
                isElectron={isElectron}
              />
            ) : 'KEYBINDINGS' === dialog ? (
              <KeybindingsDialog
                key="keybindings"
                isElectron={isElectron}
                isMacApp={isMacApp}
              />
            ) : 'SETTINGS' === dialog ? (
              <SettingsDialog
                key="settings"
                buckets={buckets}
                isElectron={isElectron}
                isMacApp={isMacApp}
                {...appProps}
              />
            ) : 'SHARE' === dialog ? (
              <ShareDialog key="share" />
            ) : null}
          </Modal>
        ))}
      </Fragment>
    );
  }
}

const mapStateToProps: S.MapState<StateProps> = ({ ui: { dialogs } }) => ({
  dialogs,
});

const mapDispatchToProps: S.MapDispatch<DispatchProps> = {
  closeDialog,
};

export default connect(mapStateToProps, mapDispatchToProps)(DialogRenderer);
