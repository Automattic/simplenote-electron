import React, { Fragment } from 'react';
import PropTypes from 'prop-types';

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
    const { acceptedTypes, instructions, title } = this.props.source;
    const { acceptedFiles } = this.state;

    const hasAcceptedFile = Boolean(acceptedFiles);

    return (
      <div className="source-importer">
        {!hasAcceptedFile && (
          <p>
            {title}
            <br />
            {instructions}
          </p>
        )}
        <ImporterDropzone
          acceptedTypes={acceptedTypes}
          locked={locked}
          multiple={true}
          onAccept={(files) => this.setState({ acceptedFiles: files })}
          onReset={() => this.setState({ acceptedFiles: undefined })}
        />
        <div className="dialog-buttons">
          <button
            className="button disabled button-primary"
            type="button"
            disabled={true}
          >
            Import
          </button>
        </div>

        <TransitionFadeInOut
          wrapperClassName="source-importer__executor-wrapper"
          shouldMount={hasAcceptedFile}
        >
          <ImportExecutor
            buckets={buckets}
            endValue={hasAcceptedFile ? acceptedFiles.length : undefined}
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
