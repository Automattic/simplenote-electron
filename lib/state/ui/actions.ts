import { TAG_DRAWER_TOGGLE } from '../action-types';

export const toggleTagDrawer = show => ({
  type: TAG_DRAWER_TOGGLE,
  show,
});
