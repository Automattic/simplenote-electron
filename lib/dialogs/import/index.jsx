import React from 'react';
import PropTypes from 'prop-types';

import Dialog from '../../dialog';
import ImportSourceSelector from './source-selector';
import SourceImporter from './source-importer';

class ImportDialog extends React.Component {
  static propTypes = {
    requestClose: PropTypes.func.isRequired,
    dialog: PropTypes.shape({
      title: PropTypes.string.isRequired,
    }),
  };

  state = {
    selectedSource: undefined,
  };

  render() {
    const { requestClose } = this.props;
    const { title } = this.props.dialog;
    const { selectedSource } = this.state;

    const selectSource = source => this.setState({ selectedSource: source });

    return (
      <Dialog className="import" onDone={requestClose} title={title}>
        <div className="import__inner">
          {!selectedSource && (
            <ImportSourceSelector selectSource={selectSource} />
          )}
          {selectedSource && <SourceImporter source={selectedSource} />}
        </div>
      </Dialog>
    );
  }
}

export default ImportDialog;
