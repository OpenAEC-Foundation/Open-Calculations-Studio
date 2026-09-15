import { useEffect, useState } from "react";

/**
 * Returns `value` debounced by `delay` ms. When `value` changes rapidly
 * (e.g. while the user is typing), the returned value only updates after
 * the user pauses for `delay` ms. Used by Preview so the calc engine
 * doesn't re-run on every keystroke.
 */
export function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}
