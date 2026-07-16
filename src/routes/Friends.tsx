import { RequireUsername } from "../components/auth/RequireUsername";
import { FriendsPanel } from "../components/friends/FriendsPanel";
import { EntryScreenLayout } from "../components/ui/EntryScreenLayout";
import {
  ScreenHeader,
  screenHeaderOffsetClassName,
} from "../components/ui/ScreenHeader";

export function Friends() {
  return (
    <EntryScreenLayout justify="start">
      <ScreenHeader backTo="/" backLabel="Home" />
      <div className={`space-y-4 ${screenHeaderOffsetClassName}`}>
        <div className="space-y-1">
          <h1 className="font-display text-balance text-[clamp(2rem,10vw,3rem)] font-bold uppercase leading-[0.92] tracking-tight text-ink">
            Friends
          </h1>
          <p className="max-w-sm text-pretty text-base leading-relaxed text-ink-muted">
            Search by username, send requests, and keep your crew together.
          </p>
        </div>

        <RequireUsername
          continuePath="/friends"
          signInDescription="Sign in to add friends and see their stats on friends leaderboards."
        >
          <FriendsPanel />
        </RequireUsername>
      </div>
    </EntryScreenLayout>
  );
}
