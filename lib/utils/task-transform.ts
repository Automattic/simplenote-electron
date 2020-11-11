export const withCheckboxCharacters = (s: string): string =>
  s.replace(
    /^(\s*)- \[( |x|X)\](\s)/gm,
    (match, prespace, inside, postspace) =>
      prespace + (inside === ' ' ? '\ue000' : '\ue001') + postspace
  );

export const withCheckboxSyntax = (s: string): string =>
  s.replace(/\ue000|\ue001/g, (match) =>
    match === '\ue000' ? '- [ ]' : '- [x]'
  );
