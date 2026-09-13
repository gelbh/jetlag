import { DesktopContentColumn } from "../components/ui/layout/DesktopContentColumn";
import {
  ScreenHeader,
  screenHeaderOffsetClassName,
} from "../components/ui/layout/ScreenHeader";
import { GamePresetEditorContent } from "./GamePresetEditorContent";

export function GamePresetEditorLegacy() {
  return (
    <main
      className="home-poster flex min-h-[100dvh] flex-col px-5 py-8"
      data-player-ux-world="survey"
    >
      <ScreenHeader backTo="/presets" backLabel="Back" />

      <DesktopContentColumn maxWidth="social">
        <div className={screenHeaderOffsetClassName}>
          <GamePresetEditorContent />
        </div>
      </DesktopContentColumn>
    </main>
  );
}
