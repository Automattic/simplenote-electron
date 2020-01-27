import getIndexInText from './get-index-in-text';

describe('getIndexInText', () => {
  it('should return the in-text index when there are code fences', () => {
    // The *first* actually rendered task is the *third* occurrence of
    // task-like syntax.
    const noteContent = `
\`\`\`
- [] task
- [] task
\`\`\`
- [] task`;
    const arg = {
      text: noteContent,
      taskNodeIndex: 0,
    };

    return getIndexInText(arg).then(indexInText => {
      expect(indexInText).toBe(2);
    });
  });

  it('should return the in-text index when there are indented code blocks', () => {
    // The *first* actually rendered task is the *second* occurrence of
    // task-like syntax.
    const noteContent = `
    - [] task
- [] task
- [] task`;
    const arg = {
      text: noteContent,
      taskNodeIndex: 0,
    };

    return getIndexInText(arg).then(indexInText => {
      expect(indexInText).toBe(1);
    });
  });
});
