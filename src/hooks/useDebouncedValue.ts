import { useEffect, useState } from "react";

/**
 * Returns a debounced copy of `value` that only updates `delayMs` after the
 * last change. Used on search/filter inputs so typing doesn't re-filter and
 * re-render a large list on every keystroke.
 */
export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
