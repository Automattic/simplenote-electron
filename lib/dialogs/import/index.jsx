import React from 'react';
import PropTypes from 'prop-types';
import { CSSTransition } from 'react-transition-group';

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
    const sourceIsSelected = Boolean(selectedSource);

    return (
      <Dialog className="import" onDone={requestClose} title={title}>
        <div className="import__inner">
          {!sourceIsSelected && (
            <ImportSourceSelector selectSource={selectSource} />
          )}
          <CSSTransition
            in={sourceIsSelected}
            classNames="import__source-importer"
            mountOnEnter
            timeout={200}
            unmountOnExit
          >
            <div>
              <SourceImporter source={selectedSource} />
            </div>
          </CSSTransition>
        </div>
      </Dialog>
    );
  }
}

export default ImportDialog;
