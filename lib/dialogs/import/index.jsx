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
    importInProgress: false,
    selectedSource: undefined,
  };

  render() {
    window.setTimeout(() => {
      this.setState({ importInProgress: true });
    }, 6000);
    const { requestClose } = this.props;
    const { title } = this.props.dialog;
    const { importInProgress, selectedSource } = this.state;

    const selectSource = source => this.setState({ selectedSource: source });
    const sourceIsSelected = Boolean(selectedSource);

    return (
      <Dialog
        className="import"
        closeBtnLabel="Cancel"
        onDone={importInProgress ? undefined : requestClose}
        title={title}
      >
        <div className="import__inner">
          {!sourceIsSelected && (
            <ImportSourceSelector
              locked={importInProgress}
              selectSource={selectSource}
            />
          )}
          <TransitionFadeInOut
            wrapperClassName="import__source-importer-wrapper"
            shouldMount={sourceIsSelected}
          >
            <SourceImporter locked={importInProgress} source={selectedSource} />
          </TransitionFadeInOut>
        </div>
      </Dialog>
    );
  }
}

export default ImportDialog;
