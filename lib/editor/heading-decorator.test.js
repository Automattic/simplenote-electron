import headingDecorator from './heading-decorator';

describe('headingDecorator', () => {
  let contentBlock, callback;
  let replaceRangeWithText;
  let decorator;

  beforeEach(() => {
    contentBlock = {
      getText: () => '# note title',
      getKey: () => 'mock-key',
    };
    callback = jest.fn();
    replaceRangeWithText = jest.fn();
    decorator = headingDecorator(replaceRangeWithText);
  });

  it('passes the start and end offsets of the task prefix to the callback', () => {
    decorator.strategy(contentBlock, callback);
    expect(callback).toHaveBeenCalledWith(0, 12, expect.any(Object));

    contentBlock.getText = () => '# updated note title';
    decorator.strategy(contentBlock, callback);
    expect(callback).toHaveBeenCalledWith(0, 20, expect.any(Object));
  });

  it('passes the heading level to the callback', () => {
    decorator.strategy(contentBlock, callback);
    expect(callback.mock.calls[0][2].headingLevel).toBe(1);

    contentBlock.getText = () => '## h2';
    decorator.strategy(contentBlock, callback);
    expect(callback.mock.calls[1][2].headingLevel).toBe(2);

    contentBlock.getText = () => '### h3';
    decorator.strategy(contentBlock, callback);
    expect(callback.mock.calls[2][2].headingLevel).toBe(3);
  });
});
