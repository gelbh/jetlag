import type { MapTool } from "../../state/sessionStore";
import type { HeavyMapToolsApi } from "../../hooks/map-screen/heavyMapTools";
import {
  MatchingToolRunner,
  MeasuringToolRunner,
  TentacleToolRunner,
  type HeavyMapToolRunnerProps,
} from "./HeavyMapToolRunners";

interface HeavyMapToolsSlotProps extends HeavyMapToolRunnerProps {
  activeTool: MapTool;
  onToolsChange: (tools: HeavyMapToolsApi) => void;
}

export function HeavyMapToolsSlot({
  activeTool,
  onToolsChange,
  canSubmitQuestion,
  ...sharedProps
}: HeavyMapToolsSlotProps) {
  switch (activeTool) {
    case "matching":
      return (
        <MatchingToolRunner
          onToolsChange={onToolsChange}
          canSubmitQuestion={canSubmitQuestion}
          {...sharedProps}
        />
      );
    case "measuring":
      return (
        <MeasuringToolRunner
          onToolsChange={onToolsChange}
          canSubmitQuestion={canSubmitQuestion}
          {...sharedProps}
        />
      );
    case "tentacle":
      return (
        <TentacleToolRunner
          onToolsChange={onToolsChange}
          canSubmitQuestion={canSubmitQuestion}
          {...sharedProps}
        />
      );
    default:
      return null;
  }
}
