import { type Dispatch, type SetStateAction } from 'react';

/**
 * Helper to run a callback using requestIdleCallback when available,
 * falling back to immediate execution otherwise.
 * This helps avoid "[Violation] 'setTimeout' handler took Nms" warnings
 * by deferring non-critical work to idle periods.
 */
const runWhenIdle = (callback: () => void) => {
  if ('requestIdleCallback' in window) {
    requestIdleCallback(callback);
  } else {
    callback();
  }
};

export const scrollToElementOffsetAfterDelay = (element: Element, delay: number, location: ScrollLogicalPosition, offsetY: number = 0) => {
  setTimeout(() => {
    runWhenIdle(() => {
      if (offsetY === 0) {
        element.scrollIntoView({ behavior: 'smooth', block: location });
      } else {
        const bbox = element.getBoundingClientRect();
        const loc = (location === 'start' ? bbox.top : ((bbox.top + bbox.bottom) / 2)) + offsetY;
        window.scrollTo({ behavior: 'smooth', top: loc });
      }
    });
  }, delay);
}

export const scrollToIdOffsetAfterDelay = (elementId: string, delay: number, offsetY: number = 0) => {
  setTimeout(() => {
    runWhenIdle(() => {
      const foundElement = document.getElementById(elementId);
      if (foundElement) {
        if (offsetY === 0) {
          foundElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else {
          const bbox = foundElement.getBoundingClientRect();
          const loc = bbox.top + offsetY;
          window.scrollTo({ behavior: 'smooth', top: loc });
        }
      }
    });
  }, delay);
}

export type ValField<T, field extends string> = { [K in field]: T; };
export type ValSetField<T, field extends string> = { [K in `set${Capitalize<field>}`]: (value: T) => void; };
export type ValSetValNamed<T, field extends string> = ValField<T, field> & ValSetField<T, field>;
export type ValSetVal<T> = ValSetValNamed<T, 'value'>;

export function useIndexedState<S>(x: [S[], Dispatch<SetStateAction<S[]>>]) {
  return [x[0], (i: number) => (v: S) => {
    const cpy = x[0].slice();
    cpy[i] = v;
    x[1](cpy)
  }] as const;
};

export type ProductCategoryFilter = "Menu" | "Order" | null;