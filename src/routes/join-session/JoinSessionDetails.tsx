import { Box, Text } from "@mantine/core";
import { InsetGroup } from "@/components/ui/entry/entryChrome";
import type { SessionRecord } from "@/domain/map/annotations";
import { isCastleSiegeSession } from "@/domain/session/castleSiege/mode";
import { playerRoleLabel } from "@/domain/session/players/playerRole";

function countRoles(session: SessionRecord): string {
  if (isCastleSiegeSession(session)) {
    const seats = session.castleSiegeRoles ?? {};
    const counts = { teamA: 0, teamB: 0, referee: 0, observer: 0 };
    for (const seat of Object.values(seats)) {
      if (seat in counts) {
        counts[seat as keyof typeof counts] += 1;
      }
    }
    return `A ${counts.teamA} · B ${counts.teamB} · Ref ${counts.referee} · Obs ${counts.observer}`;
  }

  const roles = session.memberRoles ?? {};
  const counts = { seeker: 0, hider: 0, observer: 0, admin: 0 };
  for (const role of Object.values(roles)) {
    if (role in counts) {
      counts[role as keyof typeof counts] += 1;
    }
  }
  return `${playerRoleLabel("seeker")} ${counts.seeker} · ${playerRoleLabel("hider")} ${counts.hider} · ${playerRoleLabel("observer")} ${counts.observer}`;
}

export function JoinSessionDetails({
  session,
  premium,
}: {
  session: SessionRecord;
  premium: boolean;
}) {
  const castleSiege = isCastleSiegeSession(session);
  const location =
    typeof session.gameAreaLabel === "string" && session.gameAreaLabel.trim()
      ? session.gameAreaLabel.trim()
      : "Play area set";
  const size = session.gameSize ?? "medium";

  return (
    <InsetGroup>
      <Box px="md" py="md">
        <Text fw={590} c="var(--color-field-ink)">
          {castleSiege ? "Castle Siege" : "Classic Jet Lag"}
        </Text>
        {castleSiege && session.seriesLength ? (
          <Text size="sm" c="var(--color-field-ink-muted)" mt={6}>
            Best of {session.seriesLength}
          </Text>
        ) : null}
        {premium ? (
          <Text size="sm" c="var(--color-signal)" mt={6}>
            Premium · live transit
          </Text>
        ) : null}
        <Text size="sm" c="var(--color-field-ink-muted)" mt={10}>
          Location: {location}
        </Text>
        <Text size="sm" c="var(--color-field-ink-muted)" mt={4}>
          Size: {size}
        </Text>
        <Text size="sm" c="var(--color-field-ink-muted)" mt={4}>
          Players in: {countRoles(session)}
        </Text>
      </Box>
    </InsetGroup>
  );
}
