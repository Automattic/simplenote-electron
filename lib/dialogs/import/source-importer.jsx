import React, { Fragment } from 'react';
import PropTypes from 'prop-types';

import PanelTitle from '../../components/panel-title';
import ImporterDropzone from './dropzone';

class SourceImporter extends React.Component {
  static propTypes = {
    source: PropTypes.shape({
      acceptedTypes: PropTypes.string,
      instructions: PropTypes.string,
      multiple: PropTypes.bool,
    }),
  };

  render() {
    const { acceptedTypes, instructions, multiple = false } = this.props.source;

    return (
      <Fragment>
        <PanelTitle headingLevel="3">Import file{multiple && 's'}</PanelTitle>
        <ImporterDropzone
          acceptedTypes={acceptedTypes}
          multiple={multiple}
          onAccept={console.log}
        />
        <p className="theme-color-fg-dim">{instructions}</p>
      </Fragment>
    );
  }
}

export default SourceImporter;
