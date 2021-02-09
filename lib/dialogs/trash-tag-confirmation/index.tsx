import actions from 'lib/state/actions';
import React, { FunctionComponent } from 'react';
import { connect, useSelector } from 'react-redux';

import { closeDialog } from '../../../lib/state/ui/actions';
import Dialog from '../../dialog';

import type * as S from '../../state';
import type * as T from '../../types';

type DispatchProps = {
  closeDialog: () => any;
  trashTag: (tagName: T.TagName) => any;
};

type Props = DispatchProps;

const TrashTagConfirmation: FunctionComponent<Props> = ({
  closeDialog,
  trashTag,
}) => (
  <Dialog
    className="trash-tag-confirmation"
    onDone={closeDialog}
    title="Delete Tag"
  >
    <div>Are you sure you want to delete this tag?</div>
    <button
      className="button-primary delete-tag"
      onClick={() => {
        //trashTag(tagName);
        console.log('delete');
      }}
    >
      Delete
    </button>
  </Dialog>
);

const mapDispatchToProps: S.MapDispatch<DispatchProps> = {
  trashTag: (tagName) => ({
    type: 'TRASH_TAG',
    tagName,
  }),
  closeDialog: closeDialog,
};

export default connect(null, mapDispatchToProps)(TrashTagConfirmation);
