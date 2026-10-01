import { useId, type MouseEvent } from "react";
import { MapTrifold } from "@phosphor-icons/react";

/** Survey-sheet grid: ruled hairlines on the canvas plate, no tiles fetched. */
const facadePlateStyle = {
  backgroundColor: "var(--color-canvas)",
  backgroundImage: [
    "linear-gradient(oklch(from var(--color-rule) l c h / 0.32) 1px, transparent 1px)",
    "linear-gradient(90deg, oklch(from var(--color-rule) l c h / 0.32) 1px, transparent 1px)",
  ].join(", "),
  backgroundSize: "28px 28px",
  backgroundPosition: "center",
} as const;

/** Echoes the dashed play-boundary rectangle the live map draws. */
const facadeBoundaryStyle = {
  border: "1.5px dashed oklch(from var(--color-flag) l c h / 0.55)",
} as const;

const facadeChipStyle = { boxShadow: "var(--shadow-hud-float)" } as const;

type CreateSessionMapFacadeProps =
  | {
      /** Map construction has started; the plate stays until MapLibre reports a viewport. */
      loading: true;
    }
  | {
      loading?: false;
      onActivate: (event: MouseEvent<HTMLButtonElement>) => void;
      /** Hover / focus / press: warm the map chunk before the click lands. */
      onPrefetchIntent: () => void;
    };

/**
 * Static, same-size stand-in for the create-session map. MapLibre costs ~1.8 s
 * of main thread on mid-range phones, so it is only constructed on intent.
 */
export function CreateSessionMapFacade(props: CreateSessionMapFacadeProps) {
  const labelId = useId();
  const hintId = useId();
  const loading = props.loading === true;

  const plate = (
    <>
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-[14%] inset-y-[16%] rounded-[var(--radius-hud-md)]"
        style={facadeBoundaryStyle}
      />
      <span className="relative flex flex-col items-center gap-2 px-6 text-center">
        <span
          className="inline-flex min-h-11 items-center gap-2 rounded-[14px] border border-rule bg-canvas px-4 text-[0.9375rem] font-semibold text-field-ink transition-colors group-hover:border-flag group-focus-visible:border-flag motion-reduce:transition-none"
          style={facadeChipStyle}
        >
          <MapTrifold
            aria-hidden
            size={20}
            weight="bold"
            color="var(--color-flag)"
          />
          <span id={labelId}>{loading ? "Loading map…" : "Open map"}</span>
        </span>
        <span
          id={hintId}
          className="max-w-[18rem] text-xs leading-snug text-field-ink-muted text-pretty"
        >
          Frame your play area by hand, or search a place below.
        </span>
      </span>
    </>
  );

  if (props.loading) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="absolute inset-0 z-[1] flex items-center justify-center"
        style={facadePlateStyle}
        data-testid="create-session-map-facade"
      >
        {plate}
      </div>
    );
  }

  return (
    <button
      type="button"
      aria-labelledby={labelId}
      aria-describedby={hintId}
      onClick={props.onActivate}
      onPointerEnter={props.onPrefetchIntent}
      onPointerDown={props.onPrefetchIntent}
      onFocus={props.onPrefetchIntent}
      className="jl-create-map-facade group absolute inset-0 flex w-full cursor-pointer items-center justify-center border-0 p-0 focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-[var(--color-flag)]"
      style={facadePlateStyle}
      data-testid="create-session-map-facade"
    >
      {plate}
    </button>
  );
}
