import React from 'react';
import PropTypes from 'prop-types';

import Dropzone from 'react-dropzone';
import UploadIcon from '../../../icons/upload';

class ImporterDropzone extends React.Component {
  static propTypes = {
    acceptedTypes: PropTypes.string,
    multiple: PropTypes.bool,
    onAccept: PropTypes.func.isRequired,
  };

  state = {
    errorMessage: undefined,
  };

  onDrop = (acceptedFiles, rejectedFiles) => {
    if (acceptedFiles.length === 0) {
      this.handleReject(rejectedFiles);
    } else {
      this.props.onAccept(acceptedFiles);
    }
  };

  handleReject = rejectedFiles => {
    let errorMessage = 'File type is incorrect';

    if (!this.props.multiple && rejectedFiles.length > 1) {
      errorMessage = 'Choose a single file';
    }
    this.setState({ errorMessage: errorMessage });
    this.errorTimer = window.setTimeout(() => {
      this.setState({ errorMessage: undefined });
    }, 2500);
  };

  componentWillUnmount() {
    window.clearTimeout(this.errorTimer);
  }

  render() {
    const { acceptedTypes, multiple = false } = this.props;
    const { errorMessage } = this.state;

    return (
      <Dropzone
        accept={acceptedTypes}
        activeClassName="is-active"
        className="importer-dropzone theme-color-border"
        disablePreview
        multiple={multiple}
        onDrop={this.onDrop}
      >
        <UploadIcon />
        {errorMessage ? errorMessage : 'Drag a file, or click to choose'}
      </Dropzone>
    );
  }
}

export default ImporterDropzone;
