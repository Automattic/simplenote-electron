import { TKQItem, TracksAPI } from './analytics/types';

declare global {
  const __TEST__: boolean;

  interface Window {
    analyticsEnabled: boolean;
    spellCheckHandler?: {
      currentSpellcheckerLanguage: string | undefined;
      provideHintText: (text: string) => Promise<void>;
      switchLanguage: (language: string) => void;
    };
    testEvents: (string | [string, ...any[]])[];
    _tkq: TKQItem[] & { a: unknown };
    wpcom: {
      tracks: TracksAPI;
    };
  }
}
