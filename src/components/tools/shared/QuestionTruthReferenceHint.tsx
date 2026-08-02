import { questionTruthReferenceHint } from "./questionTruthReferenceHint";

interface QuestionTruthReferenceHintProps {
  endGameActive?: boolean;
}

export function QuestionTruthReferenceHint({
  endGameActive = false,
}: QuestionTruthReferenceHintProps) {
  return (
    <p className="text-xs text-ink-dim">
      {questionTruthReferenceHint(endGameActive)}
    </p>
  );
}
