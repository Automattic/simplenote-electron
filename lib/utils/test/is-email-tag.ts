import isEmailTag from '../is-email-tag';

describe('Utils', () => {
  describe('#isEmailTag', () => {
    expect.extend({
      toBeAnEmail(received) {
        const pass = isEmailTag(received);

        return {
          pass,
          message: () =>
            `${this.utils.matcherHint(
              `${pass ? '.not' : ''}.toBeAnEmail`,
              '',
              '',
              { secondArgument: false }
            )}\n\n` +
            `Expected value to${pass ? ' not' : ''} be an email address\n` +
            `  ${this.utils.printReceived(received)}`,
        };
      },
    });

    it('should not match when no `@` present', () => {
      ['test', 'test.at.test.com', 'tester.com'].forEach((tag) =>
        expect(tag).not.toBeAnEmail()
      );
    });

    it('should not match when no domain is present', () => {
      ['test@', 'test@host', 'test.com@host.', 'test@host.test.'].forEach(
        (tag) => expect(tag).not.toBeAnEmail()
      );
    });

    it('should require at least a two-letter TLD', () => {
      expect('a@b.c').not.toBeAnEmail();
    });

    it('should match valid email addresses', () => {
      ['test@test.com', 'test@test.server.local.com', 'a@b.io'].forEach((tag) =>
        expect(tag).toBeAnEmail()
      );
    });

    it('should match even with multiple `@`s', () => {
      expect('test@inbox@host.domain.com').toBeAnEmail();
    });
  });
});
