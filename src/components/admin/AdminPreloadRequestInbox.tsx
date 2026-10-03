import { Alert, Button, Checkbox, Group, Stack, UnstyledButton } from "@mantine/core";
import { useEffect, useMemo, useRef, useState } from "react";
import { formatFreshnessAge } from "../../domain/admin/formatAdminFreshness";
import { canTransitionPreloadRequestStatus } from "../../domain/preloadRequest/preloadRequestAdmin";
import type {
  PreloadRequest,
  PreloadRequestStatus,
} from "../../domain/preloadRequest/preloadRequestTypes";
import { useAdminAccessState } from "../../hooks/admin/useAdminAccessState";
import {
  countOpenPreloadRequests,
  preloadRequestStatusChipLabel,
  preloadRequestStatusChipTone,
  subscribePreloadRequestList,
} from "../../services/admin/adminPreloadRequests";
import { updatePreloadRequestStatus } from "../../services/preloadRequest/preloadRequestApi";
import { AppLink } from "../navigation/AppLink";
import { InlineError } from "../ui/banners/InlineError";
import "./AdminIncidentDesk.css";

const CLOSED = new Set<PreloadRequestStatus>(["declined", "shipped"]);
const EMPTY_REQUESTS: PreloadRequest[] = [];

const ACTION_STATUSES: readonly PreloadRequestStatus[] = [
  "accepted",
  "declined",
  "shipped",
  "open",
];

