import React, { Fragment } from 'react';
import PropTypes from 'prop-types';

import PanelTitle from '../../components/panel-title';
import ImporterDropzone from './dropzone';

class SourceImporter extends React.Component {
  static propTypes = {
    source: PropTypes.shape({
      acceptedTypes: PropTypes.string,
      electronOnly: PropTypes.bool,
      instructions: PropTypes.string,
      multiple: PropTypes.bool,
    }),
  };

  render() {
    const {
      acceptedTypes,
      electronOnly = false,
      instructions,
      multiple = false,
    } = this.props.source;

    return (
      <Fragment>
        <PanelTitle headingLevel="3">Import file</PanelTitle>
        <ImporterDropzone
          acceptedTypes={acceptedTypes}
          multiple={multiple}
          onAccept={console.log}
          useFilePath={electronOnly}
        />
        <p className="theme-color-fg-dim">{instructions}</p>
      </Fragment>
    );
  }
}

export default SourceImporter;
