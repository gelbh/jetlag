import { useEffect } from "react";

interface UseToolSessionOptionsParams<Option> {
  active: boolean;
  usedOptions: ReadonlySet<Option>;
  currentOption: Option;
  isAvailable: (
    usedOptions: ReadonlySet<Option>,
    currentOption: Option,
  ) => boolean;
  pickNext: (usedOptions: ReadonlySet<Option>) => Option | null;
  onUnavailable: (next: Option) => void;
}

export function useToolSessionOptions<Option>({
  active,
  usedOptions,
  currentOption,
  isAvailable,
  pickNext,
  onUnavailable,
}: UseToolSessionOptionsParams<Option>) {
  useEffect(() => {
    if (!active) {
      return;
    }

    if (isAvailable(usedOptions, currentOption)) {
      return;
    }

    const next = pickNext(usedOptions);
    if (next !== null) {
      onUnavailable(next);
    }
  }, [
    active,
    currentOption,
    isAvailable,
    onUnavailable,
    pickNext,
    usedOptions,
  ]);
}
