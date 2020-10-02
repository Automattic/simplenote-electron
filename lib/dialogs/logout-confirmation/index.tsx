import React from 'react';

import UnsynchronizedConfirmation from '../unsynchronized';

const LogoutConfirmation = () => (
  <UnsynchronizedConfirmation
    action="REALLY_LOGOUT"
    actionDescription="Logging out will delete any unsynchronized notes."
    actionName="Log out"
    actionSafeName="Safely log out"
  />
);

export default LogoutConfirmation;
