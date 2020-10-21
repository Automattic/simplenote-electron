import React, { Component, createRef } from 'react';
import { connect } from 'react-redux';
import NoteContentEditor from '../note-content-editor';
import SimplenoteCompactLogo from '../icons/simplenote-compact';

import * as S from '../state';
import * as T from '../types';

type OwnProps = {
  storeFocusEditor: Function;
  storeHasFocus: Function;
};

type StateProps = {
  isDialogOpen: boolean;
  keyboardShortcuts: boolean;
  openedNote: T.EntityId | null;
};

type Props = OwnProps & StateProps;

export class NoteDetail extends Component<Props> {
  static displayName = 'NoteDetail';

  componentDidMount() {
    this.props.storeFocusEditor(this.focusEditor);
    this.props.storeHasFocus(this.hasFocus);
  }

  focusEditor = () => this.focusContentEditor && this.focusContentEditor();

  hasFocus = () => this.editorHasFocus?.();

  storeEditorHasFocus = (f) => (this.editorHasFocus = f);

  storeFocusContentEditor = (f) => (this.focusContentEditor = f);

  render() {
    const { openedNote } = this.props;
    return (
      <div className="note-detail-wrapper">
        {!openedNote ? (
          <div className="note-detail-placeholder">
            <SimplenoteCompactLogo />
          </div>
        ) : (
          <NoteContentEditor
            key={openedNote}
            storeFocusEditor={this.storeFocusContentEditor}
            storeHasFocus={this.storeEditorHasFocus}
          />
        )}
      </div>
    );
  }
}

const mapStateToProps: S.MapState<StateProps> = (state) => ({
  isDialogOpen: state.ui.dialogs.length > 0,
  keyboardShortcuts: state.settings.keyboardShortcuts,
  openedNote: state.ui.openedNote,
});

export default connect(mapStateToProps)(NoteDetail);
