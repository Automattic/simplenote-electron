import { APPLY_SEARCH, TAG_DRAWER_TOGGLE } from '../action-types';

import * as T from '../../types';

export const applySearch = (
  filter: string,
  notes: T.NoteEntity[],
  tags: T.TagEntity[]
) => ({
  type: APPLY_SEARCH,
  filter,
  notes,
  tags,
});

export const toggleTagDrawer = show => ({
  type: TAG_DRAWER_TOGGLE,
  show,
});
