import { RequireUsername } from "../components/auth/RequireUsername";
import { DesktopContentColumn } from "../components/ui/layout/DesktopContentColumn";
import { EntryScreenLayout } from "../components/ui/layout/EntryScreenLayout";
import {
  ScreenHeader,
  screenHeaderOffsetClassName,
} from "../components/ui/layout/ScreenHeader";
import { LeaderboardBoard } from "./LeaderboardBoard";

export function LeaderboardLegacy() {
  return (
    <EntryScreenLayout justify="start">
      <ScreenHeader backTo="/" backLabel="Home" />
      <DesktopContentColumn maxWidth="social">
        <div className={screenHeaderOffsetClassName}>
          <div className="space-y-1 pb-4">
            <h1 className="font-display text-balance text-3xl font-bold uppercase leading-[0.92] tracking-tight text-field-ink sm:text-[2rem]">
              Leaderboard
            </h1>
            <p className="max-w-sm text-pretty text-base leading-relaxed text-field-ink-muted">
              Opt-in ranked boards by game size and role. Username only, no
              account details.
            </p>
          </div>

          <RequireUsername
            continuePath="/leaderboard"
            signInDescription="Sign in with a username to opt into leaderboards and view rankings."
          >
            <LeaderboardBoard />
          </RequireUsername>
        </div>
      </DesktopContentColumn>
    </EntryScreenLayout>
  );
}
