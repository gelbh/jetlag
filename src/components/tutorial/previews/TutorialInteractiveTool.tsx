import type { ReactNode } from "react";
import type { QuestionTutorialId } from "../../../domain/tutorial/tutorialQuestions";
import {
  TutorialInteractiveSessionProvider,
  useTutorialInteractiveSession,
} from "../../../hooks/tutorial/TutorialInteractiveSession";
import { TutorialInteractiveMapDraftProvider } from "../../../hooks/tutorial/TutorialInteractiveMapDraftContext";
import {
  TUTORIAL_SANDBOX_HOOKS,
  type TutorialSandboxHookResult,
} from "../../../hooks/tutorial/tutorialSandboxRegistry";
import { TutorialMapContextPreview } from "./TutorialMapContextPreview";

interface TutorialInteractiveToolProps {
  toolId: QuestionTutorialId;
}

type InteractiveShellKind = "session" | "map" | "panel";

interface InteractiveToolConfig {
  shell: InteractiveShellKind;
  hint?: (result: TutorialSandboxHookResult) => ReactNode;
}

function hintText(text: string): ReactNode {
  return <p className="text-center text-xs text-ink-muted">{text}</p>;
}

const ANCHOR_HINT =
  "Tap the map or use GPS to place your anchor. Choose closer/further to preview the shaded area.";

const INTERACTIVE_TOOL_CONFIG: Record<QuestionTutorialId, InteractiveToolConfig> = {
  matching: { shell: "session", hint: () => hintText(ANCHOR_HINT) },
  measuring: { shell: "session", hint: () => hintText(ANCHOR_HINT) },
  radar: {
    shell: "session",
    hint: () =>
      hintText(
        "Tap the map or use GPS to place the radar center. Pick yes/no to shade inside or outside the circle.",
      ),
  },
  tentacle: {
    shell: "session",
    hint: () =>
      hintText(
        "Tap the map or use GPS to place the search center. Pick a location to preview the shaded area.",
      ),
  },
  thermometer: {
    shell: "map",
    hint: (result) =>
      result.mapStep !== "ready"
        ? hintText("Tap the map above to place both ends of the path.")
        : hintText(
            "Choose hotter or colder to preview the shaded half of the play area.",
          ),
  },
  photo: { shell: "panel" },
};

function InteractiveShell({
  panel,
  mapKey,
  onMapClick,
  mapHint,
}: {
  panel: ReactNode;
  mapKey: string;
  onMapClick?: (lat: number, lng: number) => void;
  mapHint?: ReactNode;
}) {
  const session = useTutorialInteractiveSession();

  return (
    <div className="tutorial-interactive-panel flex w-full max-w-xl flex-col gap-2">
      <TutorialMapContextPreview
        mapKey={mapKey}
        anchorLat={session?.anchorLat ?? null}
        anchorLng={session?.anchorLng ?? null}
        onMapClick={
          onMapClick ??
          (session
            ? (lat, lng) => {
                session.placeAt(lat, lng);
              }
            : undefined)
        }
      />
      <div className="relative z-[1] hud-panel overflow-visible p-2">{panel}</div>
      {mapHint}
      {session?.gpsError ? (
        <p className="text-center text-xs text-status-danger">{session.gpsError}</p>
      ) : null}
    </div>
  );
}

function MapInteractiveShell({
  panel,
  mapKey,
  onMapClick,
  mapHint,
}: {
  panel: ReactNode;
  mapKey: string;
  onMapClick?: (lat: number, lng: number) => void;
  mapHint?: ReactNode;
}) {
  return (
    <div className="tutorial-interactive-panel flex w-full max-w-xl flex-col gap-2">
      <TutorialMapContextPreview
        mapKey={mapKey}
        showAnchorMarker={false}
        onMapClick={onMapClick}
      />
      <div className="relative z-[1] hud-panel overflow-visible p-2">{panel}</div>
      {mapHint}
    </div>
  );
}

function InteractiveToolInner({ toolId }: TutorialInteractiveToolProps) {
  const useSandbox = TUTORIAL_SANDBOX_HOOKS[toolId];
  const result = useSandbox({
    readOnly: false,
    fixtureRequest: { kind: "interactive" },
    syncWizardStep: false,
  });
  const config = INTERACTIVE_TOOL_CONFIG[toolId];
  const mapKey = `tutorial-interactive-${toolId}`;
  const mapHint = config.hint?.(result);

  switch (config.shell) {
    case "session":
      return <InteractiveShell mapKey={mapKey} panel={result.panel} mapHint={mapHint} />;
    case "map":
      return (
        <MapInteractiveShell
          mapKey={mapKey}
          panel={result.panel}
          onMapClick={result.placeOnMap}
          mapHint={mapHint}
        />
      );
    case "panel":
      return (
        <div className="tutorial-interactive-panel flex w-full max-w-xl flex-col gap-2">
          <div className="relative z-[1] hud-panel overflow-visible p-2">
            {result.panel}
          </div>
        </div>
      );
    default: {
      const _exhaustive: never = config.shell;
      return _exhaustive;
    }
  }
}

export function TutorialInteractiveTool({ toolId }: TutorialInteractiveToolProps) {
  return (
    <TutorialInteractiveMapDraftProvider>
      {INTERACTIVE_TOOL_CONFIG[toolId].shell === "session" ? (
        <TutorialInteractiveSessionProvider toolId={toolId}>
          <InteractiveToolInner key={toolId} toolId={toolId} />
        </TutorialInteractiveSessionProvider>
      ) : (
        <InteractiveToolInner key={toolId} toolId={toolId} />
      )}
    </TutorialInteractiveMapDraftProvider>
  );
}
