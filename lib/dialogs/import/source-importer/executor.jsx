import React from 'react';
import PropTypes from 'prop-types';
import { throttle } from 'lodash';

import PanelTitle from '../../../components/panel-title';
import TransitionFadeInOut from '../../../components/transition-fade-in-out';
import ImportProgress from './progress';

import TestImporter from './utils/test-importer';

class ImportExecutor extends React.Component {
  static propTypes = {
    endValue: PropTypes.number,
    files: PropTypes.array,
    hint: PropTypes.string,
    locked: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    onStart: PropTypes.func.isRequired,
  };

  state = {
    importedFileCount: 0,
    shouldShowProgress: false,
    isDone: false,
    setMarkdown: false,
  };

  initImporter = () => {
    const testImporter = new TestImporter();
    const updateProgress = throttle(arg => {
      this.setState({ importedFileCount: arg });
    }, 20);

    testImporter.on('status', (type, arg) => {
      switch (type) {
        case 'progress':
          updateProgress(arg);
          break;
        case 'complete':
          this.setState({ isDone: true });
          break;
        case 'error':
          console.log(arg);
          break;
        default:
          console.log(`Unrecognized status event type "${type}"`);
      }
    });
    return testImporter;
  };

  startImport = () => {
    const importer = this.initImporter();
    this.setState({ shouldShowProgress: true });
    this.props.onStart();
    importer.import(this.props.files);
  };

  render() {
    const { endValue, hint, locked, onClose } = this.props;
    const {
      importedFileCount,
      shouldShowProgress,
      isDone,
      setMarkdown,
    } = this.state;

    return (
      <div className="source-importer-executor">
        <section className="source-importer-executor__options">
          <PanelTitle headingLevel="3">Options</PanelTitle>
          <label>
            <input
              type="checkbox"
              checked={setMarkdown}
              className="source-importer-executor__checkbox"
              disabled={locked}
              onChange={() => this.setState({ setMarkdown: !setMarkdown })}
            />
            Enable Markdown on all notes
          </label>
          {hint && <p className="theme-color-fg-dim">{hint}</p>}
        </section>
        <TransitionFadeInOut shouldMount={shouldShowProgress}>
          <ImportProgress
            currentValue={importedFileCount}
            endValue={endValue}
            isDone={isDone}
          />
        </TransitionFadeInOut>
        <div className="source-importer-executor__button">
          {isDone ? (
            <button
              className="button button-primary"
              type="button"
              onClick={onClose}
            >
              Close
            </button>
          ) : (
            <button
              className="button button-primary"
              disabled={locked}
              type="button"
              onClick={this.startImport}
            >
              Import
            </button>
          )}
        </div>
      </div>
    );
  }
}

export default ImportExecutor;
