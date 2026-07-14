import { useState } from "react";
import { AccountSignInGate } from "../components/auth/AccountSignInGate";
import { BootSplash } from "../components/ui/BootSplash";
import { EntryScreenLayout } from "../components/ui/EntryScreenLayout";
import { SegmentControl } from "../components/ui/SegmentControl";
import {
  ScreenHeader,
  screenHeaderOffsetClassName,
} from "../components/ui/ScreenHeader";
import type { LeaderboardRole } from "../domain/game/leaderboard";
import { playerRoleLabel } from "../domain/session/playerRole";
import { usePermanentAuthUser } from "../hooks/billing/usePermanentAuthUser";
import { isFirebaseConfigured } from "../services/core/firebase";

const ROLE_TABS: Array<{ value: LeaderboardRole; label: string }> = [
  { value: "hider", label: playerRoleLabel("hider") },
  { value: "seeker", label: playerRoleLabel("seeker") },
];

export function Stats() {
  const { isPermanent, authReady } = usePermanentAuthUser();
  const [roleTab, setRoleTab] = useState<LeaderboardRole>("hider");

  const showSignIn =
    isFirebaseConfigured() && authReady && !isPermanent;

  if (isFirebaseConfigured() && !authReady) {
    return (
      <EntryScreenLayout justify="start">
        <ScreenHeader backTo="/" backLabel="Home" />
        <BootSplash label="Starting…" />
      </EntryScreenLayout>
    );
  }

  return (
    <EntryScreenLayout justify="start">
      <ScreenHeader backTo="/" backLabel="Home" />
      <div className={`space-y-4 ${screenHeaderOffsetClassName}`}>
        <div className="space-y-1">
          <h1 className="font-display text-balance text-[clamp(2rem,10vw,3rem)] font-bold uppercase leading-[0.92] tracking-tight text-ink">
            Stats
          </h1>
          <p className="max-w-sm text-pretty text-base leading-relaxed text-ink-muted">
            Personal round history and aggregates by role.
          </p>
        </div>

        {showSignIn ? (
          <AccountSignInGate continuePath="/stats" />
        ) : (
          <>
            <SegmentControl
              value={roleTab}
              options={ROLE_TABS}
              onChange={setRoleTab}
              aria-label="Stats role"
            />

            <div
              role="tabpanel"
              aria-label={`${playerRoleLabel(roleTab)} stats`}
              className="space-y-3 border-t-2 border-border pt-4"
            >
              <p className="font-display text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-dim">
                {playerRoleLabel(roleTab)} · All sizes
              </p>
              <p className="text-sm leading-relaxed text-ink-muted">
                No completed rounds yet. Finish a synced session as{" "}
                {playerRoleLabel(roleTab).toLowerCase()} to see distance, phase
                time, and question stats here.
              </p>
            </div>
          </>
        )}
      </div>
    </EntryScreenLayout>
  );
}
