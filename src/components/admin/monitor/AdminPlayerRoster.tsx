import { ScrollArea, Table, Text, UnstyledButton } from "@mantine/core";
import { useAdminMonitorFocus } from "../../../domain/admin/adminMonitorFocus";
import { formatFreshnessAge } from "../../../domain/admin/formatAdminFreshness";
import type { SessionRecord } from "../../../domain/map/annotations";
import type { PlayerLocationRecord } from "../../../domain/session/activity/sessionChat";
import { playerRoleLabel, resolvePlayerRole } from "../../../domain/session/players/playerRole";
import { useFreshnessClock } from "../../../hooks/time/useFreshnessClock";
import { reversedInk } from "../../../theme/adminTone";

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
      <Text size="sm" c="dimmed" px="sm" pb="sm">
        No runners yet. They appear here when players join the session.
      </Text>
    );
  }

  return (
    <ScrollArea.Autosize mah="16rem">
      <Table>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Runner</Table.Th>
            <Table.Th>Role</Table.Th>
            <Table.Th ta="end">Last fix</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {uids.map((uid) => {
            const shortUid = uid.length > 10 ? `${uid.slice(0, 8)}…` : uid;
            const role = playerRoleLabel(resolvePlayerRole(session.memberRoles, uid));
            const selected = focusedPlayerUid === uid;
            const cellStyle = selected ? reversedInk : undefined;
            return (
              // The runner button is the keyboard stop; the row widens the pointer target.
              <Table.Tr
                key={uid}
                bg={selected ? "var(--adm-ink)" : undefined}
                style={{ cursor: "pointer" }}
                onClick={() => setFocusedPlayerUid(uid)}
              >
                <Table.Td style={cellStyle}>
                  <UnstyledButton
                    w="100%"
                    h="var(--adm-cell)"
                    fw={700}
                    title={uid}
                    aria-label={`Follow ${shortUid}`}
                    aria-pressed={selected}
                  >
                    {shortUid}
                  </UnstyledButton>
                </Table.Td>
                <Table.Td style={cellStyle}>{role}</Table.Td>
                <Table.Td ta="end" style={cellStyle}>
                  {formatFreshnessAge(locationByUid.get(uid)?.updatedAt ?? null, nowMs)}
                </Table.Td>
              </Table.Tr>
            );
          })}
        </Table.Tbody>
      </Table>
    </ScrollArea.Autosize>
  );
}
