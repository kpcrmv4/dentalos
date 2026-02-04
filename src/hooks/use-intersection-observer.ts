import { useState, useEffect, useRef, RefObject } from 'react';

interface UseIntersectionObserverOptions {
  threshold?: number | number[];
  root?: Element | null;
  rootMargin?: string;
  freezeOnceVisible?: boolean;
}

interface UseIntersectionObserverReturn {
  ref: RefObject<HTMLElement>;
  isIntersecting: boolean;
  entry?: IntersectionObserverEntry;
}

/**
 * Custom hook for observing element intersection with viewport
 * Useful for lazy loading, infinite scroll, and animations
 */
export function useIntersectionObserver({
  threshold = 0,
  root = null,
  rootMargin = '0px',
  freezeOnceVisible = false,
}: UseIntersectionObserverOptions = {}): UseIntersectionObserverReturn {
  const ref = useRef<HTMLElement>(null);
  const [entry, setEntry] = useState<IntersectionObserverEntry>();
  const [isIntersecting, setIsIntersecting] = useState(false);

  const frozen = freezeOnceVisible && isIntersecting;

  useEffect(() => {
    const element = ref.current;
    if (!element || frozen) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setEntry(entry);
        setIsIntersecting(entry.isIntersecting);
      },
      { threshold, root, rootMargin }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [threshold, root, rootMargin, frozen]);

  return { ref, isIntersecting, entry };
}

/**
 * Custom hook for lazy loading components when they enter viewport
 */
export function useLazyLoad(options?: UseIntersectionObserverOptions) {
  const { ref, isIntersecting } = useIntersectionObserver({
    ...options,
    freezeOnceVisible: true,
  });

  return { ref, shouldLoad: isIntersecting };
}
