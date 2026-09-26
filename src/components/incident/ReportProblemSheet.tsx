import { Capacitor } from "@capacitor/core";
import { Box, Button, Stack, Text, Textarea } from "@mantine/core";
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
  ErrorCallout,
  InsetGroup,
  SectionLabel,
  filledStyles,
  plainStyles,
} from "../ui/entry/entryChrome";
import { SheetHost } from "../ui/sheets/SheetHost";
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
  lastClientErrors?: readonly IncidentClientError[];}

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
  return (
    <SheetHost
      open={open}
      onClose={onClose}
      ariaLabel="Report problem"
      maxHeightClassName="max-h-[min(85dvh,40rem)]"
    >
      {open ? (
        <ReportProblemSheetContent
          onlineOverride={onlineOverride}
          createIncidentFn={createIncidentFn}
          lastClientErrors={lastClientErrors}
          onClose={onClose}
        />
      ) : null}
    </SheetHost>
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
          <SupportAgentChat incidentId={incidentId} onClose={onClose} />
        ) : (
          <IncidentChatPanel incidentId={incidentId} onClose={onClose} />
        )}
      </div>
    );
  }

  return (
    <Stack gap="md">
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
        <SectionLabel>Note (optional)</SectionLabel>
        <InsetGroup>
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
        </InsetGroup>
      </Stack>

      <Stack gap={8}>
        <SectionLabel>Session code</SectionLabel>
        <InsetGroup>
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
        </InsetGroup>
      </Stack>

      <Stack gap={8}>
        <SectionLabel>Diagnostics</SectionLabel>
        <InsetGroup>
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
        </InsetGroup>
      </Stack>

      <ErrorCallout>{submitError}</ErrorCallout>
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
          styles={filledStyles}
        >
          Send report
        </Button>
        <Button fullWidth variant="subtle" onClick={onClose} styles={plainStyles}>
          Cancel
        </Button>
      </Stack>
    </Stack>
  );
}
