import { type MouseEvent, type Ref, useId } from "react";

const facadePlateStyle = {
  backgroundColor: "var(--color-canvas)",
  borderBottom: "0.33px solid var(--color-rule)",
} as const;

interface CreateSessionMapFacadeProps {
  /**
   * Map construction has started. The same button stays mounted (busy) until
   * MapLibre reports a viewport, so keyboard focus is not dropped to <body>.
   */
  loading: boolean;
  onActivate: (event: MouseEvent<HTMLButtonElement>) => void;
  onPrefetchIntent: () => void;
  ref?: Ref<HTMLButtonElement>;
}

/**
 * Static, same-size stand-in for the create-session map. MapLibre costs ~1.8 s
 * of main thread on mid-range phones, so it is only constructed on intent.
 */
export function CreateSessionMapFacade({
  loading,
  onActivate,
  onPrefetchIntent,
  ref,
}: CreateSessionMapFacadeProps) {
  const labelId = useId();
  const hintId = useId();

  return (
    <button
      ref={ref}
      type="button"
      aria-labelledby={labelId}
      aria-describedby={loading ? undefined : hintId}
      aria-busy={loading || undefined}
      aria-disabled={loading || undefined}
      onClick={loading ? undefined : onActivate}
      onPointerEnter={onPrefetchIntent}
      onPointerDown={onPrefetchIntent}
      onFocus={onPrefetchIntent}
      className={`group absolute inset-0 z-[1] flex w-full items-center justify-center border-0 p-0 focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-[var(--color-flag)] ${
        loading ? "pointer-events-none" : "cursor-pointer"
      }`}
      style={facadePlateStyle}
      data-testid="create-session-map-facade"
    >
      <span className="relative flex flex-col items-center gap-2 px-6 text-center">
        <span id={labelId} className="text-base font-semibold text-field-ink">
          {loading ? "Loading map…" : "Open map"}
        </span>
        {loading ? null : (
          <span
            id={hintId}
            className="jl-empty-state max-w-[18rem] text-sm leading-relaxed text-field-ink-muted text-pretty [@media(max-height:30rem)]:hidden"
          >
            Search a place, load a preset, or open Draw.
          </span>
        )}
      </span>
    </button>
  );
}
