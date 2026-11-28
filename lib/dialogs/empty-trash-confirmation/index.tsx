import React, { FunctionComponent } from 'react';
import { connect } from 'react-redux';

import actions from '../../state/actions';
import Dialog from '../../dialog';

import type * as S from '../../state';

type DispatchProps = {
  closeDialog: () => any;
  emptyTrash: () => any;
};

type Props = DispatchProps;

export const EmptyTrashConfirmation: FunctionComponent<Props> = ({
  closeDialog,
  emptyTrash,
}) => (
  <Dialog
    className="empty-trash-confirmation"
    onDone={closeDialog}
    title="Empty Trash"
  >
    <p className="empty-trash-confirmation__message">
      Do you want to empty the trash? All notes in the trash will be permanently
      deleted. This action cannot be undone.
    </p>
    <div className="empty-trash-confirmation__buttons">
      <button
        autoFocus
        type="button"
        className="button button-borderless button-compact"
        onClick={closeDialog}
      >
        Cancel
      </button>
      <button
        type="button"
        className="button button-compact button-danger"
        onClick={emptyTrash}
      >
        Empty Trash
      </button>
    </div>
  </Dialog>
);

const mapDispatchToProps: S.MapDispatch<DispatchProps> = {
  closeDialog: actions.ui.closeDialog,
  emptyTrash: actions.ui.emptyTrash,
};

export default connect(null, mapDispatchToProps)(EmptyTrashConfirmation);
