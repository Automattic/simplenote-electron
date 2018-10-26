import React from 'react';
import PropTypes from 'prop-types';

import Dialog from '../../dialog';
import ImportSourceSelector from './source-selector';
import TransitionFadeInOut from '../../components/transition-fade-in-out';
import SourceImporter from './source-importer';

class ImportDialog extends React.Component {
  static propTypes = {
    requestClose: PropTypes.func.isRequired,
    dialog: PropTypes.shape({
      title: PropTypes.string.isRequired,
    }),
  };

  state = {
    importStarted: false,
    selectedSource: undefined,
  };

  render() {
    const { requestClose } = this.props;
    const { title } = this.props.dialog;
    const { importStarted, selectedSource } = this.state;

    const selectSource = source => this.setState({ selectedSource: source });
    const sourceIsSelected = Boolean(selectedSource);

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
              locked={importStarted}
              selectSource={selectSource}
            />
          )}
          <TransitionFadeInOut
            wrapperClassName="import__source-importer-wrapper"
            shouldMount={sourceIsSelected}
          >
            <SourceImporter
              locked={importStarted}
              onClose={requestClose}
              onStart={() => this.setState({ importStarted: true })}
              source={selectedSource}
            />
          </TransitionFadeInOut>
        </div>
      </Dialog>
    );
  }
}

export default ImportDialog;
