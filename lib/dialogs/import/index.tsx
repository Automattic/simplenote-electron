import React, { Component, Suspense } from 'react';
import { connect } from 'react-redux';

import Dialog from '../../dialog';
import ImportSourceSelector from './source-selector';
import TransitionFadeInOut from '../../components/transition-fade-in-out';
import TransitionDelayEnter from '../../components/transition-delay-enter';
import Spinner from '../../components/spinner';
import { closeDialog } from '../../state/ui/actions';

import * as S from '../../state';

const SourceImporter = React.lazy(() =>
  import(/* webpackChunkName: 'source-importer' */ './source-importer')
);

type DispatchProps = {
  closeDialog: () => any;
};

type Props = DispatchProps;

class ImportDialog extends Component<Props> {
  state = {
    importStarted: false,
    selectedSource: undefined,
  };

  render() {
    const { closeDialog } = this.props;
    const { importStarted, selectedSource } = this.state;

    const selectSource = (source) => this.setState({ selectedSource: source });
    const sourceIsSelected = Boolean(selectedSource);

    const placeholder = (
      <TransitionDelayEnter delay={1000}>
        <div className="import__placeholder">
          <Spinner size={60} />
        </div>
      </TransitionDelayEnter>
    );

    return (
      <Dialog
        className="import"
        closeBtnLabel={importStarted ? '' : 'Cancel'}
        onDone={importStarted ? undefined : closeDialog}
        title="Import Notes"
      >
        <div className="import__inner">
          {!sourceIsSelected && (
            <ImportSourceSelector
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
                locked={importStarted}
                onClose={closeDialog}
                onStart={() => this.setState({ importStarted: true })}
                source={selectedSource}
              />
            </Suspense>
          </TransitionFadeInOut>
        </div>
      </Dialog>
    );
  }
}

const mapDispatchToProps: S.MapDispatch<DispatchProps> = {
  closeDialog,
};

export default connect(null, mapDispatchToProps)(ImportDialog);
