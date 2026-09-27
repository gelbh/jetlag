import { isEndGameActive } from "@/domain/map/annotations";
import { useSessionStore } from "@/state/sessionStore";
import { hiderTruthReferenceHint } from "@/domain/questions/hiderTruth/hiderTruthReferenceCopy";

export function QuestionTruthReferenceHint() {
  const endGameActive = useSessionStore((state) =>
    isEndGameActive(state.session),
  );

  return (
    <p className="text-xs text-ink-dim">
      {hiderTruthReferenceHint(endGameActive)}
    </p>
  );
}