export function AdminPreloadRequestInbox() {
  const { state: accessState } = useAdminAccessState();
  const accessLoading = accessState === "loading";
  const enabled = accessState === "admin";
  const [requests, setRequests] = useState<PreloadRequest[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showClosed, setShowClosed] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const busyRef = useRef(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [enabledState, setEnabledState] = useState(enabled);

  if (enabled !== enabledState) {
    setEnabledState(enabled);
    if (enabled) {
      setListLoading(true);
      setListError(null);
    }
  }

  useEffect(() => {
    if (!enabled) {
      return;
    }

    return subscribePreloadRequestList(
      (next) => {
        setRequests(next);
        setListLoading(false);
      },
      (error) => {
        setListError(error.message);
        setListLoading(false);
      },
    );
  }, [enabled]);

  const visibleRequests = enabled ? requests : EMPTY_REQUESTS;
  const openCount = countOpenPreloadRequests(visibleRequests);
  const visible = useMemo(
    () =>
      showClosed
        ? visibleRequests
        : visibleRequests.filter((request) => !CLOSED.has(request.status)),
    [visibleRequests, showClosed],
  );

  const selected =
    visible.find((row) => row.id === selectedId) ??
    visibleRequests.find((row) => row.id === selectedId) ??
    null;

  const onStatus = async (requestId: string, status: PreloadRequestStatus) => {
    if (busyRef.current) {
      return;
    }
    busyRef.current = true;
    setBusyId(requestId);
    setActionError(null);
    try {
      await updatePreloadRequestStatus(requestId, status);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Could not update status.");
    } finally {
      busyRef.current = false;
      setBusyId(null);
    }
  };

  if (accessLoading) {
    return (
      <Stack className="jl-incident-desk" gap="md" p="md" data-testid="admin-preload-inbox">
        <Alert title="Checking admin access…">Please wait.</Alert>
      </Stack>
    );
  }

  if (!enabled) {
    return (
      <Stack className="jl-incident-desk" gap="md" p="md" data-testid="admin-preload-inbox">
        <Alert color="red" title="Admin access required">
          Sign in with an admin account to manage preload requests.
        </Alert>
        <Button component={AppLink} to="/" variant="default">
          Back home
        </Button>
      </Stack>
    );
  }

  return (
    <div className="jl-incident-desk" data-testid="admin-preload-inbox">
      <header className="jl-incident-topbar">
        <div className="jl-incident-brand">
          <AppLink to="/admin" className="jl-incident-brand-mark">
            Jetlag
          </AppLink>
          <span className="jl-incident-brand-title">Preload request inbox</span>
        </div>
        <dl className="jl-incident-top-stats">
          <div className="jl-incident-stat">
            <dt>Open</dt>
            <dd>{openCount}</dd>
          </div>
        </dl>
        <Button component={AppLink} to="/admin" variant="default" size="compact-sm">
          Ops desk
        </Button>
      </header>

      <div className="jl-incident-panes">
        <section className="jl-incident-queue" aria-label="Preload request queue">
          <div className="jl-incident-pane-header">
            <h2 className="jl-incident-pane-title">Requests</h2>
            <span className="jl-incident-pane-meta">{openCount} open</span>
          </div>

          <Checkbox
            className="jl-incident-queue-filter"
            label="Show closed"
            checked={showClosed}
            onChange={(event) => setShowClosed(event.currentTarget.checked)}
          />

          {listError && enabled ? <InlineError>{listError}</InlineError> : null}
          {enabled && listLoading ? (
            <p className="jl-incident-empty">Loading…</p>
          ) : visible.length === 0 ? (
            <p className="jl-incident-empty">No preload requests.</p>
          ) : (
            <ul className="jl-incident-queue-list">
              {visible.map((request) => {
                const tone = preloadRequestStatusChipTone(request.status);
                const selectedRow = request.id === selectedId;
                return (
                  <li key={request.id}>
                    <UnstyledButton
                      type="button"
                      aria-current={selectedRow ? "true" : undefined}
                      className={
                        selectedRow ? "jl-incident-queue-row is-selected" : "jl-incident-queue-row"
                      }
                      onClick={() => setSelectedId(request.id)}
                      style={{ display: "block", width: "100%", textAlign: "left" }}
                    >
                      <span className="jl-incident-queue-id">
                        {request.id.slice(0, 10).toUpperCase()}
                      </span>
                      <span className="jl-incident-queue-title">{request.presetSnapshot.name}</span>
                      <span className={`jl-incident-status-chip tone-${tone}`} data-tone={tone}>
                        {preloadRequestStatusChipLabel(request.status)}
                      </span>
                      <span className="jl-incident-queue-age">
                        {formatFreshnessAge(request.updatedAt)}
                      </span>
                    </UnstyledButton>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="jl-incident-detail" aria-label="Preload request detail">
          {!selected ? (
            <p className="jl-incident-empty">Select a request.</p>
          ) : (
            <>
              <div className="jl-incident-pane-header">
                <h2 className="jl-incident-pane-title">{selected.presetSnapshot.name}</h2>
                <span
                  className={`jl-incident-status-chip tone-${preloadRequestStatusChipTone(selected.status)}`}
                >
                  {preloadRequestStatusChipLabel(selected.status)}
                </span>
              </div>

              <dl className="jl-incident-detail-fields">
                <div>
                  <dt>Place</dt>
                  <dd>{selected.presetSnapshot.placeLabel ?? "-"}</dd>
                </div>
                <div>
                  <dt>Size / units</dt>
                  <dd>
                    {selected.presetSnapshot.gameSize} · {selected.presetSnapshot.distanceUnit}
                  </dd>
                </div>
                <div>
                  <dt>Region pack</dt>
                  <dd>{selected.presetSnapshot.regionPackId ?? "-"}</dd>
                </div>
                <div>
                  <dt>Preset id</dt>
                  <dd>{selected.presetSnapshot.presetId ?? "-"}</dd>
                </div>
                <div>
                  <dt>Game area bytes</dt>
                  <dd>{selected.presetSnapshot.gameAreaBytes ?? "-"}</dd>
                </div>
                <div>
                  <dt>Reporter</dt>
                  <dd>
                    <code>{selected.reporterUid}</code>
                  </dd>
                </div>
                <div>
                  <dt>Note</dt>
                  <dd>{selected.note?.trim() || "-"}</dd>
                </div>
                <div>
                  <dt>Email</dt>
                  <dd>
                    {selected.email?.messageId
                      ? `sent (${selected.email.messageId})`
                      : selected.email?.error
                        ? `failed: ${selected.email.error}`
                        : "-"}
                  </dd>
                </div>
                {selected.presetSnapshot.focusBounds ? (
                  <div>
                    <dt>Focus bounds</dt>
                    <dd>
                      <code>{JSON.stringify(selected.presetSnapshot.focusBounds)}</code>
                    </dd>
                  </div>
                ) : null}
              </dl>

              {actionError ? <InlineError>{actionError}</InlineError> : null}

              <Group className="jl-incident-actions" gap="xs" wrap="wrap">
                {ACTION_STATUSES.filter((status) =>
                  canTransitionPreloadRequestStatus(selected.status, status),
                ).map((status) => (
                  <Button
                    key={status}
                    type="button"
                    variant="default"
                    size="compact-sm"
                    disabled={busyId !== null}
                    onClick={() => void onStatus(selected.id, status)}
                  >
                    Mark {status}
                  </Button>
                ))}
              </Group>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
