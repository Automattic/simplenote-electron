import React, { Component, Fragment } from 'react';
import { connect } from 'react-redux';
import Dialog from '../../dialog';
import { closeDialog } from '../../state/ui/actions';

import * as S from '../../state';

type OwnProps = {
  isElectron: boolean;
  isMacApp: boolean;
};

type DispatchProps = {
  closeDialog: () => any;
};

type Props = OwnProps & DispatchProps;

const Keys = ({ keys }: { keys: (string | [string, string])[] }) => (
  <div className="keybindings__key-list">
    {keys.map((key, i) => (
      <Fragment key={i}>
        {i > 0 && ' + '}
        {'string' === typeof key ? (
          <kbd key={key}>{key}</kbd>
        ) : (
          <>
            <kbd>{key[0]}</kbd> / <kbd>{key[1]}</kbd>
          </>
        )}
      </Fragment>
    ))}
  </div>
);

export class AboutDialog extends Component<Props> {
  render() {
    const { closeDialog, isElectron, isMacApp } = this.props;

    const CmdOrCtrl = isMacApp ? 'Cmd' : 'Ctrl';

    return (
      <div className="keybindings">
        <Dialog onDone={closeDialog} title="Keyboard Shortcuts">
          <div className="keybindings__sections">
            <section>
              <h1>View</h1>
              <ul>
                <li>
                  <Keys keys={[CmdOrCtrl, 'Shift', 'F']} /> - Focus search field
                </li>
                <li>
                  <Keys keys={[CmdOrCtrl, '+']} /> - Increase font size
                </li>
                <li>
                  <Keys keys={[CmdOrCtrl, '-']} /> - Decrease font size
                </li>
                <li>
                  <Keys keys={[CmdOrCtrl, '0']} /> - Reset font size
                </li>
              </ul>
            </section>

            <section>
              <h1>Navigation</h1>
              <ul>
                {isElectron && (
                  <li>
                    <Keys keys={[CmdOrCtrl, ',']} /> - Open app preferences
                  </li>
                )}
                {isElectron && (
                  <li>
                    <Keys keys={[CmdOrCtrl, 'Shift', 'E']} /> - Export all notes
                  </li>
                )}
                <li>
                  <Keys keys={[CmdOrCtrl, 'Shift', 'T']} /> - Toggle tag list
                </li>
                <li>
                  <Keys keys={[CmdOrCtrl, 'Shift', 'K']} /> - Select previous
                  note
                </li>
                <li>
                  <Keys keys={[CmdOrCtrl, 'Shift', 'J']} /> - Select next note
                </li>
                <li>
                  <Keys keys={[CmdOrCtrl, 'Shift', 'N']} /> - Show note list
                </li>
              </ul>
            </section>

            <section>
              <h1>Note Editing</h1>
              <ul>
                <li>
                  <Keys keys={[CmdOrCtrl, 'N']} /> - Create new note
                </li>
                <li>
                  <Keys keys={[CmdOrCtrl, 'P']} /> - Print note
                </li>
                <li>
                  <Keys keys={[CmdOrCtrl, 'T']} /> - Toggle editing content/tags
                </li>
                <li>
                  <Keys keys={[CmdOrCtrl, 'Shift', 'P']} /> - Toggle Markdown
                  preview
                </li>
                <li>
                  <Keys keys={[CmdOrCtrl, 'Shift', 'C']} /> - Insert checklist
                  item
                </li>
              </ul>
            </section>
          </div>
        </Dialog>
      </div>
    );
  }
}

const mapDispatchToProps: S.MapDispatch<DispatchProps> = {
  closeDialog,
};

export default connect(null, mapDispatchToProps)(AboutDialog);
