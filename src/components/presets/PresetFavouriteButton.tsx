import { useGamePresetStore } from "../../state/gamePresetStore";
import { HudStarIcon } from "../ui/brand/HudIcons";

export function PresetFavouriteButton({ presetId }: { presetId: string }) {
  const isFavourite = useGamePresetStore((state) => state.isFavourite(presetId));
  const toggleFavourite = useGamePresetStore((state) => state.toggleFavourite);

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
        color: isFavourite ? "var(--color-signal)" : "var(--color-field-ink-muted)",
        WebkitTapHighlightColor: "transparent",
      }}
    >
      <HudStarIcon className="size-5" filled={isFavourite} />
    </button>
  );
}
