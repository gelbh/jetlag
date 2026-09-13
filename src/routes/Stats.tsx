import { useState } from "react";
import { RequireUsername } from "../components/auth/RequireUsername";
import { DesktopContentColumn } from "../components/ui/layout/DesktopContentColumn";
import { EntryScreenLayout } from "../components/ui/layout/EntryScreenLayout";
import { EmptyState } from "../components/ui/feedback/EmptyState";
import { SegmentControl } from "../components/ui/forms/SegmentControl";
import {
  ScreenHeader,
  screenHeaderOffsetClassName,
} from "../components/ui/layout/ScreenHeader";
import type { LeaderboardRole } from "../domain/game/leaderboard";
import { playerRoleLabel } from "../domain/session/players/playerRole";

const ROLE_TABS: Array<{ value: LeaderboardRole; label: string }> = [
  { value: "hider", label: playerRoleLabel("hider") },
  { value: "seeker", label: playerRoleLabel("seeker") },
];

export function Stats() {
  const [roleTab, setRoleTab] = useState<LeaderboardRole>("hider");

  return (
    <EntryScreenLayout justify="start">
      <ScreenHeader backTo="/" backLabel="Home" />
      <DesktopContentColumn maxWidth="social">
        <div className={`space-y-4 ${screenHeaderOffsetClassName}`}>
          <div className="space-y-1">
            <h1 className="font-display text-balance text-[clamp(2rem,10vw,3rem)] font-bold uppercase leading-[0.92] tracking-tight text-field-ink">
              Stats
            </h1>
            <p className="max-w-sm text-pretty text-base leading-relaxed text-field-ink-muted">
              Personal round history and aggregates by role.
            </p>
          </div>

          <RequireUsername continuePath="/stats">
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
                className="space-y-3 border-t-2 border-rule pt-4"
              >
                <p className="font-display text-[0.8125rem] font-semibold uppercase tracking-[0.12em] text-field-ink-muted">
                  {playerRoleLabel(roleTab)} · All sizes
                </p>
                <EmptyState>
                  No completed rounds yet. Finish a synced session as{" "}
                  {playerRoleLabel(roleTab).toLowerCase()} to see distance, phase
                  time, and question stats here.
                </EmptyState>
              </div>
            </>
          </RequireUsername>
        </div>
      </DesktopContentColumn>
    </EntryScreenLayout>
  );
}
