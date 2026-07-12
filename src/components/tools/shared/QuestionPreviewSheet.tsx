import { MotionSheet } from "../../motion/MotionSheet";
import { SheetHeader } from "../../ui/SheetHeader";
import { QuestionPromptBlock } from "./QuestionPromptBlock";
import { CoordinateCopyButton } from "./CoordinateCopyButton";

interface QuestionPreviewSheetProps {
  open: boolean;
  prompt: string;
  ruleSummary?: string;
  anchorLat?: number | null;
  anchorLng?: number | null;
  costLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export function QuestionPreviewSheet({
  open,
  prompt,
  ruleSummary,
  anchorLat,
  anchorLng,
  costLabel,
  onConfirm,
  onCancel,
  isSubmitting = false,
}: QuestionPreviewSheetProps) {
  return (
    <MotionSheet
      open={open}
      onClose={onCancel}
      ariaLabel="Preview question before send"
      sheetClassName="mx-auto max-w-lg"
      maxHeightClassName="max-h-[min(60dvh,480px)]"
    >
      <SheetHeader title="Preview question" onClose={onCancel} closeLabel="Back" />

      <div className="space-y-4">
        <QuestionPromptBlock prompt={prompt} ruleSummary={ruleSummary} />
        {typeof anchorLat === "number" && typeof anchorLng === "number" ? (
          <CoordinateCopyButton lat={anchorLat} lng={anchorLng} className="w-full" />
        ) : null}
        {costLabel ? (
          <p className="text-xs text-ink-muted">Card cost: {costLabel}</p>
        ) : null}
        <button
          type="button"
          onClick={onConfirm}
          disabled={isSubmitting}
          className="btn-primary min-h-12 w-full disabled:opacity-40"
        >
          {isSubmitting ? "Sending…" : "Send question"}
        </button>
      </div>
    </MotionSheet>
  );
}
