import { useDebounce } from "use-debounce";

export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced] = useDebounce(value, delayMs);
  return debounced;
}
