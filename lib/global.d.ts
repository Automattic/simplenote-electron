import { TKQItem, TracksAPI } from "./analytics/types";

declare global {
  const __TEST__: boolean;

  interface Window {
    analyticsEnabled: boolean;
    testEvents: (string | [string, ...any[]])[];
    _tkq: TKQItem[] & { a: unknown };
    wpcom: {
      tracks: TracksAPI;
    };
  }
}
