import { Stack } from "@mantine/core";
import { useEffect, useState } from "react";
import { ErrorCallout, SectionLabel, SuccessCallout } from "@/components/ui/entry/entryChrome";
import { callableErrorMessage } from "@/domain/device/feedback/userErrors";
import type { SessionRecord } from "@/domain/map/annotations";
import { type JoinRequestRole, joinRequestRoleLabel } from "@/domain/session/players/joinRequest";
import { isSessionRoleGated, visibleRoleCodeRoles } from "@/domain/session/players/roleGates";
import { useCopyFeedback } from "@/hooks/forms/useCopyFeedback";
import {
  prefetchRolePasscode,
  regenerateRolePasscode,
  revealRolePasscode,
} from "@/services/session/rolePasscodeLifecycle";
import { RoleCodeStamp } from "../identity/RoleCodeStamp";

function rolePasscodeLabel(role: JoinRequestRole): string {
  if (role === "observer") {
    return "Observer code";
  }
  if (role === "referee") {
    return "Referee code";
  }

  return `${joinRequestRoleLabel(role)} code`;
}

export interface RolePasscodeSettingsProps {
  session: SessionRecord;
  myUid: string;
  isHost: boolean;
  embedded?: boolean;
}

export function RolePasscodeSettings({
  session,
  myUid,
  isHost,
  embedded = false,
}: RolePasscodeSettingsProps) {
  const [busyRole, setBusyRole] = useState<JoinRequestRole | null>(null);
  const [revealedCodes, setRevealedCodes] = useState<Partial<Record<JoinRequestRole, string>>>({});
  const [error, setError] = useState<string | null>(null);
  const { status: copyStatus, copy } = useCopyFeedback();

  const roleCodeInput = {
    roleGates: session.roleGates,
    memberRoles: session.memberRoles,
    castleSiegeRoles: session.castleSiegeRoles,
    myUid,
    isHost,
    mode: session.mode,
  };

  const gated = isSessionRoleGated(session);
  const rows = gated ? visibleRoleCodeRoles(roleCodeInput) : [];

  useEffect(() => {
    if (!isSessionRoleGated(session)) {
      return;
    }
    const warmRoles = visibleRoleCodeRoles(roleCodeInput);
    for (const role of warmRoles) {
      prefetchRolePasscode(session.id, role);
    }
  }, [session, myUid, isHost]);

  if (!gated || rows.length === 0) {
    return null;
  }

  const handleReveal = async (role: JoinRequestRole) => {
    setBusyRole(role);
    setError(null);
    try {
      const result = await revealRolePasscode(session.id, role);
      setRevealedCodes((prev) => ({ ...prev, [role]: result.rolePasscode }));
    } catch (error) {
      setError(callableErrorMessage(error, "Couldn't load that role code. Try again."));
    }
    setBusyRole(null);
  };

  const handleCopy = async (role: JoinRequestRole) => {
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

  const handleRegenerate = async (role: JoinRequestRole) => {
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
    }
    setBusyRole(null);
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
