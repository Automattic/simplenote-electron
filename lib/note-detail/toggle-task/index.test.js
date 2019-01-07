import { toggleInLine, toggleInText, toggleTask } from './';
import { selectors, taskRegex } from './constants';

describe('toggleTask', () => {
  const markdownRootAttr = selectors.markdownRoot.slice(1, -1);
  const taskNodeClassName = selectors.taskNode.slice(1);
  let taskNode;

  beforeEach(() => {
    const doc = new DOMParser().parseFromString(
      `<div ${markdownRootAttr} />`,
      'text/html'
    );
    doc.querySelector(selectors.markdownRoot).innerHTML = `
<li class="${taskNodeClassName}" />
<li class="${taskNodeClassName}" />`;
    taskNode = doc.querySelectorAll(selectors.taskNode)[1]; // second rendered task
  });

  it('should return the note content with the corresponding task item toggled, given a task node', () => {
    const text = `
- [ ] task item
- [ ] task item`;

    return toggleTask({ taskNode, text }).then(newText => {
      expect(newText).toBe(`
- [ ] task item
- [x] task item`);
    });
  });

  it('should return the note content with the corresponding task item toggled, given a task node, even when there are code fences', () => {
    const text = `
~~~
- [ ] task item
~~~

- [ ] task item
- [ ] task item`;

    return toggleTask({ taskNode, text }).then(newText => {
      expect(newText).toBe(`
~~~
- [ ] task item
~~~

- [ ] task item
- [x] task item`);
    });
  });
});

describe('taskRegex', () => {
  // Showdown.js (or whatever Markdown parser) may not be
  // strictly following the spec, or have bugs in any given version.
  // For now, try to follow the parser's implementation, rather than the spec.
  // (GFM Spec: https://github.github.com/gfm/#task-list-items-extension-)

  it('should match all valid kinds of tasklist syntax', () => {
    const validStrings = [
      '- [] task',
      '- [ ] task',
      '-\t[ ] task',
      '-     [ ] task',
      '- [ ]   task',
      '- [ ]task',
      '- [x] task',
      '- [X] task',
    ];
    validStrings.forEach(string => {
      expect(string.match(taskRegex)).not.toBeNull();
    });
  });

  it('should not match invalid tasklist syntax', () => {
    const invalidStrings = [
      '-[] task',
      '-[ ] task',
      '- [f] task',
      '- [ ]',
      '- [   ] task',
    ];
    invalidStrings.forEach(string => {
      expect(string.match(taskRegex)).toBeNull();
    });
  });

  it('should match up to but not including the line ending', () => {
    expect('- []  \n'.match(taskRegex)[0]).toBe('- []  ');
  });

  it('should capture the leading spaces as the first group', () => {
    expect('    - [] task'.replace(taskRegex, '$1')).toBe('    ');
  });
});

describe('toggleInLine', () => {
  it('should toggle an unchecked item', () => {
    expect(toggleInLine('- [] task')).toBe('- [x] task');
    expect(toggleInLine('- [ ] task')).toBe('- [x] task');
  });

  it('should toggle a checked item', () => {
    expect(toggleInLine('- [x] task')).toBe('- [ ] task');
    expect(toggleInLine('- [X] task')).toBe('- [ ] task');
  });
});

describe('toggleInText', () => {
  it('should toggle an indented item', () => {
    const arg = {
      text: '  - [] task',
      index: 0,
    };
    expect(toggleInText(arg)).toBe('  - [x] task');
  });

  it('should not toggle task-like syntax in the middle of a line', () => {
    const arg = {
      text: 'foo - [] task',
      index: 0,
    };
    expect(toggleInText(arg)).toBe(arg.text);
  });

  it('should toggle the correct line when there are multiple lines', () => {
    const arg = {
      text: `
- [] task
- [] task
- [] task`,
      index: 1,
    };
    const correctResult = `
- [] task
- [x] task
- [] task`;
    expect(toggleInText(arg)).toBe(correctResult);
  });
});
