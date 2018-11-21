import nudgeUnsynced from './nudge-unsynced';

describe('sync:nudgeUnsynced', () => {
  it('should reconnect the client when an unsynced note exists', () => {
    const mockArg = {
      noteBucket: {
        getVersion: (_, callback) => {
          callback(undefined, 0); // no error, v === 0
        },
      },
      notes: [{}],
      client: {
        client: { connect: jest.fn() },
      },
    };

    nudgeUnsynced(mockArg).then(() => {
      expect(mockArg.client.client.connect).toHaveBeenCalled();
    });
  });
});
