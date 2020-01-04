import client from '../../client';

export const noteBucket = () => client().bucket('note');
export const preferencesBucket = () => client().bucket('preferences');
export const tagBucket = () => client().bucket('tag');

export default {
  noteBucket,
  preferencesBucket,
  tagBucket,
};
