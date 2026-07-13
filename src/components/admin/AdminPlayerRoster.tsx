import { formatFreshnessAge } from "../../domain/admin/formatAdminFreshness";
import type { PlayerLocationRecord } from "../../domain/session/sessionChat";
import type { SessionRecord } from "../../domain/map/annotations";
import type { PlayerRole } from "../../domain/session/playerRole";

interface AdminPlayerRosterProps {
  session: SessionRecord | null;
  locations: readonly PlayerLocationRecord[];
  onFocusPlayer?: (uid: string) => void;
}

function resolveRoleLabel(
  uid: string,
  session: SessionRecord,
  location?: PlayerLocationRecord,
): string {
  const memberRole = session.memberRoles?.[uid] as PlayerRole | undefined;
  if (memberRole) {
    return memberRole;
  }

  return location?.role ?? "player";
}

export function AdminPlayerRoster({
  session,
  locations,
  onFocusPlayer,
}: AdminPlayerRosterProps) {
  if (!session) {
    return null;
  }

  const memberUids = session.memberUids ?? [];
  const locationByUid = new Map(locations.map((location) => [location.uid, location]));
  const rosterUids = [...new Set([...memberUids, ...locations.map((l) => l.uid)])];

  if (rosterUids.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-surface-panel/80 px-3 py-2 text-sm text-ink-muted">
        No players in this session yet.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface-panel/90">
      <table className="w-full text-left text-xs">
        <thead className="border-b border-border bg-surface-raised/70 text-ink-muted">
          <tr>
            <th className="px-2 py-1.5 font-semibold uppercase tracking-wide">Role</th>
            <th className="px-2 py-1.5 font-semibold uppercase tracking-wide">Player</th>
            <th className="px-2 py-1.5 font-semibold uppercase tracking-wide">Location</th>
          </tr>
        </thead>
        <tbody>
          {rosterUids.map((uid) => {
            const location = locationByUid.get(uid);
            const role = resolveRoleLabel(uid, session, location);
            const shortUid = uid.length > 10 ? `${uid.slice(0, 8)}…` : uid;

            return (
              <tr key={uid} className="border-b border-border/60 last:border-b-0">
                <td className="px-2 py-1.5 capitalize text-ink">{role}</td>
                <td className="px-2 py-1.5 font-mono text-ink">{shortUid}</td>
                <td className="px-2 py-1.5">
                  <button
                    type="button"
                    className="text-brand-blue underline-offset-2 hover:underline"
                    onClick={() => onFocusPlayer?.(uid)}
                  >
                    {formatFreshnessAge(location?.updatedAt ?? null)}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
