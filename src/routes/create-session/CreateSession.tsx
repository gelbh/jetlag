import { usePlayerUiMantine } from "@/hooks/feature/usePlayerUiMantine";
import { CreateLegacy } from "./CreateLegacy";
import { CreateMantine } from "./CreateMantine";

export function CreateSession() {
  if (usePlayerUiMantine()) {
    return <CreateMantine />;
  }
  return <CreateLegacy />;
}
