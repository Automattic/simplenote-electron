import { validatePassword } from './';

describe('validatePaswword', () => {
  it('should return false for password that is too short', () => {
    expect(validatePassword('foo', 'bar@bang.com')).toBeFalsy();
  });

  it('should return false for password that contains email that would otherwise be valid', () => {
    expect(
      validatePassword(
        'bar@bang.com*xz8-X6uskm8ZjhLXvTTw2m8YxgvgujuWpEqUqqdT!H4',
        'bar@bang.com'
      )
    ).toBeFalsy();
  });

  it('should return false for password that is more than 64 characters', () => {
    expect(
      validatePassword(
        'y93HywVqX6sXbsyZiAAZ*xz8-X6uskm8ZjhLXvTTw2m8YxgvgujuWpEqUqqdT!H41111',
        'bar@bang.com'
      )
    ).toBeFalsy();
  });

  it('should return true for password that is numbers only', () => {
    expect(
      validatePassword(
        '1234567890123456789012345678901234567890123456789012345678901234',
        'bar@bang.com'
      )
    ).toBeTruthy();
  });

  it('should return true for password that contains a space', () => {
    expect(
      validatePassword(
        '12345678901234567890123456789012345678 0123456789012345678901234',
        'bar@bang.com'
      )
    ).toBeTruthy();
  });

  it('should return true for password that is valid', () => {
    expect(
      validatePassword(
        'y93HywVqX6sXbsyZiAAZ*xz8-X6uskm8ZjhLXvTTw2m8YxgvgujuWpEqUqqdT!H4',
        'bar@bang.com'
      )
    ).toBeTruthy();
  });
});
