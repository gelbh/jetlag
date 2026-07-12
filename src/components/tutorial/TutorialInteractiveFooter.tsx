interface TutorialInteractiveFooterProps {
  onGotIt: () => void;
  onSeeWalkthrough: () => void;
}

export function TutorialInteractiveFooter({
  onGotIt,
  onSeeWalkthrough,
}: TutorialInteractiveFooterProps) {
  return (
    <div className="tutorial-interactive-footer grid grid-cols-2 gap-2 pt-3">
      <button type="button" onClick={onGotIt} className="btn-primary min-h-11 w-full">
        Got it
      </button>
      <button
        type="button"
        onClick={onSeeWalkthrough}
        className="btn-secondary min-h-11 w-full"
      >
        See walkthrough
      </button>
    </div>
  );
}
