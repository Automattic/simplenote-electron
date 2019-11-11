import React from 'react';
import ReactDOM from 'react-dom';

import BootWarning from '../components/boot-warning';

const HEARTBEAT_DELAY = 1000;
const clientId = uuidv4();
const emptyLock = [null, -Infinity];
const foundElectron = window.process && window.process.type;

if (!foundElectron) {
  if ('lock-acquired' !== grabSessionLock()) {
    ReactDOM.render(<BootWarning />, document.getElementById('root'));
    throw new Error('Simplenote can only be opened in one tab');
  }
  let keepGoing = true;
  loop(() => {
    if (!keepGoing) {
      return false;
    }
    switch (grabSessionLock()) {
      case 'lock-acquired':
        return true; // keep updating the lock and look for other sessions which may have taken it

      default:
        window.alert(
          "We've detected another session running Simplenote, this may cause problems while editing notes. Please refresh the page."
        );
        return false; // stop watching - the user can proceed at their own risk
    }
  });

  window.addEventListener('beforeunload', function() {
    keepGoing = false;
    const [lastClient] =
      JSON.parse(localStorage.getItem('session-lock')) || emptyLock;

    lastClient === clientId && localStorage.removeItem('session-lock');
  });
}

function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = (Math.random() * 16) | 0,
      v = c == 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function loop(f, delay = HEARTBEAT_DELAY) {
  f() && setTimeout(() => loop(f, delay), delay);
}

function grabSessionLock() {
  const [lastClient, lastBeat] =
    JSON.parse(localStorage.getItem('session-lock')) || emptyLock;
  const now = Date.now();
  // easy case - someone else clearly has the lock
  // add some hysteresis to prevent fighting between sessions
  if (lastClient !== clientId && now - lastBeat < HEARTBEAT_DELAY * 5) {
    return 'lock-unavailable';
  }

  // maybe nobody clearly has the lock, let's try and set it
  localStorage.setItem('session-lock', JSON.stringify([clientId, now]));

  // hard case - localStorage is shared mutable state across sessions
  const [thisClient, thisBeat] =
    JSON.parse(localStorage.getItem('session-lock')) || emptyLock;

  // someone else set localStorage between the previous two lines of code
  if (!(thisClient === clientId && thisBeat === now)) {
    return 'lock-unavailable';
  }

  return 'lock-acquired';
}
