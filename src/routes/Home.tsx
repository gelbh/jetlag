import { usePlayerUiMantine } from "@/hooks/feature/usePlayerUiMantine";
import { HomeLegacy } from "./HomeLegacy";
import { HomeMantine } from "./HomeMantine";

export function Home() {
  if (usePlayerUiMantine()) {
    return <HomeMantine />;
  }
  return <HomeLegacy />;
}
