import { createRoot, Root } from 'react-dom/client';

let root: Root | null = null;

/**
 * Returns the app's single React root, creating it on first use.
 *
 * The app renders different trees into `#root` across boot phases
 * (platform warning, auth screen, main app, logging-out screen).
 * React 18 requires reusing one root for this rather than calling
 * `createRoot()` on the same container multiple times.
 */
export const getAppRoot = (): Root => {
  if (!root) {
    root = createRoot(document.getElementById('root')!);
  }
  return root;
};
