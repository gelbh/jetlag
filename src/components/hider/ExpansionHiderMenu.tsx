import { MotionSheet } from "../motion/MotionSheet";
import { SheetHeader } from "../ui/SheetHeader";

interface ExpansionHiderMenuProps {
  open: boolean;
  onClose: () => void;
  canPlaceTimeTrap: boolean;
  trapPlaced: boolean;
  onPlaceTimeTrap: () => void;
  onOpenCurseReference: () => void;
}

export function ExpansionHiderMenu({
  open,
  onClose,
  canPlaceTimeTrap,
  trapPlaced,
  onPlaceTimeTrap,
  onOpenCurseReference,
}: ExpansionHiderMenuProps) {
  return (
    <MotionSheet
      open={open}
      onClose={onClose}
      ariaLabel="Expansion Pack options"
      sheetClassName="mx-auto max-w-lg"
      maxHeightClassName="max-h-[min(40dvh,320px)]"
    >
      <SheetHeader title="Expansion Pack" onClose={onClose} />

      <div className="space-y-2">
        {canPlaceTimeTrap ? (
          <button
            type="button"
            onClick={onPlaceTimeTrap}
            className="btn-primary min-h-12 w-full"
          >
            Place time trap
          </button>
        ) : trapPlaced ? (
          <p className="text-sm text-ink-muted">
            Time trap already placed this round.
          </p>
        ) : (
          <p className="text-sm text-ink-muted">
            Set your hiding zone before placing a time trap.
          </p>
        )}
        <button
          type="button"
          onClick={onOpenCurseReference}
          className="btn-secondary min-h-12 w-full"
        >
          Curse reference
        </button>
      </div>
    </MotionSheet>
  );
}
