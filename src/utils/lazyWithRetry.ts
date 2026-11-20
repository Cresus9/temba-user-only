import { lazy, type ComponentType } from 'react';

const RELOAD_KEY = 'temba:chunk-reload';

function readFlag(): boolean {
  try {
    return window.sessionStorage.getItem(RELOAD_KEY) === '1';
  } catch {
    return false;
  }
}

function writeFlag(on: boolean) {
  try {
    if (on) window.sessionStorage.setItem(RELOAD_KEY, '1');
    else window.sessionStorage.removeItem(RELOAD_KEY);
  } catch {
    // private mode: ignore
  }
}

/**
 * React.lazy for route pages. After a new Netlify deploy the old hashed chunks
 * are gone, so a tab opened before the deploy cannot load them: reload the page
 * once to pick up the new build instead of showing a blank screen.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function lazyWithRetry<T extends ComponentType<any>>(factory: () => Promise<{ default: T }>) {
  return lazy(() =>
    factory()
      .then((mod) => {
        writeFlag(false);
        return mod;
      })
      .catch((error) => {
        if (typeof window !== 'undefined' && !readFlag()) {
          writeFlag(true);
          window.location.reload();
          return new Promise<{ default: T }>(() => {});
        }
        throw error;
      }),
  );
}
