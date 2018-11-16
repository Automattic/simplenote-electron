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
});
