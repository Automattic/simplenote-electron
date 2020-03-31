import React, { Component, Suspense } from 'react';
import { connect } from 'react-redux';
import Modal from 'react-modal';
import PropTypes from 'prop-types';
import classNames from 'classnames';

import Dialog from '../../dialog';
import ImportSourceSelector from './source-selector';
import TransitionFadeInOut from '../../components/transition-fade-in-out';
import TransitionDelayEnter from '../../components/transition-delay-enter';
import Spinner from '../../components/spinner';
import { closeDialog } from '../../state/ui/actions';

const SourceImporter = React.lazy(() =>
  import(/* webpackChunkName: 'source-importer' */ './source-importer')
);

type DispatchProps = {
  closeDialog: () => any;
};

type Props = DispatchProps;

class ImportDialog extends Component<Props> {
  static propTypes = {
    buckets: PropTypes.object,
    isElectron: PropTypes.bool.isRequired,
    themeClass: PropTypes.string.isRequired,
  };

  state = {
    importStarted: false,
    selectedSource: undefined,
  };

  render() {
    const { buckets, closeDialog, isElectron, themeClass } = this.props;
    const { importStarted, selectedSource } = this.state;

    const selectSource = source => this.setState({ selectedSource: source });
    const sourceIsSelected = Boolean(selectedSource);

    const placeholder = (
      <TransitionDelayEnter delay={1000}>
        <div className="import__placeholder">
          <Spinner size={60} />
        </div>
      </TransitionDelayEnter>
    );

    return (
      <Modal
        className="dialog-renderer__content"
        contentLabel="Import Notes"
        isOpen
        onRequestClose={closeDialog}
        overlayClassName="dialog-renderer__overlay"
        portalClassName={classNames('dialog-renderer__portal', themeClass)}
      >
        <Dialog
          className="import"
          closeBtnLabel={importStarted ? '' : 'Cancel'}
          onDone={importStarted ? undefined : closeDialog}
          title="Import Notes"
        >
          <div className="import__inner">
            {!sourceIsSelected && (
              <ImportSourceSelector
                isElectron={isElectron}
                locked={importStarted}
                selectSource={selectSource}
              />
            )}
            <TransitionFadeInOut
              wrapperClassName="import__source-importer-wrapper"
              shouldMount={sourceIsSelected}
            >
              <Suspense fallback={placeholder}>
                <SourceImporter
                  buckets={buckets}
                  locked={importStarted}
                  onClose={closeDialog}
                  onStart={() => this.setState({ importStarted: true })}
                  source={selectedSource}
                />
              </Suspense>
            </TransitionFadeInOut>
          </div>
        </Dialog>
      </Modal>
    );
  }
}

const mapDispatchToProps: S.MapDispatch<DispatchProps> = dispatch => ({
  closeDialog: () => {
    dispatch(closeDialog());
  },
});

export default connect(null, mapDispatchToProps)(ImportDialog);
