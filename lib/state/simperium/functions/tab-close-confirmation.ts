import { getUnconfirmedChanges } from './unconfirmed-changes';

import type * as S from '../../';

export const confirmBeforeClosingTab = (store: S.Store) => {
  window.addEventListener('beforeunload', (event) => {
    const changes = getUnconfirmedChanges(store.getState());
    if (changes.notes.length === 0) {
      return undefined;
    }

    event.preventDefault();

    // this message is hidden by most browsers
    // and replaced by a generic message
    const message =
      'There are unsynchronized changes - do you want to logout and lose those changes?';
    event.returnValue = message;
    return message;
  });
};
