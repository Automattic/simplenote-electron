import React from 'react';
import PropTypes from 'prop-types';

import PanelTitle from '../../../components/panel-title';
import ImporterDropzone from '../dropzone';
import TransitionFadeInOut from '../../../components/transition-fade-in-out';
import ImportExecutor from './executor';

class SourceImporter extends React.Component {
  static propTypes = {
    locked: PropTypes.bool,
    onClose: PropTypes.func.isRequired,
    onStart: PropTypes.func.isRequired,
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
    const { onClose, onStart, locked = false } = this.props;
    const {
      acceptedTypes,
      instructions,
      multiple = false,
      optionsHint,
    } = this.props.source;
    const { acceptedFiles } = this.state;

    const hasAcceptedFile = Boolean(acceptedFiles);

    return (
      <div className="source-importer">
        <PanelTitle headingLevel="3">Import file{multiple && 's'}</PanelTitle>
        <ImporterDropzone
          acceptedTypes={acceptedTypes}
          locked={locked}
          multiple={multiple}
          onAccept={files => this.setState({ acceptedFiles: files })}
          onReset={() => this.setState({ acceptedFiles: undefined })}
        />
        {!hasAcceptedFile && (
          <p className="theme-color-fg-dim">{instructions}</p>
        )}
        <TransitionFadeInOut
          wrapperClassName="source-importer__executor-wrapper"
          shouldMount={hasAcceptedFile}
        >
          <ImportExecutor
            endValue={
              multiple && hasAcceptedFile ? acceptedFiles.length : undefined
            }
            files={acceptedFiles}
            hint={optionsHint}
            locked={locked}
            onClose={onClose}
            onStart={onStart}
          />
        </TransitionFadeInOut>
      </div>
    );
  }
}

export default SourceImporter;
