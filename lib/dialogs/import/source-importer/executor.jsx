import React from 'react';
import PropTypes from 'prop-types';

import PanelTitle from '../../../components/panel-title';
import ImportProgress from './progress';

class ImportExecutor extends React.Component {
  static propTypes = {
    hint: PropTypes.string,
    startImport: PropTypes.func.isRequired,
  };

  state = {
    setMarkdown: false,
  };

  render() {
    const { hint, startImport } = this.props;
    const { setMarkdown } = this.state;

    return (
      <div className="source-importer-executor">
        <section className="source-importer-executor__options">
          <PanelTitle headingLevel="3">Options</PanelTitle>
          <label>
            <input
              type="checkbox"
              checked={setMarkdown}
              className="source-importer-executor__checkbox"
              onChange={() => this.setState({ setMarkdown: !setMarkdown })}
            />
            Enable Markdown on all notes
          </label>
          {hint && <p className="theme-color-fg-dim">{hint}</p>}
        </section>
        <ImportProgress currentValue={3} isDone={false} />
        <div className="source-importer-executor__button">
          <button
            className="button button-primary"
            type="button"
            onClick={() => startImport({ markdown: setMarkdown })}
          >
            Import
          </button>
        </div>
      </div>
    );
  }
}

export default ImportExecutor;
