import React from 'react';
import PropTypes from 'prop-types';
import { throttle } from 'lodash';

import analytics from '../../../../analytics';

import PanelTitle from '../../../../components/panel-title';
import TransitionFadeInOut from '../../../../components/transition-fade-in-out';
import ImportProgress from '../progress';

import EvernoteImporter from '../../../../utils/import/evernote';
import SimplenoteImporter from '../../../../utils/import/simplenote';
import TextFileImporter from '../../../../utils/import/text-files';

const importers = {
  evernote: EvernoteImporter,
  plaintext: TextFileImporter,
  simplenote: SimplenoteImporter,
};

class ImportExecutor extends React.Component {
  static propTypes = {
    buckets: PropTypes.shape({
      noteBucket: PropTypes.object.isRequired,
      tagBucket: PropTypes.object.isRequired,
    }),
    endValue: PropTypes.number,
    files: PropTypes.array,
    locked: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    onStart: PropTypes.func.isRequired,
    source: PropTypes.shape({
      optionsHint: PropTypes.string,
      slug: PropTypes.string.isRequired,
    }),
  };

  state = {
    errorMessage: undefined,
    finalNoteCount: undefined,
    importedNoteCount: 0,
    isDone: false,
    setMarkdown: false,
    shouldShowProgress: false,
  };

  initImporter = () => {
    const { slug: sourceSlug } = this.props.source;
    const Importer = importers[sourceSlug];

    if (!Importer) {
      throw new Error('Unrecognized importer slug "${slug}"');
    }

    const thisImporter = new Importer({
      ...this.props.buckets,
      options: { isMarkdown: this.state.setMarkdown },
    });
    const updateProgress = throttle(arg => {
      this.setState({ importedNoteCount: arg });
    }, 20);

    thisImporter.on('status', (type, arg) => {
      switch (type) {
        case 'progress':
          updateProgress(arg);
          break;
        case 'complete':
          this.setState({
            finalNoteCount: arg,
            isDone: true,
          });
          analytics.tracks.recordEvent('importer_import_completed', {
            source: sourceSlug,
            noteCount: arg,
          });
          break;
        case 'error':
          this.setState({
            errorMessage: arg,
            shouldShowProgress: false,
          });
          window.setTimeout(() => {
            this.setState({ isDone: true });
          }, 200);
          break;
        default:
          console.log(`Unrecognized status event type "${type}"`);
      }
    });
    return thisImporter;
  };

  startImport = () => {
    this.setState({ shouldShowProgress: true });
    this.props.onStart();

    const importer = this.initImporter();
    importer.importNotes(this.props.files);
  };

  render() {
    const { endValue, locked, onClose } = this.props;
    const { optionsHint: hint } = this.props.source;
    const {
      errorMessage,
      finalNoteCount,
      importedNoteCount,
      isDone,
      setMarkdown,
      shouldShowProgress,
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
        <TransitionFadeInOut shouldMount={Boolean(errorMessage)}>
          <div role="alert" className="source-importer-executor__error">
            {errorMessage}
          </div>
        </TransitionFadeInOut>
        <TransitionFadeInOut shouldMount={shouldShowProgress}>
          <ImportProgress
            currentValue={isDone ? finalNoteCount : importedNoteCount}
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
