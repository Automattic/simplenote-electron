import type { Client } from 'simperium';

import * as S from '../../';

export const start = (client: Client, { dispatch, getState }: S.Store) => {
  let lastMessageAt = -Infinity;

  client.on('message', () => {
    lastMessageAt = Date.now();
    if (getState().simperium.connectionStatus !== 'green') {
      dispatch({ type: 'CHANGE_CONNECTION_STATUS', status: 'green' });
    }
  });

  setInterval(() => {
    const timeSinceLastMessage = Date.now() - lastMessageAt;
    const currentStatus = getState().simperium.connectionStatus;
    if (timeSinceLastMessage > 8000 && currentStatus === 'green') {
      dispatch({ type: 'CHANGE_CONNECTION_STATUS', status: 'red' });
    }
  }, 1000);

  window.addEventListener('online', () => {
    if (getState().simperium.connectionStatus === 'offline') {
      dispatch({ type: 'CHANGE_CONNECTION_STATUS', status: 'red' });
    }
  });

  window.addEventListener('offline', () => {
    dispatch({ type: 'CHANGE_CONNECTION_STATUS', status: 'offline' });
  });

  client.on('disconnect', () => {
    dispatch({
      type: 'CHANGE_CONNECTION_STATUS',
      status: navigator.onLine ? 'red' : 'offline',
    });
  });
};
