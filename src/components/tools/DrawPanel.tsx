import { Button } from "@mantine/core";
import { iosGrayStyles } from "@/components/ui/apple/iosEntryChrome";
import { usePlayerUiMantine } from "@/hooks/feature/usePlayerUiMantine";

interface DrawPanelProps {
  pointCount: number;
  drawing: boolean;
  busy: boolean;
  onClear: () => void;
}

export function DrawPanel({
  pointCount,
  drawing,
  busy,
  onClear,
}: DrawPanelProps) {
  const mantinePlayerUi = usePlayerUiMantine();
  const clearDisabled = pointCount === 0 || busy;

  return (
    <div className="space-y-3">
      <p className="text-sm text-ink-muted">
        Drag on the map to scribble. Release to save the stroke.
      </p>
      <p className="text-sm text-ink-dim">
        {drawing
          ? "Drawing…"
          : busy
            ? "Saving…"
            : pointCount > 0
              ? `Last stroke: ${pointCount} points`
              : "Ready"}
      </p>
      {mantinePlayerUi ? (
        <Button
          fullWidth
          disabled={clearDisabled}
          onClick={onClear}
          styles={iosGrayStyles}
        >
          Clear draft
        </Button>
      ) : (
        <button
          type="button"
          onClick={onClear}
          disabled={clearDisabled}
          className="btn-secondary min-h-11 w-full"
        >
          Clear draft
        </button>
      )}
    </div>
  );
}
