import type { TutorialSplitCompare } from "../../domain/tutorial/tutorialSections";
import { TutorialScreenshot } from "./TutorialScreenshot";

interface TutorialSplitScreenshotProps {
  compare: TutorialSplitCompare;
}

export function TutorialSplitScreenshot({ compare }: TutorialSplitScreenshotProps) {
  return (
    <div className="tutorial-split-screenshot mx-auto grid w-full max-w-[min(100%,48.75rem)] grid-cols-2 gap-2">
      <figure className="space-y-1.5">
        <figcaption className="font-display text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-dim">
          {compare.leftLabel}
        </figcaption>
        <TutorialScreenshot
          src={compare.leftSrc}
          alt={compare.leftAlt}
          className="object-contain object-top"
        />
      </figure>
      <figure className="space-y-1.5">
        <figcaption className="font-display text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-dim">
          {compare.rightLabel}
        </figcaption>
        <TutorialScreenshot
          src={compare.rightSrc}
          alt={compare.rightAlt}
          className="object-contain object-top"
        />
      </figure>
    </div>
  );
}
