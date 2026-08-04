import { useEffect, useState } from "react";
import type { SessionRecord } from "@/domain/map/annotations";
import {
  isSessionRoleGated,
  visibleRoleCodeRoles,
} from "@/domain/session/players/roleGates";
import { playerRoleLabel } from "@/domain/session/players/playerRole";
import { useCopyFeedback } from "@/hooks/forms/useCopyFeedback";
import {
  prefetchRolePasscode,
  regenerateRolePasscode,
  revealRolePasscode,
} from "@/services/session/rolePasscodeLifecycle";
import { RoleCodeStamp } from "../identity/RoleCodeStamp";

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
  /** When true, omit section chrome (used inside RoleCodesSheet). */
  embedded?: boolean;
}

export function RolePasscodeSettings({
  session,
  myUid,
  isHost,
  embedded = false,
}: RolePasscodeSettingsProps) {
  const [busyRole, setBusyRole] = useState<RevealRole | null>(null);
  const [revealedCodes, setRevealedCodes] = useState<
    Partial<Record<RevealRole, string>>
  >({});
  const [error, setError] = useState<string | null>(null);
  const { status: copyStatus, copy } = useCopyFeedback();

  const gated = isSessionRoleGated(session);
  const rows = gated
    ? visibleRoleCodeRoles({
        roleGates: session.roleGates,
        memberRoles: session.memberRoles,
        myUid,
        isHost,
      })
    : [];
  const rowKey = rows.join(",");

  useEffect(() => {
    if (!gated || rowKey.length === 0) {
      return;
    }
    for (const role of rowKey.split(",") as RevealRole[]) {
      prefetchRolePasscode(session.id, role);
    }
  }, [gated, session.id, rowKey]);

  if (!gated || rows.length === 0) {
    return null;
  }

  const handleReveal = async (role: RevealRole) => {
    setBusyRole(role);
    setError(null);
    try {
      const result = await revealRolePasscode(session.id, role);
      setRevealedCodes((prev) => ({ ...prev, [role]: result.rolePasscode }));
    } catch {
      setError("Couldn't load that role code. Try again.");
    } finally {
      setBusyRole(null);
    }
  };

  const handleCopy = async (role: RevealRole) => {
    const code = revealedCodes[role];
    if (!code) {
      return;
    }

    setError(null);
    try {
      await copy(code);
    } catch {
      setError("Couldn't copy that role code. Try again.");
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
      setRevealedCodes((prev) => ({ ...prev, [role]: result.rolePasscode }));
      await copy(result.rolePasscode);
    } catch {
      setError("Couldn't regenerate that role code. Try again.");
    } finally {
      setBusyRole(null);
    }
  };

  return (
    <div
      className={
        embedded
          ? "space-y-3"
          : "space-y-3 border-t-2 border-border pt-4"
      }
    >
      {embedded ? null : (
        <p className="font-display text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">
          Role codes
        </p>
      )}
      {rows.map((role) => (
        <RoleCodeStamp
          key={role}
          roleLabel={rolePasscodeLabel(role)}
          code={revealedCodes[role] ?? null}
          busy={busyRole === role}
          onReveal={() => void handleReveal(role)}
          onRegenerate={() => void handleRegenerate(role)}
          onCopy={() => void handleCopy(role)}
        />
      ))}
      {copyStatus === "copied" ? (
        <p className="text-xs text-ink-muted">Copied to clipboard.</p>
      ) : null}
      {error ? <p className="text-xs text-status-error">{error}</p> : null}
    </div>
  );
}
