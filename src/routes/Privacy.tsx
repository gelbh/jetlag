import { usePlayerUiMantine } from "@/hooks/feature/usePlayerUiMantine";
import { PrivacyLegacy } from "./PrivacyLegacy";
import { PrivacyMantine } from "./PrivacyMantine";

export function Privacy() {
  if (usePlayerUiMantine()) return <PrivacyMantine />;
  return <PrivacyLegacy />;
}
