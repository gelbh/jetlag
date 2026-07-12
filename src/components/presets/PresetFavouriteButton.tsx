import { HudStarIcon } from "../ui/HudIcons";
import { useGamePresetStore } from "../../state/gamePresetStore";

export function PresetFavouriteButton({ presetId }: { presetId: string }) {
  const isFavourite = useGamePresetStore((state) => state.isFavourite(presetId));
  const toggleFavourite = useGamePresetStore((state) => state.toggleFavourite);

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
