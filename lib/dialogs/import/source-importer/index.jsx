import React from 'react';
import PropTypes from 'prop-types';

import PanelTitle from '../../../components/panel-title';
import ImporterDropzone from '../dropzone';
import ImportExecutor from './executor';

class SourceImporter extends React.Component {
  static propTypes = {
    source: PropTypes.shape({
      acceptedTypes: PropTypes.string,
      instructions: PropTypes.string,
      multiple: PropTypes.bool,
      optionsHint: PropTypes.string,
    }),
  };

  state = {
    acceptedFiles: undefined,
  };

  render() {
    const {
      acceptedTypes,
      instructions,
      multiple = false,
      optionsHint,
    } = this.props.source;
    const { acceptedFiles } = this.state;

    return (
      <div className="source-importer">
        <PanelTitle headingLevel="3">Import file{multiple && 's'}</PanelTitle>
        <ImporterDropzone
          acceptedTypes={acceptedTypes}
          multiple={multiple}
          onAccept={files => this.setState({ acceptedFiles: files })}
        />
        {acceptedFiles ? (
          <ImportExecutor
            hint={optionsHint}
            startImport={() => console.log(acceptedFiles)}
          />
        ) : (
          <p className="theme-color-fg-dim">{instructions}</p>
        )}
      </div>
    );
  }
}

export default SourceImporter;
