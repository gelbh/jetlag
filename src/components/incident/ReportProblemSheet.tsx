import { Capacitor } from "@capacitor/core";
import { useEffect, useId, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { APP_VERSION } from "../../domain/device/changelog";
import { collectIncidentDiagnostics } from "../../domain/incident/collectIncidentDiagnostics";
import {
  INCIDENT_NOTE_MAX_LENGTH,
  type IncidentClientError,
} from "../../domain/incident/incidentTypes";
import {
  createIncident,
  type CreateIncidentInput,
  type CreateIncidentResult,
} from "../../services/incident/incidentApi";
import { getFirebaseAuth, isFirebaseConfigured } from "../../services/core/firebase/firebase";
import { useSessionStore } from "../../state/sessionStore";
import { MotionSheet } from "../motion/MotionSheet";
import { SheetHeader } from "../ui/sheets/SheetHeader";
import { IncidentChatPanel } from "./IncidentChatPanel";
import { SupportAgentChat } from "./SupportAgentChat";
import "./ReportProblemSheet.css";

type PostReportTab = "agent" | "chat";

export interface ReportProblemSheetProps {
  open: boolean;
  onClose: () => void;
  /** Injectable online flag for tests; defaults to `navigator.onLine`. */
  online?: boolean;
  /** Injectable create call for tests. */
  createIncidentFn?: (
    input: CreateIncidentInput,
  ) => Promise<CreateIncidentResult>;
  /** Optional pre-seeded client errors (otherwise empty until a ring buffer lands). */
  lastClientErrors?: readonly IncidentClientError[];
}

function formatErrorAt(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return date.toLocaleString(undefined, {
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

function useOnlineStatus(override?: boolean): boolean {
  const isControlled = typeof override === "boolean";
  const [online, setOnline] = useState(
    () =>
      isControlled
        ? override
        : typeof navigator === "undefined"
          ? true
          : navigator.onLine,
  );

  useEffect(() => {
    if (isControlled) {
      return;
    }
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [isControlled]);

  return isControlled ? override : online;
}

export function ReportProblemSheet({
  open,
  onClose,
  online: onlineOverride,
  createIncidentFn = createIncident,
  lastClientErrors = [],
}: ReportProblemSheetProps) {
  const handleClose = () => {
    onClose();
  };

  return (
    <MotionSheet
      open={open}
      onClose={handleClose}
      ariaLabel="Report problem"
      sheetClassName="mx-auto max-w-lg jl-report-host"
      maxHeightClassName="max-h-[min(85dvh,760px)]"
    >
      {open ? (
        <ReportProblemSheetContent
          onlineOverride={onlineOverride}
          createIncidentFn={createIncidentFn}
          lastClientErrors={lastClientErrors}
          onClose={handleClose}
        />
      ) : null}
    </MotionSheet>
  );
}

function ReportProblemSheetContent({
  onlineOverride,
  createIncidentFn,
  lastClientErrors,
  onClose,
}: {
  onlineOverride?: boolean;
  createIncidentFn: (
    input: CreateIncidentInput,
  ) => Promise<CreateIncidentResult>;
  lastClientErrors: readonly IncidentClientError[];
  onClose: () => void;
}) {
  const location = useLocation();
  const noteId = useId();
  const online = useOnlineStatus(onlineOverride);
  const session = useSessionStore((state) => state.session);
  const myRole = useSessionStore((state) => state.myRole);
  const myUid = useSessionStore((state) => state.myUid);

  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [incidentId, setIncidentId] = useState<string | null>(null);
  const [postReportTab, setPostReportTab] = useState<PostReportTab>("agent");

  const diagnosticsPreview = useMemo(() => {
    const uid =
      myUid ??
      (isFirebaseConfigured() ? getFirebaseAuth().currentUser?.uid : null) ??
      null;
    return collectIncidentDiagnostics({
      appVersion: APP_VERSION,
      route: location.pathname,
      sessionId: session?.id ?? null,
      sessionCode: session?.code ?? null,
      playerRole: myRole,
      uid,
      userAgent: typeof navigator === "undefined" ? "" : navigator.userAgent,
      platform: Capacitor.isNativePlatform() ? "capacitor" : "web",
      online,
      visibilityState:
        typeof document === "undefined" ? "visible" : document.visibilityState,
      lastClientErrors,
    });
  }, [
    lastClientErrors,
    location.pathname,
    myRole,
    myUid,
    online,
    session?.code,
    session?.id,
  ]);

  const lastError = diagnosticsPreview.lastClientErrors.at(-1) ?? null;
  const sessionCode = diagnosticsPreview.sessionCode;
  const noteLength = note.length;
  const canSubmit = online && !submitting && noteLength <= INCIDENT_NOTE_MAX_LENGTH;

  const handleSubmit = async () => {
    if (!canSubmit) {
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      const result = await createIncidentFn({
        diagnostics: diagnosticsPreview,
        playerNote: note.trim() || null,
        reporterRole: myRole,
      });
      setIncidentId(result.incidentId);
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Could not submit the report.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    onClose();
  };

  if (incidentId) {
    return (
      <div className="jl-report-sheet jl-report-post" data-testid="report-post">
        <div
          className="jl-report-post-tabs"
          role="tablist"
          aria-label="After report"
        >
          {(
            [
              ["agent", "Fix agent"],
              ["chat", "Support chat"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={postReportTab === id}
              className={`jl-report-post-tab${
                postReportTab === id ? " jl-report-post-tab--active" : ""
              }`}
              onClick={() => setPostReportTab(id)}
            >
              {label}
            </button>
          ))}
        </div>
        {postReportTab === "agent" ? (
          <SupportAgentChat incidentId={incidentId} onClose={handleClose} />
        ) : (
          <IncidentChatPanel incidentId={incidentId} onClose={handleClose} />
        )}
      </div>
    );
  }

  return (
    <div className="jl-report-sheet">
      <SheetHeader
            title="REPORT PROBLEM"
            onClose={handleClose}
            titleSize="xl"
            flush
            closeLabel="Close"
          />
          <p className="jl-report-helper">
            Help us resolve this quickly. Optional details below.
          </p>

          <div>
            <label htmlFor={noteId} className="jl-report-section-label">
              Note (optional)
            </label>
            <div className="jl-report-note-wrap">
              <textarea
                id={noteId}
                value={note}
                maxLength={INCIDENT_NOTE_MAX_LENGTH}
                onChange={(event) =>
                  setNote(event.target.value.slice(0, INCIDENT_NOTE_MAX_LENGTH))
                }
                className="field-input jl-report-note"
                placeholder="What happened?"
                aria-describedby={`${noteId}-count`}
              />
              <span
                id={`${noteId}-count`}
                className="jl-report-note-count"
                aria-live="polite"
              >
                {noteLength}/{INCIDENT_NOTE_MAX_LENGTH}
              </span>
            </div>
          </div>

          <div>
            <p className="jl-report-section-label">Session code</p>
            <div className="jl-report-session-stamp">
              <span className="jl-report-session-glyph" aria-hidden="true">
                !
              </span>
              <span
                className={
                  sessionCode
                    ? "jl-report-session-code"
                    : "jl-report-session-code jl-report-session-empty"
                }
              >
                {sessionCode ?? "No active session"}
              </span>
            </div>
          </div>

          <div>
            <p className="jl-report-section-label">Diagnostics summary</p>
            <div className="jl-report-diagnostics" role="list">
              <div className="jl-report-diagnostics-row" role="listitem">
                <span className="jl-report-diagnostics-icon" aria-hidden="true">
                  ◎
                </span>
                <span className="jl-report-diagnostics-label">Route</span>
                <span className="jl-report-diagnostics-value">
                  {diagnosticsPreview.route}
                </span>
              </div>
              <div className="jl-report-diagnostics-row" role="listitem">
                <span className="jl-report-diagnostics-icon" aria-hidden="true">
                  ▣
                </span>
                <span className="jl-report-diagnostics-label">App version</span>
                <span className="jl-report-diagnostics-value">
                  {diagnosticsPreview.appVersion}
                </span>
              </div>
              <div className="jl-report-diagnostics-row" role="listitem">
                <span className="jl-report-diagnostics-icon" aria-hidden="true">
                  ⚠
                </span>
                <span className="jl-report-diagnostics-label">Last error</span>
                <span className="jl-report-diagnostics-value">
                  {lastError ? lastError.name : "—"}
                  {lastError ? (
                    <span className="jl-report-diagnostics-sub">
                      {formatErrorAt(lastError.at)}
                    </span>
                  ) : null}
                </span>
              </div>
            </div>
          </div>

          {submitError ? (
            <p className="jl-report-error" role="alert">
              {submitError}
            </p>
          ) : null}
          {!online ? (
            <p className="jl-report-offline">
              You&apos;re offline. Reconnect to send a report.
            </p>
          ) : null}

          <div className="jl-report-actions">
            <button
              type="button"
              className="btn-primary min-h-12 w-full"
              disabled={!canSubmit}
              onClick={() => void handleSubmit()}
            >
              {submitting ? "Sending…" : "Send report"}
            </button>
            <button
              type="button"
              className="jl-report-cancel"
              onClick={handleClose}
            >
              Cancel
            </button>
          </div>
        </div>
  );
}
