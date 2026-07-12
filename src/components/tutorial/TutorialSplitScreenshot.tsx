import { TutorialScreenshot } from "./TutorialScreenshot";
import type { TutorialSplitCompare } from "../../domain/tutorial/tutorialSections";

interface TutorialSplitScreenshotProps {
  compare: TutorialSplitCompare;
}

export function TutorialSplitScreenshot({ compare }: TutorialSplitScreenshotProps) {
  return (
    <div className="tutorial-split-screenshot mx-auto grid min-h-0 w-full max-w-[min(100%,48.75rem)] flex-1 grid-cols-2 gap-2">
      <figure className="tutorial-split-card flex min-h-0 min-w-0 flex-col gap-1">
        <figcaption className="shrink-0 font-display text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-dim">
          {compare.leftLabel}
        </figcaption>
        <div className="tutorial-split-card-body flex min-h-0 flex-1 items-center justify-center overflow-y-auto">
          <TutorialScreenshot
            src={compare.leftSrc}
            alt={compare.leftAlt}
            className="object-contain object-top"
            fill
          />
        </div>
      </figure>
      <figure className="tutorial-split-card flex min-h-0 min-w-0 flex-col gap-1">
        <figcaption className="shrink-0 font-display text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-dim">
          {compare.rightLabel}
        </figcaption>
        <div className="tutorial-split-card-body flex min-h-0 flex-1 items-center justify-center overflow-y-auto">
          <TutorialScreenshot
            src={compare.rightSrc}
            alt={compare.rightAlt}
            className="object-contain object-top"
            fill
          />
        </div>
      </figure>
    </div>
  );
}
