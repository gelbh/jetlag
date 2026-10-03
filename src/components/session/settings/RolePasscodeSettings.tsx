import { Stack } from "@mantine/core";
import { useEffect, useState } from "react";
import { ErrorCallout, SectionLabel, SuccessCallout } from "@/components/ui/entry/entryChrome";
import { callableErrorMessage } from "@/domain/device/feedback/userErrors";
import type { SessionRecord } from "@/domain/map/annotations";
import { playerRoleLabel } from "@/domain/session/players/playerRole";
import { isSessionRoleGated, visibleRoleCodeRoles } from "@/domain/session/players/roleGates";
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
  const [revealedCodes, setRevealedCodes] = useState<Partial<Record<RevealRole, string>>>({});
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

  useEffect(() => {
    if (!isSessionRoleGated(session)) {
      return;
    }
    const warmRoles = visibleRoleCodeRoles({
      roleGates: session.roleGates,
      memberRoles: session.memberRoles,
      myUid,
      isHost,
    });
    for (const role of warmRoles) {
      prefetchRolePasscode(session.id, role);
    }
  }, [session, myUid, isHost]);

  if (!gated || rows.length === 0) {
    return null;
  }

  const handleReveal = async (role: RevealRole) => {
    setBusyRole(role);
    setError(null);
    try {
      const result = await revealRolePasscode(session.id, role);
      setRevealedCodes((prev) => ({ ...prev, [role]: result.rolePasscode }));
    } catch (error) {
      setError(callableErrorMessage(error, "Couldn't load that role code. Try again."));
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
    } catch (error) {
      setError(callableErrorMessage(error, "Couldn't regenerate that role code. Try again."));
    } finally {
      setBusyRole(null);
    }
  };

  return (
    <Stack gap="sm">
      {embedded ? null : <SectionLabel>Role codes</SectionLabel>}
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
      {copyStatus === "copied" ? <SuccessCallout>Copied to clipboard.</SuccessCallout> : null}
      <ErrorCallout>{error}</ErrorCallout>
    </Stack>
  );
}
