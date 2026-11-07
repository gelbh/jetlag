import { useMemo, useState } from "react";
import { applyBoardOpPreview, type BoardOpPreview } from "@/domain/admin/applyBoardOpPreview";
import type { AnnotationRecord } from "@/domain/map/annotations";

export function useAdminBoardPreview(liveAnnotations: readonly AnnotationRecord[]) {
  const [pendingOp, setPendingOp] = useState<BoardOpPreview | null>(null);

  const previewAnnotations = useMemo(() => {
    if (!pendingOp) {
      return null;
    }
    return applyBoardOpPreview(liveAnnotations, pendingOp);
  }, [liveAnnotations, pendingOp]);

  return {
    pendingOp,
    previewAnnotations,
    preview: setPendingOp,
    clear: () => setPendingOp(null),
  };
}
