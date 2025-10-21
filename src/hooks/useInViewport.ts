import { useEffect, useState } from "react";

export const useInViewport = (
  ref: React.RefObject<Element | null>,
  options: IntersectionObserverInit = { root: null, rootMargin: "100px", threshold: 0 },
) => {
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => setInView(entry.isIntersecting));
    }, options);
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, options.root, options.rootMargin, options.threshold]);

  return inView;
};
