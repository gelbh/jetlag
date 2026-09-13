import { usePlayerUiMantine } from "@/hooks/feature/usePlayerUiMantine";
import { JoinLegacy } from "./JoinLegacy";
import { JoinMantine } from "./JoinMantine";

export function JoinSession() {
  if (usePlayerUiMantine()) {
    return <JoinMantine />;
  }
  return <JoinLegacy />;
}
