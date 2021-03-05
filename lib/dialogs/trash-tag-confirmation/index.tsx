import React, { FunctionComponent } from 'react';
import { connect } from 'react-redux';

import actions from '../../state/actions';
import Dialog from '../../dialog';

import type * as S from '../../state';
import type * as T from '../../types';

type OwnProps = {
  tagName: T.TagName;
};

type DispatchProps = {
  closeDialog: () => any;
  trashTag: (tagName: T.TagName) => any;
};

type Props = OwnProps & DispatchProps;

const TrashTagConfirmation: FunctionComponent<Props> = ({
  closeDialog,
  tagName,
  trashTag,
}) => (
  <Dialog
    className="trash-tag-confirmation"
    onDone={closeDialog}
    title="Delete Tag"
  >
    <div className="dialog-inner-content">
      Are you sure you want to delete &quot;
      <span className="tag-name">{tagName}</span>&quot;?
    </div>
    <div className="dialog-buttons">
      <button
        className="button-primary delete-tag"
        onClick={() => trashTag(tagName)}
      >
        Delete Tag
      </button>
    </div>
  </Dialog>
);

const mapDispatchToProps: S.MapDispatch<DispatchProps> = {
  trashTag: (tagName) => ({
    type: 'TRASH_TAG',
    tagName,
  }),
  closeDialog: actions.ui.closeDialog,
};

export default connect(null, mapDispatchToProps)(TrashTagConfirmation);
