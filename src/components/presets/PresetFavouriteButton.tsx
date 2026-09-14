import { HudStarIcon } from "../ui/brand/HudIcons";
import { useGamePresetStore } from "../../state/gamePresetStore";

export function PresetFavouriteButton({
  presetId,
  chrome = "survey",
}: {
  presetId: string;
  chrome?: "survey" | "ios";
}) {
  const isFavourite = useGamePresetStore((state) => state.isFavourite(presetId));
  const toggleFavourite = useGamePresetStore((state) => state.toggleFavourite);

  if (chrome === "ios") {
    return (
      <button
        type="button"
        aria-label={isFavourite ? "Remove from favourites" : "Add to favourites"}
        aria-pressed={isFavourite}
        onClick={() => toggleFavourite(presetId)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: 44,
          minWidth: 44,
          flexShrink: 0,
          borderRadius: 10,
          border: isFavourite
            ? "0.33px solid oklch(from var(--color-signal) l c h / 0.45)"
            : "0.33px solid oklch(from var(--color-field-ink) l c h / 0.12)",
          backgroundColor: isFavourite
            ? "oklch(from var(--color-signal) l c h / 0.14)"
            : "oklch(from var(--color-field-ink) l c h / 0.06)",
          color: isFavourite
            ? "var(--color-signal)"
            : "var(--color-field-ink-muted)",
          WebkitTapHighlightColor: "transparent",
        }}
      >
        <HudStarIcon className="size-5" filled={isFavourite} />
      </button>
    );
  }

  return (
    <button
      type="button"
      className={`inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg border transition-colors ${
        isFavourite
          ? "border-brand-blue/50 bg-brand-blue/10 text-brand-blue"
          : "border-border bg-surface-deep text-ink-muted hover:text-ink"
      }`}
      aria-label={isFavourite ? "Remove from favourites" : "Add to favourites"}
      aria-pressed={isFavourite}
      onClick={() => toggleFavourite(presetId)}
    >
      <HudStarIcon className="size-5" filled={isFavourite} />
    </button>
  );
}
