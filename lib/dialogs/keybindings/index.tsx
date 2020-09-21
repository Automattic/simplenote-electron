import React, { Component, Fragment } from 'react';
import { connect } from 'react-redux';
import i18n from 'i18n-calypso';
import Dialog from '../../dialog';
import { closeDialog } from '../../state/ui/actions';
import { isElectron, isMac } from '../../utils/platform';

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
    const CmdOrCtrl = isMac ? 'Cmd' : 'Ctrl';

    return (
      <div className="keybindings">
        <Dialog
          onDone={closeDialog}
          title={i18n.translate('Keyboard Shortcuts')}
        >
          <div className="keybindings__sections">
            <section>
              <h1>{i18n.translate('View')}</h1>
              <ul>
                <li>
                  <Keys keys={[CmdOrCtrl, '/']}>
                    {i18n.translate('Show keyboard shortcuts')}
                  </Keys>
                </li>
                <li>
                  <Keys keys={[CmdOrCtrl, 'Shift', 'F']}>
                    {i18n.translate('Toggle focus mode')}
                  </Keys>
                </li>
                <li>
                  <Keys keys={[CmdOrCtrl, 'Shift', 'S']}>
                    {i18n.translate('Focus search field')}
                  </Keys>
                </li>
                <li>
                  <Keys keys={[CmdOrCtrl, 'G']}>
                    {i18n.translate('Jump to next match in note')}
                  </Keys>
                </li>
                <li>
                  <Keys keys={[CmdOrCtrl, 'Shift', 'G']}>
                    {i18n.translate('Jump to previous match in note')}
                  </Keys>
                </li>
                {isElectron && (
                  <li>
                    <Keys keys={[CmdOrCtrl, '+']}>
                      {i18n.translate('Increase font size')}
                    </Keys>
                  </li>
                )}
                {isElectron && (
                  <li>
                    <Keys keys={[CmdOrCtrl, '-']}>
                      {i18n.translate('Decrease font size')}
                    </Keys>
                  </li>
                )}
                {isElectron && (
                  <li>
                    <Keys keys={[CmdOrCtrl, '0']}>
                      {i18n.translate('Reset font size')}
                    </Keys>
                  </li>
                )}
              </ul>
            </section>

            <section>
              <h1>{i18n.translate('Navigation')}</h1>
              <ul>
                {isElectron && (
                  <li>
                    <Keys keys={[CmdOrCtrl, ',']}>
                      {i18n.translate('Open app preferences')}
                    </Keys>
                  </li>
                )}
                {isElectron && (
                  <li>
                    <Keys keys={[CmdOrCtrl, 'Shift', 'E']}>
                      {i18n.translate('Export all notes')}
                    </Keys>
                  </li>
                )}
                <li>
                  <Keys keys={[CmdOrCtrl, 'Shift', 'U']}>
                    {i18n.translate('Toggle tag list')}
                  </Keys>
                </li>
                <li>
                  <Keys keys={[CmdOrCtrl, 'Shift', 'K']}>
                    {i18n.translate('Open note above current one')}
                  </Keys>
                </li>
                <li>
                  <Keys keys={[CmdOrCtrl, 'Shift', 'J']}>
                    {i18n.translate('Open note below current one')}
                  </Keys>
                </li>
                <li>
                  <Keys keys={[CmdOrCtrl, 'Shift', 'Y']}>
                    {i18n.translate('Toggle editing content/tags')}
                  </Keys>
                </li>
                <li>
                  <Keys keys={[CmdOrCtrl, 'Shift', 'L']}>
                    {i18n.translate('Toggle note list (on narrow screens)')}
                  </Keys>
                </li>
              </ul>
            </section>

            <section>
              <h1>{i18n.translate('Note Editing')}</h1>
              <ul>
                <li>
                  <Keys keys={[CmdOrCtrl, 'Shift', 'I']}>
                    {i18n.translate('Create new note')}
                  </Keys>
                </li>
                {isElectron && (
                  <li>
                    <Keys keys={[CmdOrCtrl, 'P']}>
                      {i18n.translate('Print note')}
                    </Keys>
                  </li>
                )}
                <li>
                  <Keys keys={[CmdOrCtrl, 'Shift', 'P']}>
                    {i18n.translate('Toggle Markdown preview')}
                  </Keys>
                </li>
                <li>
                  <Keys keys={[CmdOrCtrl, 'Shift', 'C']}>
                    {i18n.translate('Insert checklist item')}
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
