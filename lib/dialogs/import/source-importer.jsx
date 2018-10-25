import React, { Fragment } from 'react';
import PropTypes from 'prop-types';

import PanelTitle from '../../components/panel-title';
import ImporterDropzone from './dropzone';

class SourceImporter extends React.Component {
  static propTypes = {
    source: PropTypes.shape({
      acceptedTypes: PropTypes.string,
      instructions: PropTypes.string,
    }),
  };

  render() {
    const { acceptedTypes, instructions } = this.props.source;

    return (
      <Fragment>
        <PanelTitle headingLevel="3">Import file</PanelTitle>
        <ImporterDropzone
          acceptedTypes={acceptedTypes}
          onAccept={console.log}
        />
        <p className="theme-color-fg-dim">{instructions}</p>
      </Fragment>
    );
  }
}

export default SourceImporter;
