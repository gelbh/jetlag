import { useState } from "react";
import type { HostConfirmRecord } from "../../domain/incident/incidentTypes";
import {
  approveHostConfirm,
  denyHostConfirm,
} from "../../services/incident/incidentApi";
import { MotionSheet } from "../motion/MotionSheet";
import { SheetHeader } from "../ui/sheets/SheetHeader";
import "./HostConfirmSheet.css";

function formatToolLabel(tool: string): string {
  return tool.replaceAll("_", " ");
}

export interface HostConfirmSheetProps {
  open: boolean;
  confirm: HostConfirmRecord | null;
  onClose: () => void;
  /** Injectable for tests. */
  approveFn?: (incidentId: string, confirmId: string) => Promise<unknown>;
  denyFn?: (incidentId: string, confirmId: string) => Promise<unknown>;
}

/**
 * Broadcast-HUD sheet asking the session host to approve a destructive
 * session-ops action. Approve runs the callable (execute once); dismiss denies.
 */
export function HostConfirmSheet({
  open,
  confirm,
  onClose,
  approveFn = approveHostConfirm,
  denyFn = denyHostConfirm,
}: HostConfirmSheetProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClose = () => {
    if (busy) {
      return;
    }
    onClose();
  };

  const handleApprove = async () => {
    if (!confirm || busy) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await approveFn(confirm.incidentId, confirm.id);
      onClose();
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Could not approve the change.",
      );
    } finally {
      setBusy(false);
    }
  };

  const handleDeny = async () => {
    if (!confirm || busy) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await denyFn(confirm.incidentId, confirm.id);
      onClose();
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Could not dismiss the confirmation.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <MotionSheet
      open={open}
      onClose={handleClose}
      ariaLabel="Host confirmation"
      sheetClassName="mx-auto max-w-lg jl-host-confirm-host"
      maxHeightClassName="max-h-[min(70dvh,520px)]"
      dismissible={!busy}
    >
      {open && confirm ? (
        <div className="jl-host-confirm-sheet">
          <SheetHeader
            title="Confirm change"
            eyebrow="Host"
            onClose={() => {
              void handleDeny();
            }}
            closeLabel="Not now"
          />
          <p className="jl-host-confirm-helper">
            A fix agent wants to run{" "}
            <span className="jl-host-confirm-tool">
              {formatToolLabel(confirm.tool)}
            </span>{" "}
            on this session. Only you (the host) can approve.
          </p>
          {error ? (
            <p className="jl-host-confirm-error" role="alert">
              {error}
            </p>
          ) : null}
          <div className="jl-host-confirm-actions">
            <button
              type="button"
              className="btn btn-secondary"
              disabled={busy}
              onClick={() => {
                void handleDeny();
              }}
            >
              Not now
            </button>
            <button
              type="button"
              className="btn btn-primary"
              disabled={busy}
              onClick={() => {
                void handleApprove();
              }}
            >
              {busy ? "Working…" : "Approve"}
            </button>
          </div>
        </div>
      ) : null}
    </MotionSheet>
  );
}
