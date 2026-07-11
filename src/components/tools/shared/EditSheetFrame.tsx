import type { ReactNode } from "react";
import { SheetHeader } from "../../ui/SheetHeader";

interface EditSheetFrameProps {
  title: string;
  onClose: () => void;
  onSave?: () => void;
  onDelete: () => void;
  children: ReactNode;
}

export function EditSheetFrame({
  title,
  onClose,
  onSave,
  onDelete,
  children,
}: EditSheetFrameProps) {
  return (
    <div className="pointer-events-auto absolute inset-x-0 jl-panel-above-dock jl-panel-enter z-[var(--z-panel)] px-3">
      <div className="hud-panel mx-auto flex max-h-[min(42dvh,420px)] max-w-xl flex-col overflow-hidden">
        <div className="shrink-0 p-4 pb-0">
          <SheetHeader
            title={title}
            onClose={onClose}
            eyebrow="Edit"
            closeVariant="raised"
            flush
            className="mb-0"
          />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-3">
          <div className="space-y-4">{children}</div>
        </div>
        <div className="grid shrink-0 grid-cols-2 gap-2 border-t border-border p-4">
          {onSave ? (
            <button
              type="button"
              onClick={onSave}
              className="btn-primary w-full"
            >
              Save changes
            </button>
          ) : null}
          <button
            type="button"
            onClick={onDelete}
            className={`min-h-12 rounded-xl bg-status-error-surface px-3 text-sm font-medium text-status-error ${
              onSave ? "" : "col-span-2"
            }`}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
