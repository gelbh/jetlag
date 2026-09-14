import { Capacitor } from "@capacitor/core";
import { Box, Button, Drawer, Stack, Text, Textarea } from "@mantine/core";
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
import {
  IosDrawerGrabber,
  IosErrorCallout,
  IosInsetGroup,
  IosSectionLabel,
} from "../ui/apple/iosEntryChrome";
import {
  iosBottomDrawerStyles,
  iosFilledStyles,
  iosPlainStyles,
} from "../ui/apple/iosEntryStyles";
import { SheetHost } from "../ui/sheets/SheetHost";
import { SheetHeader } from "../ui/sheets/SheetHeader";
import { IncidentChatPanel } from "./IncidentChatPanel";
import { SupportAgentChat } from "./SupportAgentChat";
import "./ReportProblemSheet.css";

type PostReportTab = "agent" | "chat";
type ReportChrome = "legacy" | "ios";

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
  /** `ios` = Friends-style full-width Mantine Drawer; default keeps map/legacy SheetHost. */
  chrome?: ReportChrome;
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
  chrome = "legacy",
}: ReportProblemSheetProps) {
  const handleClose = () => {
    onClose();
  };

  if (chrome === "ios") {
    return (
      <Drawer
        opened={open}
        onClose={handleClose}
        position="bottom"
        size="auto"
        padding="md"
        radius={24}
        title={null}
        withCloseButton={false}
        overlayProps={{ backgroundOpacity: 0.4, blur: 3 }}
        styles={iosBottomDrawerStyles("min(85dvh, 40rem)")}
        aria-label="Report problem"
      >
        {open ? (
          <ReportProblemSheetContent
            chrome="ios"
            onlineOverride={onlineOverride}
            createIncidentFn={createIncidentFn}
            lastClientErrors={lastClientErrors}
            onClose={handleClose}
          />
        ) : null}
      </Drawer>
    );
  }

  return (
    <SheetHost
      open={open}
      onClose={handleClose}
      ariaLabel="Report problem"
      sheetClassName="mx-auto max-w-lg jl-report-host"
      maxHeightClassName="max-h-[min(85dvh,760px)]"
    >
      {open ? (
        <ReportProblemSheetContent
          chrome="legacy"
          onlineOverride={onlineOverride}
          createIncidentFn={createIncidentFn}
          lastClientErrors={lastClientErrors}
          onClose={handleClose}
        />
      ) : null}
    </SheetHost>
  );
}

function ReportProblemSheetContent({
  chrome,
  onlineOverride,
  createIncidentFn,
  lastClientErrors,
  onClose,
}: {
  chrome: ReportChrome;
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
    const postBody = (
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

    if (chrome === "ios") {
      return (
        <Stack gap="md">
          <IosDrawerGrabber />
          {postBody}
        </Stack>
      );
    }
    return postBody;
  }

  if (chrome === "ios") {
    return (
      <Stack gap="md">
        <IosDrawerGrabber />
        <Stack gap={6} align="center">
          <Text
            component="h2"
            fw={600}
            c="var(--color-field-ink)"
            style={{ fontSize: "1.25rem", letterSpacing: "-0.02em" }}
          >
            Report a problem
          </Text>
          <Text
            size="sm"
            c="var(--color-field-ink-muted)"
            ta="center"
            style={{ lineHeight: 1.4, textWrap: "pretty" }}
          >
            Help us resolve this quickly. Optional details below.
          </Text>
        </Stack>

        <Stack gap={8}>
          <IosSectionLabel>Note (optional)</IosSectionLabel>
          <IosInsetGroup>
            <Box px="sm" pt="sm" pb="xs" style={{ position: "relative" }}>
              <Textarea
                id={noteId}
                value={note}
                maxLength={INCIDENT_NOTE_MAX_LENGTH}
                onChange={(event) =>
                  setNote(event.currentTarget.value.slice(0, INCIDENT_NOTE_MAX_LENGTH))
                }
                placeholder="What happened?"
                minRows={4}
                aria-describedby={`${noteId}-count`}
                styles={{
                  input: {
                    border: "none",
                    backgroundColor: "transparent",
                    color: "var(--color-field-ink)",
                    fontSize: "1rem",
                    paddingBottom: "1.5rem",
                  },
                }}
              />
              <Text
                id={`${noteId}-count`}
                size="xs"
                c="var(--color-field-ink-muted)"
                aria-live="polite"
                style={{
                  position: "absolute",
                  right: 12,
                  bottom: 10,
                  fontVariantNumeric: "tabular-nums",
                  pointerEvents: "none",
                }}
              >
                {noteLength}/{INCIDENT_NOTE_MAX_LENGTH}
              </Text>
            </Box>
          </IosInsetGroup>
        </Stack>

        <Stack gap={8}>
          <IosSectionLabel>Session code</IosSectionLabel>
          <IosInsetGroup>
            <Box px="md" py="sm">
              <Text
                fw={sessionCode ? 700 : 500}
                c={
                  sessionCode
                    ? "var(--color-field-ink)"
                    : "var(--color-field-ink-muted)"
                }
                style={{
                  fontFamily: sessionCode ? "var(--font-mono)" : undefined,
                  letterSpacing: sessionCode ? "0.06em" : undefined,
                }}
              >
                {sessionCode ?? "No active session"}
              </Text>
            </Box>
          </IosInsetGroup>
        </Stack>

        <Stack gap={8}>
          <IosSectionLabel>Diagnostics</IosSectionLabel>
          <IosInsetGroup>
            <Box role="list">
            {(
              [
                ["Route", diagnosticsPreview.route],
                ["App version", diagnosticsPreview.appVersion],
                [
                  "Last error",
                  lastError ? lastError.name : "None",
                  lastError ? formatErrorAt(lastError.at) : null,
                ],
              ] as const
            ).map(([label, value, sub], index) => (
              <Box
                key={label}
                role="listitem"
                px="md"
                py="sm"
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12,
                  borderTop:
                    index === 0
                      ? undefined
                      : "0.33px solid oklch(from var(--color-field-ink) l c h / 0.12)",
                }}
              >
                <Text size="sm" c="var(--color-field-ink-muted)">
                  {label}
                </Text>
                <Box style={{ textAlign: "right", minWidth: 0 }}>
                  <Text
                    size="sm"
                    fw={600}
                    c="var(--color-field-ink)"
                    style={{ overflowWrap: "anywhere" }}
                  >
                    {value}
                  </Text>
                  {sub ? (
                    <Text size="xs" c="var(--color-field-ink-muted)">
                      {sub}
                    </Text>
                  ) : null}
                </Box>
              </Box>
            ))}
            </Box>
          </IosInsetGroup>
        </Stack>

        <IosErrorCallout>{submitError}</IosErrorCallout>
        {!online ? (
          <Text size="sm" c="var(--color-field-ink-muted)" px={4}>
            You&apos;re offline. Reconnect to send a report.
          </Text>
        ) : null}

        <Stack gap={8}>
          <Button
            fullWidth
            loading={submitting}
            disabled={!canSubmit}
            onClick={() => void handleSubmit()}
            styles={iosFilledStyles}
          >
            Send report
          </Button>
          <Button fullWidth variant="subtle" onClick={handleClose} styles={iosPlainStyles}>
            Cancel
          </Button>
        </Stack>
      </Stack>
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
              {lastError ? lastError.name : "-"}
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
