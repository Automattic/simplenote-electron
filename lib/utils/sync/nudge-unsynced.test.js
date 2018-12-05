import nudgeUnsynced from './nudge-unsynced';

describe('sync:nudgeUnsynced', () => {
  let mockArg;

  beforeEach(() => {
    mockArg = {
      noteBucket: {
        getVersion: (_, callback) => {
          callback(undefined, 0); // no error, v === 0
        },
      },
      notes: [{}],
      client: {
        client: { connect: jest.fn() },
        isAuthorized: jest.fn().mockReturnValue(true),
      },
    };
  });

  it('should reconnect the client when an unsynced note exists', () => {
    return nudgeUnsynced(mockArg).then(() => {
      expect(mockArg.client.client.connect).toHaveBeenCalled();
    });
  });

  it('should not reconnect the client if not authorized', () => {
    mockArg.client.isAuthorized.mockReturnValue(false);
    return nudgeUnsynced(mockArg).then(() => {
      expect(mockArg.client.client.connect).not.toHaveBeenCalled();
    });
  });
});
