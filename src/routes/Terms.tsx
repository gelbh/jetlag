import { usePlayerUiMantine } from "@/hooks/feature/usePlayerUiMantine";
import { TermsLegacy } from "./TermsLegacy";
import { TermsMantine } from "./TermsMantine";

export function Terms() {
  if (usePlayerUiMantine()) return <TermsMantine />;
  return <TermsLegacy />;
}
