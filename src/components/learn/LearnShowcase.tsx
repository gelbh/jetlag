import type { LearnShowcaseId } from "@/domain/learn/learnContentTypes";
import { LearnShowcaseFrame } from "./LearnShowcaseFrame";
import { MatchingLearnDemo } from "./showcases/MatchingLearnDemo";
import { MeasuringLearnDemo } from "./showcases/MeasuringLearnDemo";
import { PhotoLearnDemo } from "./showcases/PhotoLearnDemo";
import { RadarLearnDemo } from "./showcases/RadarLearnDemo";
import { TentacleLearnDemo } from "./showcases/TentacleLearnDemo";
import { ThermometerLearnDemo } from "./showcases/ThermometerLearnDemo";
import { ToolsHubLearnDemo } from "./showcases/ToolsHubLearnDemo";

function ShowcaseBody({ showcase }: { showcase: LearnShowcaseId }) {
  switch (showcase) {
    case "radar":
      return <RadarLearnDemo />;
    case "thermometer":
      return <ThermometerLearnDemo />;
    case "matching":
      return <MatchingLearnDemo />;
    case "measuring":
      return <MeasuringLearnDemo />;
    case "tentacles":
      return <TentacleLearnDemo />;
    case "photo":
      return <PhotoLearnDemo />;
    case "tools-hub":
      return <ToolsHubLearnDemo />;
  }
}

/** Mounts a live Ask HUD (or tools hub rail) inside a learn article. */
export function LearnShowcase({
  showcase,
  caption,
}: {
  showcase: LearnShowcaseId;
  caption: string;
}) {
  return (
    <LearnShowcaseFrame caption={caption}>
      <ShowcaseBody showcase={showcase} />
    </LearnShowcaseFrame>
  );
}
