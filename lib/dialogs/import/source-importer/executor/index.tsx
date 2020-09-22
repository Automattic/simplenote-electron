import React, { Component } from 'react';
import { connect } from 'react-redux';
import { throttle } from 'lodash';

import actions from '../../../../state/actions';

import PanelTitle from '../../../../components/panel-title';
import TransitionFadeInOut from '../../../../components/transition-fade-in-out';
import ImportProgress from '../progress';

import type * as S from '../../../../state/';
import type * as T from '../../../../types';

type ImporterSource = 'evernote' | 'plaintext' | 'simplenote';

const getImporter = (importer: ImporterSource): Promise<object> => {
  switch (importer) {
    case 'evernote':
      return import(
        /* webpackChunkName: 'utils-import-evernote' */ '../../../../utils/import/evernote'
      );
    case 'plaintext':
      return import(
        /* webpackChunkName: 'utils-import-text-files' */ '../../../../utils/import/text-files'
      );

    case 'simplenote':
      return import(
        /* webpackChunkName: 'utils-import-simplenote' */ '../../../../utils/import/simplenote'
      );
  }
};

type OwnProps = {
  endValue: number;
  files: string[];
  locked: boolean;
  onClose: Function;
  onStart: Function;
  source: {
    optionsHint: string;
    slug: ImporterSource;
  };
};

type DispatchProps = {
  importNote: (note: T.Note) => any;
  recordEvent: (eventName: string, eventProperties: T.JSONSerializable) => any;
};

type Props = OwnProps & DispatchProps;

class ImportExecutor extends Component<Props> {
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

    return getImporter(sourceSlug).then(({ default: Importer }) => {
      const thisImporter = new Importer(this.props.importNote, {
        isMarkdown: this.state.setMarkdown,
      });
      const updateProgress = throttle((arg) => {
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
            this.props.recordEvent('importer_import_completed', {
              source: sourceSlug,
              note_count: arg,
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
            break;
        }
      });

      return thisImporter;
    });
  };

  startImport = () => {
    this.setState({ shouldShowProgress: true });
    this.props.onStart();

    this.initImporter().then((importer) => {
      importer.importNotes(this.props.files);
    });
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
          <PanelTitle headingLevel={3}>Options</PanelTitle>
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

const mapDispatchToProps: S.MapDispatch<DispatchProps> = {
  importNote: actions.data.importNote,
  recordEvent: actions.analytics.recordEvent,
};

export default connect(null, mapDispatchToProps)(ImportExecutor);
