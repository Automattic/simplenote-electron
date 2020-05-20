import type { Client } from 'simperium';

export const getAccountName = (client: Client): Promise<string> =>
  new Promise((resolve) => {
    const usernameMonitor = (message: string) => {
      if (!message.startsWith('0:auth:')) {
        return;
      }

      const [prefix, accountName] = message.split('0:auth:');
      client.off('message', usernameMonitor);
      resolve(accountName);
    };

    client.on('message', usernameMonitor);
  });
