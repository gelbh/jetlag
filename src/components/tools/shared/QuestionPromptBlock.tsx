interface QuestionPromptBlockProps {
  prompt: string;
  ruleSummary?: string;
}

export function QuestionPromptBlock({
  prompt,
  ruleSummary,
}: QuestionPromptBlockProps) {
  return (
    <div className="space-y-0.5">
      <p className="text-sm font-medium leading-snug text-ink">{prompt}</p>
      {ruleSummary ? (
        <p className="text-xs leading-snug text-ink-dim">{ruleSummary}</p>
      ) : null}
    </div>
  );
}
