import { MapTrifold } from "@phosphor-icons/react";
import { type MouseEvent, type Ref, useId } from "react";
import { mapChromeSurfaceStyles } from "@/components/ui/entry/entryChrome";

const facadePlateStyle = {
  backgroundColor: "var(--color-canvas)",
  backgroundImage: [
    "linear-gradient(oklch(from var(--color-rule) l c h / 0.32) 1px, transparent 1px)",
    "linear-gradient(90deg, oklch(from var(--color-rule) l c h / 0.32) 1px, transparent 1px)",
  ].join(", "),
  backgroundSize: "28px 28px",
  backgroundPosition: "center",
} as const;

const facadeBoundaryStyle = {
  border: "1.5px dashed oklch(from var(--color-flag) l c h / 0.55)",
} as const;

const facadeChipStyle = { ...mapChromeSurfaceStyles } as const;

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
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-[14%] inset-y-[16%] rounded-[var(--radius-hud-md)]"
        style={facadeBoundaryStyle}
      />
      <span className="relative flex flex-col items-center gap-2 px-6 text-center">
        {/* 14px matches the map hint Paper (radius={14}) this plate gives way to. */}
        <span
          className="inline-flex min-h-11 items-center gap-2 rounded-[14px] border border-rule bg-canvas px-4 text-base font-semibold text-field-ink transition-colors group-hover:border-flag group-focus-visible:border-flag motion-reduce:transition-none"
          style={facadeChipStyle}
        >
          <MapTrifold aria-hidden size={20} weight="bold" color="var(--color-flag)" />
          <span id={labelId}>{loading ? "Loading map…" : "Open map"}</span>
        </span>
        {loading ? null : (
          <span
            id={hintId}
            className="max-w-[18rem] text-xs leading-snug text-field-ink-muted text-pretty [@media(max-height:30rem)]:hidden"
          >
            Preview your play area here. Search, load a preset, or open Draw.
          </span>
        )}
      </span>
    </button>
  );
}
