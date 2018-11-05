import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';

import Dropzone from 'react-dropzone';
import GridiconUpload from 'gridicons/dist/cloud-upload';
import GridiconWarn from 'gridicons/dist/notice-outline';
import FileIcon from '../../../icons/file';

class ImporterDropzone extends React.Component {
  static propTypes = {
    acceptedTypes: PropTypes.string,
    locked: PropTypes.bool.isRequired,
    multiple: PropTypes.bool,
    onAccept: PropTypes.func.isRequired,
    onReset: PropTypes.func.isRequired,
  };

  state = {
    acceptedFile: undefined,
    errorMessage: undefined,
  };

  onDrop = (acceptedFiles, rejectedFiles) => {
    if (acceptedFiles.length === 0) {
      this.handleReject(rejectedFiles);
    } else {
      this.handleAccept(acceptedFiles);
    }
  };

  handleAccept = acceptedFiles => {
    const fileCount = acceptedFiles.length;
    const label = fileCount > 1 ? `${fileCount} files` : acceptedFiles[0].name;

    this.setState({ acceptedFile: label });
    this.props.onAccept(acceptedFiles);
  };

  handleReject = rejectedFiles => {
    let errorMessage = 'File type is incorrect';

    if (!this.props.multiple && rejectedFiles.length > 1) {
      errorMessage = 'Choose a single file';
    }
    this.setState({
      acceptedFile: undefined,
      errorMessage: errorMessage,
    });
    this.errorTimer = window.setTimeout(() => {
      this.setState({ errorMessage: undefined });
    }, 2500);

    this.props.onReset();
  };

  componentWillUnmount() {
    window.clearTimeout(this.errorTimer);
  }

  render() {
    const { acceptedTypes, locked, multiple = false } = this.props;
    const { acceptedFile, errorMessage } = this.state;

    const text = errorMessage
      ? errorMessage
      : 'Drag a file, or click to choose';

    const DropzonePlaceholder = () => (
      <Fragment>
        {errorMessage ? <GridiconWarn /> : <GridiconUpload />}
        {text}
      </Fragment>
    );

    const FileWithIcon = () => (
      <Fragment>
        <FileIcon />
        <span className="importer-dropzone__filename">{acceptedFile}</span>
      </Fragment>
    );

    return (
      <Dropzone
        accept={acceptedTypes}
        activeClassName="is-active"
        className={classnames(
          { 'is-accepted': acceptedFile },
          'importer-dropzone theme-color-border'
        )}
        disabled={locked}
        disablePreview
        multiple={multiple}
        onDrop={this.onDrop}
      >
        {acceptedFile ? <FileWithIcon /> : <DropzonePlaceholder />}
      </Dropzone>
    );
  }
}

export default ImporterDropzone;
