import { useEffect, useState, type ReactNode } from "react";

type LoadingReadoutVariant = "default" | "dim";

interface LoadingReadoutProps {
  children: ReactNode;
  variant?: LoadingReadoutVariant;
}

const VARIANT_CLASS: Record<LoadingReadoutVariant, string> = {
  default: "text-ink-secondary",
  dim: "text-ink-dim",
};

const STALE_LOADING_MS = 10_000;

export function LoadingReadout({
  children,
  variant = "dim",
}: LoadingReadoutProps) {
  const [stale, setStale] = useState(false);
  const [prevChildren, setPrevChildren] = useState(children);

  if (children !== prevChildren) {
    setPrevChildren(children);
    setStale(false);
  }

  useEffect(() => {
    const timerId = window.setTimeout(() => setStale(true), STALE_LOADING_MS);
    return () => window.clearTimeout(timerId);
  }, [children]);

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={`space-y-1 font-mono text-sm ${VARIANT_CLASS[variant]}`}
    >
      <div className="flex items-center gap-2">
        <span
          className="loading-spinner size-3.5 shrink-0 rounded-full border-2 border-current border-t-transparent motion-reduce:animate-none"
          aria-hidden
        />
        <span>{children}</span>
      </div>
      {stale ? (
        <p className="text-xs text-ink-dim motion-reduce:opacity-100">
          Map data is still loading — this can take up to a minute on slow
          connections.
        </p>
      ) : null}
    </div>
  );
}
