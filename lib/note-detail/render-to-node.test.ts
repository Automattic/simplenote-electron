import { renderToNode } from './render-to-node';

describe('renderToNode', () => {
  it('renders and highlights search matches in a detached element', async () => {
    const renderTarget = document.createElement('div');

    await renderToNode(renderTarget, 'Simplenote content', 'simplenote');

    expect(renderTarget.textContent).toContain('Simplenote content');
    expect(renderTarget.querySelector('.search-match')?.textContent).toBe(
      'Simplenote'
    );
  });
});
