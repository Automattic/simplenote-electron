import checkboxDecorator from './checkbox-decorator';

describe('checkboxDecorator', () => {
  let contentBlock, callback;
  let replaceRangeWithText;
  let decorator;

  beforeEach(() => {
    contentBlock = {
      getText: () => '- [ ] task',
      getKey: () => 'mock-key',
    };
    callback = jest.fn();
    replaceRangeWithText = jest.fn();
    decorator = checkboxDecorator(replaceRangeWithText);
  });

  it('should pass the start and end offsets of the task prefix to the callback', () => {
    decorator.strategy(contentBlock, callback);
    expect(callback).toHaveBeenCalledWith(0, 5, expect.any(Object));

    contentBlock.getText = () => '  - [x] task'; // should handle leading whitespace
    decorator.strategy(contentBlock, callback);
    expect(callback).toHaveBeenCalledWith(2, 7, expect.any(Object));
  });

  it('should pass the checked state to the callback', () => {
    decorator.strategy(contentBlock, callback);
    expect(callback.mock.calls[0][2].checked).toBe(false);

    contentBlock.getText = () => '- [x] task';
    decorator.strategy(contentBlock, callback);
    expect(callback.mock.calls[1][2].checked).toBe(true);
  });

  it('should pass an onChange handler to the callback that calls replaceRangeWithText() with the correct selectionState', () => {
    decorator.strategy(contentBlock, callback);
    callback.mock.calls[0][2].onChange();
    const selectionState = replaceRangeWithText.mock.calls[0][0];
    expect(selectionState.anchorOffset).toBe(0);
    expect(selectionState.focusOffset).toBe(5);
  });

  it('should pass an onChange handler to the callback that calls replaceRangeWithText() with the toggled task prefix', () => {
    decorator.strategy(contentBlock, callback);
    callback.mock.calls[0][2].onChange();
    let newText = replaceRangeWithText.mock.calls[0][1];
    expect(newText).toBe('- [x]');

    contentBlock.getText = () => '  - [x] task';
    decorator.strategy(contentBlock, callback);
    callback.mock.calls[1][2].onChange();
    newText = replaceRangeWithText.mock.calls[1][1];
    expect(newText).toBe('- [ ]');
  });
});
