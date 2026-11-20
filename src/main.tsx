// Entry point. Kept tiny so the browser starts on the app right away.
import './polyfills';

/**
 * core-js (about 190 kB) used to ship to every visitor. Browsers from roughly
 * 2022 on (Chrome/Android WebView 98+, Safari 15.4+) already have everything it
 * adds, so only older phones download it now, before the app starts.
 */
function isModernBrowser(): boolean {
  try {
    const arr = Array.prototype as unknown as Record<string, unknown>;
    const str = String.prototype as unknown as Record<string, unknown>;
    return (
      typeof (globalThis as { structuredClone?: unknown }).structuredClone === 'function' &&
      typeof arr.at === 'function' &&
      typeof arr.findLast === 'function' &&
      typeof arr.flat === 'function' &&
      typeof (Object as unknown as Record<string, unknown>).hasOwn === 'function' &&
      typeof str.replaceAll === 'function' &&
      typeof (Promise as unknown as Record<string, unknown>).any === 'function' &&
      typeof (Promise as unknown as Record<string, unknown>).allSettled === 'function'
    );
  } catch {
    return false;
  }
}

const start = () => import('./bootstrap');

if (isModernBrowser()) {
  void start();
} else {
  // @ts-expect-error core-js ships no type declarations
  import('core-js/stable')
    .catch(() => undefined)
    .then(start);
}
