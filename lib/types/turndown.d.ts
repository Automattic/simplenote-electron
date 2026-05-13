declare module 'turndown' {
  type TurndownOptions = {
    bulletListMarker?: string;
    codeBlockStyle?: 'indented' | 'fenced';
    emDelimiter?: '_' | '*';
    headingStyle?: 'setext' | 'atx';
    hr?: string;
    strongDelimiter?: '__' | '**';
  };

  type TurndownReplacementOptions = {
    bulletListMarker: string;
  };

  type TurndownRule = {
    filter: string | string[];
    replacement: (
      content: string,
      node: Node,
      options: TurndownReplacementOptions
    ) => string;
  };

  export default class TurndownService {
    constructor(options?: TurndownOptions);
    addRule(key: string, rule: TurndownRule): this;
    turndown(input: string | Node): string;
  }
}
