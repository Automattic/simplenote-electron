import randomBytes from 'randombytes';

// Avoid using the npm `crypto-random-string` module,
// since it requires the whole `crypto` module which will bloat
// our bundle with large unused modules `elliptic` and `bn.js`.
const cryptoRandomString = len => {
  if (!Number.isFinite(len)) {
    throw new TypeError('Expected a finite number');
  }

  return randomBytes(Math.ceil(len / 2))
    .toString('hex')
    .slice(0, len);
};

export default cryptoRandomString;
