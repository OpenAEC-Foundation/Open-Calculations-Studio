import { useEffect, useRef, useState } from "react";

/**
 * Ctrl+wheel zoom for a scrollable pane. Returns a ref to attach to the pane
 * root and a `zoom` factor (default 1). Zoom is clamped to [min, max] and
 * `e.preventDefault()` is called on Ctrl+wheel so the browser doesn't zoom
 * the whole window.
 *
 * Each consumer holds independent state — Editor and Preview can zoom
 * separately.
 */
export function useZoom(initial = 1, min = 0.5, max = 3) {
  const [zoom, setZoom] = useState(initial);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      // ~10 % per notch on a typical mouse wheel.
      const step = -e.deltaY * 0.001;
      setZoom((z) => Math.min(max, Math.max(min, z * (1 + step))));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [min, max]);

  const reset = () => setZoom(1);
  return { ref, zoom, setZoom, reset };
}
