import { type RefObject, useEffect, useState } from "react";

export function useRowInView(ref: RefObject<Element | null>, observeKey?: string | null): boolean {
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node || typeof IntersectionObserver === "undefined") {
      setInView(false);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setInView(entry?.isIntersecting ?? false);
      },
      { threshold: 0.2 },
    );
    observer.observe(node);
    return () => {
      observer.disconnect();
    };
  }, [ref, observeKey]);

  return inView;
}
