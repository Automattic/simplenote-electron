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
  fontSize: number;
  isDialogOpen: boolean;
  keyboardShortcuts: boolean;
  openedNote: T.EntityId | null;
};

type Props = OwnProps & StateProps;

export class NoteDetail extends Component<Props> {
  static displayName = 'NoteDetail';

  noteDetail = createRef<HTMLDivElement>();

  componentDidMount() {
    this.props.storeFocusEditor(this.focusEditor);
    this.props.storeHasFocus(this.hasFocus);
  }

  focusEditor = () => this.focusContentEditor && this.focusContentEditor();

  hasFocus = () => this.editorHasFocus?.();

  storeEditorHasFocus = (f) => (this.editorHasFocus = f);

  storeFocusContentEditor = (f) => (this.focusContentEditor = f);

  render() {
    const { fontSize, openedNote } = this.props;
    const divStyle = { fontSize: `${fontSize}px` };

    return (
      <div className="note-detail-wrapper">
        {!openedNote ? (
          <div className="note-detail-placeholder">
            <SimplenoteCompactLogo />
          </div>
        ) : (
          <div ref={this.noteDetail} className="note-detail">
            <div
              className="note-detail-textarea theme-color-bg theme-color-fg"
              style={divStyle}
            >
              <NoteContentEditor
                storeFocusEditor={this.storeFocusContentEditor}
                storeHasFocus={this.storeEditorHasFocus}
              />
            </div>
          </div>
        )}
      </div>
    );
  }
}

const mapStateToProps: S.MapState<StateProps> = (state) => ({
  fontSize: state.settings.fontSize,
  isDialogOpen: state.ui.dialogs.length > 0,
  keyboardShortcuts: state.settings.keyboardShortcuts,
  openedNote: state.ui.openedNote,
});

export default connect(mapStateToProps)(NoteDetail);
