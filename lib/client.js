import simperium from './simperium';

let client;

export const initClient = config => {
  client = simperium(config);
  return client;
};

export default () => client;
