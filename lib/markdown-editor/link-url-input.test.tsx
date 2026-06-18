import React from 'react';
import { fireEvent, render } from '@testing-library/react';

import { LinkUrlInput } from './link-url-input';

describe('LinkUrlInput', () => {
  it('submits trimmed valid URLs', () => {
    const onSubmit = jest.fn();
    const { getByLabelText } = render(
      <LinkUrlInput
        initialUrl=" https://example.com/photo.jpg "
        onCancel={jest.fn()}
        onSubmit={onSubmit}
      />
    );

    fireEvent.keyDown(getByLabelText('Link URL'), { key: 'Enter' });

    expect(onSubmit).toHaveBeenCalledWith('https://example.com/photo.jpg');
  });

  it('keeps invalid URLs open with an accessible error', () => {
    const onSubmit = jest.fn();
    const { getByLabelText, getByRole } = render(
      <LinkUrlInput
        ariaLabel="Image URL"
        initialUrl="http://127.0.0.1/photo.jpg"
        onCancel={jest.fn()}
        onSubmit={onSubmit}
        validate={() => false}
        validationMessage="Use a public HTTPS image URL."
      />
    );
    const input = getByLabelText('Image URL');

    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onSubmit).not.toHaveBeenCalled();
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(getByRole('alert').textContent).toBe(
      'Use a public HTTPS image URL.'
    );
  });
});
