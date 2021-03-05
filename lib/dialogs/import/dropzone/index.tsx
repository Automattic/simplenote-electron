import React, { Fragment, useCallback, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import { useDropzone } from 'react-dropzone';

import CloudIcon from '../../../icons/cloud';
import FileIcon from '../../../icons/file';
import * as importers from '../importers';
import WarningIcon from '../../../icons/warning';

function ImporterDropzone({
  acceptedTypes,
  locked,
  multiple,
  onAccept,
  onReset,
}) {
  const [acceptedFile, setAcceptedFile] = useState();
  const [errorMessage, setErrorMessage] = useState(new Array<string>());

  const handleAccept = (acceptedFiles) => {
    const filteredFiles = [];
    const seenImporters = new Set();
    for (let i = 0; i < acceptedFiles.length; i++) {
      const file = acceptedFiles[i];

      const importer = importers.forFilename(file.name);
      if (!importer) {
        setErrorMessage([
          ...errorMessage,
          `The file type for "${file.name}" is not recognized`,
        ]);
        continue;
      }

      if (!importer.multiple && seenImporters.has(importer.name)) {
        setErrorMessage((errorMessage) => [
          ...errorMessage,
          `${importer.errorMessage} "${file.name}" will not be imported.`,
        ]);
        continue;
      }

      seenImporters.add(importer.name);
      filteredFiles.push(file);
    }
    setAcceptedFile(filteredFiles);
    onAccept(filteredFiles);
  };

  const handleReject = (rejectedFiles) => {
    if (!multiple && rejectedFiles.length > 1) {
      setErrorMessage([...errorMessage, 'Choose a single file']);
    } else {
      setErrorMessage([...errorMessage, 'File type is incorrect']);
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

  const DropzonePlaceholder = () => (
    <Fragment>
      {errorMessage.length > 0 ? <WarningIcon /> : <CloudIcon />}
      {isDragActive
        ? 'Drop files here'
        : 'Drag and drop to upload files, or click to choose'}
    </Fragment>
  );

  const FilesWithIcon = () => {
    const fileList = acceptedFile.map((file: File) => (
      <li key={file.name}>
        <FileIcon />
        {file.name}
      </li>
    ));

    const errorList = errorMessage.map((error) => (
      <li key={error}>
        <WarningIcon />
        {error}
      </li>
    ));

    return (
      <Fragment>
        <div className="accepted-files-header">
          {acceptedFile.length > 1 ? 'Import Files' : 'Import File'}
        </div>
        <ul className="accepted-files">{fileList}</ul>
        {errorMessage.length > 0 && (
          <ul className="error-message">{errorList}</ul>
        )}
      </Fragment>
    );
  };

  return (
    <div
      {...getRootProps()}
      className={classnames(
        { 'is-accepted': acceptedFile },
        'importer-dropzone theme-color-border'
      )}
    >
      <input {...getInputProps()} />
      {acceptedFile ? <FilesWithIcon /> : <DropzonePlaceholder />}
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
