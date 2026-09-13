import { usePlayerUiMantine } from "@/hooks/feature/usePlayerUiMantine";
import { PremiumLegacy } from "./PremiumLegacy";
import { PremiumMantine } from "./PremiumMantine";

export function Premium() {
  if (usePlayerUiMantine()) return <PremiumMantine />;
  return <PremiumLegacy />;
}
