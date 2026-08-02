import { useState } from "react";
import type { SessionRecord } from "../../../domain/map/annotations";
import { isSessionRoleGated } from "../../../domain/session/players/roleGates";
import { playerRoleLabel } from "../../../domain/session/players/playerRole";
import { useCopyFeedback } from "../../../hooks/forms/useCopyFeedback";
import {
  regenerateRolePasscode,
  revealRolePasscode,
} from "../../../services/session/rolePasscodeLifecycle";

type RevealRole = "seeker" | "hider" | "observer";

function rolePasscodeLabel(role: RevealRole): string {
  if (role === "observer") {
    return "Observer code";
  }

  return `${playerRoleLabel(role)} code`;
}

export interface RolePasscodeSettingsProps {
  session: SessionRecord;
  myUid: string;
  isHost: boolean;
}

export function RolePasscodeSettings({
  session,
  myUid,
  isHost,
}: RolePasscodeSettingsProps) {
  const [busyRole, setBusyRole] = useState<RevealRole | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { status: copyStatus, copy } = useCopyFeedback();

  if (!isSessionRoleGated(session)) {
    return null;
  }

  const myRole = session.memberRoles?.[myUid];
  const rows: RevealRole[] = [];

  if (isHost) {
    rows.push("observer");
  }

  if (
    (myRole === "seeker" || myRole === "hider") &&
    session.roleGates?.leaders?.[myRole] === myUid
  ) {
    rows.push(myRole);
  }

  if (rows.length === 0) {
    return null;
  }

  const handleCopy = async (role: RevealRole) => {
    setBusyRole(role);
    setError(null);
    try {
      const result = await revealRolePasscode(session.id, role);
      await copy(result.rolePasscode);
    } catch {
      setError("Couldn't load that role code. Try again.");
    } finally {
      setBusyRole(null);
    }
  };

  const handleRegenerate = async (role: RevealRole) => {
    if (
      !window.confirm(
        `Generate a new ${rolePasscodeLabel(role).toLowerCase()}? The old code stops working.`,
      )
    ) {
      return;
    }

    setBusyRole(role);
    setError(null);
    try {
      const result = await regenerateRolePasscode(session.id, role);
      await copy(result.rolePasscode);
    } catch {
      setError("Couldn't regenerate that role code. Try again.");
    } finally {
      setBusyRole(null);
    }
  };

  return (
    <div className="space-y-2 border-t-2 border-border pt-4">
      <p className="font-display text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">
        Role codes
      </p>
      {rows.map((role) => (
        <div key={role} className="flex gap-2">
          <button
            type="button"
            disabled={busyRole === role}
            onClick={() => void handleCopy(role)}
            className="btn-secondary min-h-11 flex-1"
          >
            {busyRole === role ? "Loading…" : `Copy ${rolePasscodeLabel(role).toLowerCase()}`}
          </button>
          <button
            type="button"
            disabled={busyRole === role}
            onClick={() => void handleRegenerate(role)}
            className="btn-secondary min-h-11 flex-1"
          >
            Regenerate
          </button>
        </div>
      ))}
      {copyStatus === "copied" ? (
        <p className="text-xs text-ink-muted">Copied to clipboard.</p>
      ) : null}
      {error ? <p className="text-xs text-status-error">{error}</p> : null}
    </div>
  );
}
