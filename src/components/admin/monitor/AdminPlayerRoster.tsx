import { Box, ScrollArea, Text, UnstyledButton, VisuallyHidden } from "@mantine/core";
import { useAdminMonitorFocus } from "../../../domain/admin/adminMonitorFocus";
import { formatFreshnessAge } from "../../../domain/admin/formatAdminFreshness";
import type { SessionRecord } from "../../../domain/map/annotations";
import type { PlayerLocationRecord } from "../../../domain/session/activity/sessionChat";
import { playerRoleLabel, resolvePlayerRole } from "../../../domain/session/players/playerRole";
import { useFreshnessClock } from "../../../hooks/time/useFreshnessClock";
import { DESK_HAIRLINE } from "../shared/adminSurface";

interface AdminPlayerRosterProps {
  session: SessionRecord | null;
  locations: readonly PlayerLocationRecord[];
}

/** Members plus anyone reporting a location (a fix can land before membership syncs). */
export function rosterUids(
  session: SessionRecord,
  locations: readonly PlayerLocationRecord[],
): string[] {
  return [...new Set([...(session.memberUids ?? []), ...locations.map((l) => l.uid)])];
}

export function AdminPlayerRoster({ session, locations }: AdminPlayerRosterProps) {
  const nowMs = useFreshnessClock();
  const focusedPlayerUid = useAdminMonitorFocus((state) => state.focusedPlayerUid);
  const setFocusedPlayerUid = useAdminMonitorFocus((state) => state.setFocusedPlayerUid);

  if (!session) {
    return null;
  }

  const locationByUid = new Map(locations.map((location) => [location.uid, location]));
  const uids = rosterUids(session, locations);

  if (uids.length === 0) {
    return (
      <Text size="sm" c="var(--color-ink-muted)" px={16} pb="sm">
        No players yet. They appear here when players join the session.
      </Text>
    );
  }

  return (
    <ScrollArea.Autosize mah="14rem">
      <Box
        component="table"
        style={{
          width: "100%",
          borderCollapse: "collapse",
          fontSize: 14,
          color: "var(--color-ink-muted)",
        }}
      >
        <VisuallyHidden component="thead">
          <tr>
            <th scope="col">Player</th>
            <th scope="col">Role</th>
            <th scope="col">Last fix</th>
          </tr>
        </VisuallyHidden>
        <tbody>
          {uids.map((uid) => {
            const shortUid = uid.length > 10 ? `${uid.slice(0, 8)}…` : uid;
            const role = playerRoleLabel(resolvePlayerRole(session.memberRoles, uid));
            const selected = focusedPlayerUid === uid;
            const cell = {
              padding: "0 16px",
              borderTop: DESK_HAIRLINE,
              background: selected ? "var(--color-flag-soft)" : undefined,
            } as const;
            return (
              <Box
                component="tr"
                key={uid}
                style={{ cursor: "pointer" }}
                onClick={() => setFocusedPlayerUid(uid)}
              >
                <Box
                  component="td"
                  style={{
                    ...cell,
                    boxShadow: selected ? "inset 3px 0 0 var(--color-flag)" : undefined,
                  }}
                >
                  <UnstyledButton
                    h={38}
                    fw={600}
                    c="var(--color-ink)"
                    title={uid}
                    aria-label={`Follow ${shortUid}`}
                    aria-pressed={selected}
                  >
                    {shortUid}
                  </UnstyledButton>
                </Box>
                <Box component="td" style={cell}>
                  {role}
                </Box>
                <Box component="td" style={{ ...cell, textAlign: "right" }}>
                  {formatFreshnessAge(locationByUid.get(uid)?.updatedAt ?? null, nowMs)}
                </Box>
              </Box>
            );
          })}
        </tbody>
      </Box>
    </ScrollArea.Autosize>
  );
}
