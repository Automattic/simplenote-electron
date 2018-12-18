import nudgeUnsynced from './nudge-unsynced';
import simperium from 'simperium';

describe('sync:nudgeUnsynced', () => {
  let mockArg, noteBucket;
  const mockUnsyncedNote = (bool = true) => {
    noteBucket.getVersion = (_, callback) => {
      callback(undefined, bool ? 0 : 1); // no error, v === 0
    };
  };

  beforeEach(() => {
    noteBucket = simperium().bucket('note');
    noteBucket.update = jest.fn();
    mockUnsyncedNote(true);

    mockArg = {
      noteBucket,
      notes: [{}],
      client: {
        client: { connect: jest.fn() },
        isAuthorized: jest.fn().mockReturnValue(true),
      },
    };
  });

  it('should update noteBucket when there are no local queued changes and an unsynced note exists', () => {
    return nudgeUnsynced(mockArg).then(() => {
      expect(noteBucket.update).toHaveBeenCalled();
    });
  });

  it('should not update noteBucket when there are local queued changes', () => {
    noteBucket.hasLocalChanges = jest.fn().mockResolvedValue(true);
    return nudgeUnsynced(mockArg).then(() => {
      expect(noteBucket.update).not.toHaveBeenCalled();
    });
  });

  it('should not update noteBucket when there are no unsynced notes', () => {
    mockUnsyncedNote(false);
    return nudgeUnsynced(mockArg).then(() => {
      expect(noteBucket.update).not.toHaveBeenCalled();
    });
  });

  it('should not update noteBucket if not authorized', () => {
    mockArg.client.isAuthorized.mockReturnValue(false);
    return nudgeUnsynced(mockArg).then(() => {
      expect(noteBucket.update).not.toHaveBeenCalled();
    });
  });
});
