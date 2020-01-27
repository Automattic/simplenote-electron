import React from 'react';
import PropTypes from 'prop-types';

import PanelTitle from '../../../components/panel-title';
import ImporterDropzone from '../dropzone';
import TransitionFadeInOut from '../../../components/transition-fade-in-out';
import ImportExecutor from './executor';

class SourceImporter extends React.Component {
  static propTypes = {
    buckets: PropTypes.object,
    locked: PropTypes.bool,
    onClose: PropTypes.func.isRequired,
    onStart: PropTypes.func.isRequired,
    source: PropTypes.shape({
      acceptedTypes: PropTypes.string,
      instructions: PropTypes.string,
      multiple: PropTypes.bool,
    }),
  };

  state = {
    acceptedFiles: undefined,
  };

  render() {
    const { buckets, onClose, onStart, locked = false, source } = this.props;
    const { acceptedTypes, instructions, multiple = false } = this.props.source;
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
            buckets={buckets}
            endValue={
              multiple && hasAcceptedFile ? acceptedFiles.length : undefined
            }
            files={acceptedFiles}
            locked={locked}
            onClose={onClose}
            onStart={onStart}
            source={source}
          />
        </TransitionFadeInOut>
      </div>
    );
  }
}

export default SourceImporter;
