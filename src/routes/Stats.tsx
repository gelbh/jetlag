import { usePlayerUiMantine } from "@/hooks/feature/usePlayerUiMantine";
import { StatsLegacy } from "./StatsLegacy";
import { StatsMantine } from "./StatsMantine";

export function Stats() {
  if (usePlayerUiMantine()) return <StatsMantine />;
  return <StatsLegacy />;
}
