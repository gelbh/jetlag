import { usePlayerUiMantine } from "@/hooks/feature/usePlayerUiMantine";
import { FeedbackLegacy } from "./FeedbackLegacy";
import { FeedbackMantine } from "./FeedbackMantine";

export function Feedback() {
  if (usePlayerUiMantine()) return <FeedbackMantine />;
  return <FeedbackLegacy />;
}
