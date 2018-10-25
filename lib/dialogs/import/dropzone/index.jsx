import React from 'react';
import PropTypes from 'prop-types';

import Dropzone from 'react-dropzone';
import UploadIcon from '../../../icons/upload';

class ImporterDropzone extends React.Component {
  static propTypes = {
    acceptedTypes: PropTypes.string,
    onAccept: PropTypes.func.isRequired,
  };

  state = {
    errorMessage: undefined,
  };

  onDropAccepted = files => {
    // `path` is only available in Electron
    this.props.onAccept(files[0].path);
  };

  onDropRejected = () => {
    this.setState({ errorMessage: 'File type is incorrect' });
    window.setTimeout(() => {
      this.setState({ errorMessage: undefined });
    }, 3000);
  };

  render() {
    const { acceptedTypes } = this.props;
    const { errorMessage } = this.state;

    return (
      <Dropzone
        accept={acceptedTypes}
        activeClassName="is-active"
        className="importer-dropzone theme-color-border"
        disablePreview
        onDropAccepted={this.onDropAccepted}
        onDropRejected={this.onDropRejected}
        multiple={false}
      >
        <UploadIcon />
        {errorMessage ? errorMessage : 'Drag a file, or click to choose'}
      </Dropzone>
    );
  }
}

export default ImporterDropzone;
