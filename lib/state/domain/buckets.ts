import client from '../../client';

export const noteBucket = () => client().bucket('note');
export const tagBucket = () => client().bucket('tag');

export default {
  noteBucket,
  tagBucket,
};
