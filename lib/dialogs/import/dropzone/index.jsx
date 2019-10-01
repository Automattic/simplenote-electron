import React, { Fragment, useCallback, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';

import GridiconUpload from 'gridicons/dist/cloud-upload';
import GridiconWarn from 'gridicons/dist/notice-outline';
import FileIcon from '../../../icons/file';
import { useDropzone } from 'react-dropzone';

function ImporterDropzone({
  acceptedTypes,
  locked,
  multiple,
  onAccept,
  onReset,
}) {
  const [acceptedFile, setAcceptedFile] = useState();
  const [errorMessage, setErrorMessage] = useState();

  const handleAccept = acceptedFiles => {
    const fileCount = acceptedFiles.length;
    const label = fileCount > 1 ? `${fileCount} files` : acceptedFiles[0].name;
    setAcceptedFile(label);
    onAccept(acceptedFiles);
  };

  const handleReject = rejectedFiles => {
    if (!multiple && rejectedFiles.length > 1) {
      setErrorMessage('Choose a single file');
    } else {
      setErrorMessage('File type is incorrect');
    }
    setAcceptedFile(undefined);
    onReset();
  };

  const onDrop = useCallback((acceptedFiles, rejectedFiles) => {
    if (acceptedFiles.length === 0) {
      handleReject(rejectedFiles);
    } else {
      handleAccept(acceptedFiles);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: acceptedTypes,
    disabled: locked,
    multiple,
    onDrop,
  });

  useEffect(() => {
    if (!errorMessage) {
      return;
    }
    const timer = setTimeout(() => setErrorMessage(undefined), 2500);
    return () => clearTimeout(timer);
  }, [errorMessage]);

  const text = errorMessage ? errorMessage : 'Drag a file, or click to choose';

  const DropzonePlaceholder = () => (
    <Fragment>
      {errorMessage ? <GridiconWarn /> : <GridiconUpload />}
      {isDragActive ? 'Drop files here' : text}
    </Fragment>
  );

  const FileWithIcon = () => (
    <Fragment>
      <FileIcon />
      <span className="importer-dropzone__filename">{acceptedFile}</span>
    </Fragment>
  );

  return (
    <div
      {...getRootProps()}
      className={classnames(
        { 'is-accepted': acceptedFile },
        'importer-dropzone theme-color-border'
      )}
    >
      <input {...getInputProps()} />
      {acceptedFile ? <FileWithIcon /> : <DropzonePlaceholder />}
    </div>
  );
}

ImporterDropzone.propTypes = {
  acceptedTypes: PropTypes.string,
  locked: PropTypes.bool.isRequired,
  multiple: PropTypes.bool,
  onAccept: PropTypes.func.isRequired,
  onReset: PropTypes.func.isRequired,
};

export default ImporterDropzone;
