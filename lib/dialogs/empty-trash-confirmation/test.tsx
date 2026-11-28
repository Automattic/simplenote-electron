import React from 'react';
import { fireEvent, render } from '@testing-library/react';

import { EmptyTrashConfirmation } from './';
import uiReducer from '../../state/ui/reducer';

describe('EmptyTrashConfirmation', () => {
  const renderConfirmation = () => {
    const closeDialog = jest.fn();
    const emptyTrash = jest.fn();

    return {
      closeDialog,
      emptyTrash,
      ...render(
        <EmptyTrashConfirmation
          closeDialog={closeDialog}
          emptyTrash={emptyTrash}
        />
      ),
    };
  };

  it('warns that emptying the trash cannot be undone', () => {
    const { getByText } = renderConfirmation();

    expect(getByText(/This action cannot be undone\./)).toBeTruthy();
  });

  it('focuses Cancel so a stray key press does not empty the trash', () => {
    const { getByRole } = renderConfirmation();

    expect(document.activeElement).toBe(
      getByRole('button', { name: 'Cancel' })
    );
  });

  it('empties the trash when confirmed', () => {
    const { closeDialog, emptyTrash, getByRole } = renderConfirmation();

    fireEvent.click(getByRole('button', { name: 'Empty Trash' }));

    expect(emptyTrash).toHaveBeenCalledTimes(1);
    expect(closeDialog).not.toHaveBeenCalled();
  });

  it.each(['Cancel', 'Close dialog'])(
    'closes without emptying the trash from the %s button',
    (name) => {
      const { closeDialog, emptyTrash, getByRole } = renderConfirmation();

      fireEvent.click(getByRole('button', { name }));

      expect(closeDialog).toHaveBeenCalledTimes(1);
      expect(emptyTrash).not.toHaveBeenCalled();
    }
  );

  it('is dismissed once the trash has been emptied', () => {
    const state = uiReducer(undefined, {
      type: 'SHOW_DIALOG',
      name: 'EMPTY-TRASH-CONFIRMATION',
    });

    expect(state.dialogs).toEqual([{ type: 'EMPTY-TRASH-CONFIRMATION' }]);
    expect(uiReducer(state, { type: 'EMPTY_TRASH' }).dialogs).toEqual([]);
  });
});
