import {
  diffStringsToOps,
  remapOffsetThroughOps,
  remapOffsetThroughStringDiff,
  remapOffsetsThroughSimperiumContentPatch,
  simperiumContentPatchToOps,
} from './remap-selection-offset';

describe('remapOffsetThroughStringDiff', () => {
  it('shifts the caret forward when text is inserted before it', () => {
    expect(
      remapOffsetThroughStringDiff('hello world', 'NEW hello world', 5)
    ).toBe(9);
  });

  it('shifts the caret backward when text before it is deleted', () => {
    expect(
      remapOffsetThroughStringDiff('NEW hello world', 'hello world', 9)
    ).toBe(5);
  });

  it('leaves the caret unchanged when the edit is after it', () => {
    expect(
      remapOffsetThroughStringDiff('hello world', 'hello NEW world', 5)
    ).toBe(5);
  });
});

describe('simperiumContentPatchToOps', () => {
  it('matches the Monaco patch walker for a leading insertion', () => {
    const patches = ['+NEW%20', '=11'];
    const ops = simperiumContentPatchToOps(patches);

    expect(remapOffsetThroughOps(ops, 5, 'hello world'.length)).toBe(9);
    expect(remapOffsetsThroughSimperiumContentPatch(patches, 5, 5)).toEqual([
      9, 9,
    ]);
  });
});

describe('diffStringsToOps', () => {
  it('describes a leading insertion as insert + equal', () => {
    expect(diffStringsToOps('hello world', 'NEW hello world')).toEqual([
      { kind: 'insert', text: 'NEW ' },
      { kind: 'equal', length: 11 },
    ]);
  });
});
