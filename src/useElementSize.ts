import { useEffect, useRef, useState } from "react";

export function useElementSize<T extends Element>() {
  const ref = useRef<T>(null);

  const [width, setWidth] = useState(0);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const ro = new ResizeObserver(([entry]) => {
      setWidth(entry.contentRect.width);
      setHeight(entry.contentRect.height);
    });
    ro.observe(element);

    return () => ro.disconnect();
  }, []);

  return { ref, width, height };
}
