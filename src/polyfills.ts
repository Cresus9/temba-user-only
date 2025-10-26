// Browser compatibility polyfills
import 'core-js/stable';

// Polyfill for ResizeObserver (only load if needed)
if (!window.ResizeObserver) {
  import('resize-observer-polyfill').then(({ ResizeObserver }) => {
    window.ResizeObserver = ResizeObserver;
  }).catch(() => {
    // Fallback if polyfill fails to load
    console.warn('ResizeObserver polyfill failed to load');
  });
}

// Polyfill for fetch API in older browsers
if (!window.fetch) {
  import('whatwg-fetch').catch(() => {
    console.warn('Fetch polyfill failed to load');
  });
}

// Polyfill for URLSearchParams
if (!window.URLSearchParams) {
  import('url-search-params-polyfill').catch(() => {
    console.warn('URLSearchParams polyfill failed to load');
  });
}

// Ensure Promise is available
if (!window.Promise) {
  import('es6-promise/auto').catch(() => {
    console.warn('Promise polyfill failed to load');
  });
}

// Polyfill for Object.assign
if (!Object.assign) {
  Object.assign = function(target: any, ...sources: any[]) {
    if (target == null) {
      throw new TypeError('Cannot convert undefined or null to object');
    }
    const to = Object(target);
    for (let index = 0; index < sources.length; index++) {
      const nextSource = sources[index];
      if (nextSource != null) {
        for (const nextKey in nextSource) {
          if (Object.prototype.hasOwnProperty.call(nextSource, nextKey)) {
            to[nextKey] = nextSource[nextKey];
          }
        }
      }
    }
    return to;
  };
}

// Polyfill for Array.from
if (!Array.from) {
  Array.from = function(arrayLike: any, mapFn?: any, thisArg?: any) {
    const C = this;
    const items = Object(arrayLike);
    if (arrayLike == null) {
      throw new TypeError('Array.from requires an array-like object - not null or undefined');
    }
    const mapFunction = arguments.length > 1 ? mapFn : void undefined;
    let T;
    if (typeof mapFunction !== 'undefined') {
      if (arguments.length > 2) {
        T = thisArg;
      }
    }
    const len = parseInt(items.length) || 0;
    const A = typeof C === 'function' ? Object(new C(len)) : new Array(len);
    let k = 0;
    let kValue;
    while (k < len) {
      kValue = items[k];
      if (mapFunction) {
        A[k] = typeof T === 'undefined' ? mapFunction(kValue, k) : mapFunction.call(T, kValue, k);
      } else {
        A[k] = kValue;
      }
      k += 1;
    }
    A.length = len;
    return A;
  };
}

// Polyfill for String.includes
if (!String.prototype.includes) {
  String.prototype.includes = function(search: string, start?: number) {
    if (typeof start !== 'number') {
      start = 0;
    }
    if (start + search.length > this.length) {
      return false;
    } else {
      return this.indexOf(search, start) !== -1;
    }
  };
}

// Polyfill for Array.includes
if (!Array.prototype.includes) {
  Array.prototype.includes = function(searchElement: any, fromIndex?: number) {
    if (this == null) {
      throw new TypeError('Array.prototype.includes called on null or undefined');
    }
    const O = Object(this);
    const len = parseInt(O.length) || 0;
    if (len === 0) {
      return false;
    }
    const n = parseInt(fromIndex) || 0;
    let k;
    if (n >= 0) {
      k = n;
    } else {
      k = len + n;
      if (k < 0) {
        k = 0;
      }
    }
    function sameValueZero(x: any, y: any) {
      return x === y || (typeof x === 'number' && typeof y === 'number' && isNaN(x) && isNaN(y));
    }
    for (; k < len; k++) {
      if (sameValueZero(O[k], searchElement)) {
        return true;
      }
    }
    return false;
  };
}

// CSS Custom Properties (CSS Variables) fallback for older browsers
if (!window.CSS || !window.CSS.supports || !window.CSS.supports('color', 'var(--fake-var)')) {
  // Add a class to indicate CSS variables are not supported
  document.documentElement.classList.add('no-css-variables');
}

// Console polyfill for older browsers
if (!window.console) {
  window.console = {
    log: function() {},
    warn: function() {},
    error: function() {},
    info: function() {},
    debug: function() {},
    trace: function() {},
    dir: function() {},
    group: function() {},
    groupEnd: function() {},
    time: function() {},
    timeEnd: function() {},
    profile: function() {},
    profileEnd: function() {},
    count: function() {},
    clear: function() {}
  } as any;
}

export {};
