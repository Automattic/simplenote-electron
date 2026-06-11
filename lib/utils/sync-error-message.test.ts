import { getSyncErrorMessage } from './sync-error-message';

describe('getSyncErrorMessage', () => {
  it('returns a specific message for HTTP 413', () => {
    expect(getSyncErrorMessage(413)).toBe(
      'This note could not be synced because it is too large. Try removing content or splitting it into smaller notes.'
    );
  });

  it('returns a generic message for other error codes', () => {
    expect(getSyncErrorMessage(500)).toBe(
      'This note could not be synced (error 500).'
    );
  });
});
