import React, { Component, Fragment } from 'react';
import { connect } from 'react-redux';
import Dialog from '../../dialog';
import { closeDialog } from '../../state/ui/actions';
import { CmdOrCtrl, isElectron } from '../../utils/platform';

import * as S from '../../state';

type DispatchProps = {
  closeDialog: () => any;
};

const Keys = ({
  keys,
  children,
}: {
  keys: (string | [string, string])[];
  children: React.ReactNode;
}) => (
  <div className="keybindings__key-item">
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
    {'\u2000-\u2000'}
    <div className="keybindings__key-description">{children}</div>
  </div>
);

export class AboutDialog extends Component<DispatchProps> {
  render() {
    const { closeDialog } = this.props;

    return (
      <div className="keybindings">
        <Dialog onDone={closeDialog} title="Keyboard Shortcuts">
          <div className="keybindings__sections">
            <section>
              <h1>View</h1>
              <ul>
                <li>
                  <Keys keys={[CmdOrCtrl, '/']}>Show keyboard shortcuts</Keys>
                </li>
                <li>
                  <Keys keys={[CmdOrCtrl, 'Shift', 'F']}>
                    Toggle focus mode
                  </Keys>
                </li>
                <li>
                  <Keys keys={[CmdOrCtrl, 'Shift', 'S']}>
                    Focus search field
                  </Keys>
                </li>
                <li>
                  <Keys keys={[CmdOrCtrl, 'G']}>
                    Jump to next match in note
                  </Keys>
                </li>
                <li>
                  <Keys keys={[CmdOrCtrl, 'Shift', 'G']}>
                    Jump to previous match in note
                  </Keys>
                </li>
                {isElectron && (
                  <li>
                    <Keys keys={[CmdOrCtrl, '+']}>Increase font size</Keys>
                  </li>
                )}
                {isElectron && (
                  <li>
                    <Keys keys={[CmdOrCtrl, '-']}>Decrease font size</Keys>
                  </li>
                )}
                {isElectron && (
                  <li>
                    <Keys keys={[CmdOrCtrl, '0']}>Reset font size</Keys>
                  </li>
                )}
              </ul>
            </section>

            <section>
              <h1>Navigation</h1>
              <ul>
                {isElectron && (
                  <li>
                    <Keys keys={[CmdOrCtrl, ',']}>Open app preferences</Keys>
                  </li>
                )}
                {isElectron && (
                  <li>
                    <Keys keys={[CmdOrCtrl, 'Shift', 'E']}>
                      Export all notes
                    </Keys>
                  </li>
                )}
                <li>
                  <Keys keys={[CmdOrCtrl, 'Shift', 'U']}>Toggle tag list</Keys>
                </li>
                <li>
                  <Keys keys={[CmdOrCtrl, 'Shift', 'K']}>
                    Open note above current one
                  </Keys>
                </li>
                <li>
                  <Keys keys={[CmdOrCtrl, 'Shift', 'J']}>
                    Open note below current one
                  </Keys>
                </li>
                <li>
                  <Keys keys={[CmdOrCtrl, 'Shift', 'Y']}>
                    Toggle editing content/tags
                  </Keys>
                </li>
                <li>
                  <Keys keys={[CmdOrCtrl, 'Shift', 'L']}>
                    Toggle note list (on narrow screens)
                  </Keys>
                </li>
              </ul>
            </section>

            <section>
              <h1>Note Editing</h1>
              <ul>
                <li>
                  <Keys keys={[CmdOrCtrl, 'Shift', 'I']}>Create new note</Keys>
                </li>
                {isElectron && (
                  <li>
                    <Keys keys={[CmdOrCtrl, 'P']}>Print note</Keys>
                  </li>
                )}
                <li>
                  <Keys keys={[CmdOrCtrl, 'Shift', 'P']}>
                    Toggle Markdown preview
                  </Keys>
                </li>
                <li>
                  <Keys keys={[CmdOrCtrl, 'Shift', 'C']}>
                    Insert checklist item
                  </Keys>
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
