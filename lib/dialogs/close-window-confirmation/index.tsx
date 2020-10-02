import React from 'react';

import UnsynchronizedConfirmation from '../unsynchronized';

const CloseWindowConfirmation = () => (
  <UnsynchronizedConfirmation
    action="REALLY_CLOSE_WINDOW"
    actionDescription="Closing the app with unsynchronized notes could cause data loss."
    actionName="Close window"
    actionSafeName="Safely close window"
  />
);

export default CloseWindowConfirmation;
