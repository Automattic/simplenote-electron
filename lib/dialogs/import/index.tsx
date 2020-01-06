import React, { Suspense } from 'react';
import PropTypes from 'prop-types';

import Dialog from '../../dialog';
import ImportSourceSelector from './source-selector';
import TransitionFadeInOut from '../../components/transition-fade-in-out';
import TransitionDelayEnter from '../../components/transition-delay-enter';
import Spinner from '../../components/spinner';

const SourceImporter = React.lazy(() =>
  import(
    /*
    webpackChunkName: 'source-importer',
    webpackPrefetch: true,
  */ './source-importer'
  )
);

class ImportDialog extends React.Component {
  static propTypes = {
    buckets: PropTypes.object,
    dialog: PropTypes.shape({
      title: PropTypes.string.isRequired,
    }),
    isElectron: PropTypes.bool.isRequired,
    requestClose: PropTypes.func.isRequired,
  };

  state = {
    importStarted: false,
    selectedSource: undefined,
  };

  render() {
    const { buckets, isElectron, requestClose } = this.props;
    const { title } = this.props.dialog;
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
      <Dialog
        className="import"
        closeBtnLabel={importStarted ? '' : 'Cancel'}
        onDone={importStarted ? undefined : requestClose}
        title={title}
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
                onClose={requestClose}
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

export default ImportDialog;
