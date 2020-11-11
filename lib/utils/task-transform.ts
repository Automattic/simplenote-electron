/**
 * Regex to find valid checkboxes within a string
 *
 * Checkboxes are valid if they:
 * - exist as the first non-whitespace on a line
 * - take one of the following forms ( - [ ] | - [x] | - [X])
 */
export const checkboxRegex: RegExp = /^(\s*)- \[( |x|X)\](\s)/gm;

export const withCheckboxCharacters = (s: string): string =>
  s.replace(
    checkboxRegex,
    (match, prespace, inside, postspace) =>
      prespace + (inside === ' ' ? '\ue000' : '\ue001') + postspace
  );

export const withCheckboxSyntax = (s: string): string =>
  s.replace(/\ue000|\ue001/g, (match) =>
    match === '\ue000' ? '- [ ]' : '- [x]'
  );
