import fs from 'fs';
import path from 'path';
import enmlToMarkdown from '../enml-to-markdown';

describe('enmlToMarkdown', () => {
  it('should render the correct Markdown', done => {
    const testResult = result => {
      fs.readFile(
        path.join(__dirname, './correct-markdown.txt'),
        'utf8',
        (err, correctMarkdown) => {
          expect(result).toBe(correctMarkdown.trim());
          done();
        }
      );
    };

    fs.readFile(path.join(__dirname, './mock-enml.txt'), 'utf8', (err, enml) =>
      testResult(enmlToMarkdown(enml))
    );
  });

  it('should not escape Markdown characters', () => {
    // https://github.com/domchristie/turndown#escaping-markdown-characters
    const rendered = enmlToMarkdown(
      '<div>- UL like</div><div>1. OL like</div><div># H1 like</div'
    );
    expect(rendered).toBe('- UL like\n1. OL like\n# H1 like');
  });

  it('should use alt text when available', () => {
    const rendered = enmlToMarkdown(
      '<en-media alt="Alt text" type="image/jpeg"></en-media>'
    );
    expect(rendered).toBe('Alt text (image/jpeg)');
  });

  it('should handle nested media in blank tags', () => {
    const rendered = enmlToMarkdown(
      '<p><a href="http://example.com"><en-media type="image/jpeg"></en-media></a></p>'
    );
    expect(rendered).toBe('[(image/jpeg)](http://example.com)');
  });

  it('should handle A tags with missing hrefs', () => {
    const rendered = enmlToMarkdown('<a>Link</a>');
    expect(rendered).toBe('Link');
  });

  it('should handle inline svgs', () => {
    const rendered = enmlToMarkdown('<img src="data:image/svg+xmlblahblah" />');
    expect(rendered).toBe('(image/svg)');
  });
});
