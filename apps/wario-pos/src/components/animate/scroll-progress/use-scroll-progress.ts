import type { MotionValue } from 'motion/react';
import { useScroll } from 'motion/react';
import { useMemo, useRef } from 'react';

import { createClasses } from '@/theme/create-classes';

// ----------------------------------------------------------------------

export const scrollProgressClasses = {
  circular: createClasses('scroll__progress__circular'),
  linear: createClasses('scroll__progress__linear'),
};



export type UseScrollProgressReturn = {
  scrollXProgress: MotionValue<number>;
  scrollYProgress: MotionValue<number>;
  elementRef: React.RefObject<HTMLDivElement | null>;
};

export type UseScrollProgress = 'document' | 'container';

export function useScrollProgress(target: UseScrollProgress = 'document'): UseScrollProgressReturn {
  const elementRef = useRef<HTMLDivElement>(null);

  const options = { container: elementRef };

  const { scrollYProgress, scrollXProgress } = useScroll(
    target === 'container' ? options : undefined
  );

  const memoizedValue = useMemo(
    () => ({ elementRef, scrollXProgress, scrollYProgress }),
    [elementRef, scrollXProgress, scrollYProgress]
  );

  return memoizedValue;
}
