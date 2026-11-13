import renderToNode from './render-to-node';

const matches = (node: Element) =>
  Array.from(node.querySelectorAll('.search-match')).map(
    (match) => match.textContent
  );

describe('renderToNode', () => {
  it('renders Markdown without a search query', async () => {
    const node = document.createElement('div');

    await renderToNode(node, '# Title\n\nSome text', '');

    expect(node.querySelector('h1')?.textContent).toBe('Title');
    expect(matches(node)).toEqual([]);
  });

  it('highlights search matches in a detached node', async () => {
    // The note preview renders into a node that isn't in the document yet
    const node = document.createElement('div');

    await renderToNode(node, 'A **pancake** recipe\n\n- pan\n- pot', 'pan');

    expect(matches(node)).toEqual(['pan', 'pan']);
  });

  it('highlights every match in a text node', async () => {
    const node = document.createElement('div');

    await renderToNode(node, 'one two one two one', 'one');

    expect(matches(node)).toEqual(['one', 'one', 'one']);
    expect(node.textContent).toBe('one two one two one');
  });

  it('highlights matches in sibling text nodes once each', async () => {
    const node = document.createElement('div');

    await renderToNode(node, 'pan **and** pan', 'pan');

    expect(matches(node)).toEqual(['pan', 'pan']);
  });

  it('only highlights inside the rendered node', async () => {
    const parent = document.createElement('div');
    parent.append('match outside');
    const node = document.createElement('div');
    parent.append(node);

    await renderToNode(node, 'match inside', 'match');

    expect(matches(parent)).toEqual(['match']);
    expect(parent.firstChild?.textContent).toBe('match outside');
  });

  it('renders normally when nothing matches', async () => {
    const node = document.createElement('div');

    await renderToNode(node, 'Some text', 'absent');

    expect(node.querySelector('p')?.textContent).toBe('Some text');
    expect(matches(node)).toEqual([]);
  });
});
