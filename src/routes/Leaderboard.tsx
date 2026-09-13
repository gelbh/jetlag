import { usePlayerUiMantine } from "@/hooks/feature/usePlayerUiMantine";
import { LeaderboardLegacy } from "./LeaderboardLegacy";
import { LeaderboardMantine } from "./LeaderboardMantine";

export function Leaderboard() {
  if (usePlayerUiMantine()) return <LeaderboardMantine />;
  return <LeaderboardLegacy />;
}
