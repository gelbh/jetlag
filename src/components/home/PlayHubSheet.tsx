import { AppLink } from "../navigation/AppLink";
import { MotionSheet } from "../motion/MotionSheet";
import { DesktopContentColumn } from "../ui/DesktopContentColumn";
import { SheetHeader } from "../ui/SheetHeader";

interface PlayHubSheetProps {
  open: boolean;
  onClose: () => void;
}

export function PlayHubSheet({ open, onClose }: PlayHubSheetProps) {
  return (
    <MotionSheet
      open={open}
      onClose={onClose}
      ariaLabel="Play"
      sheetClassName="mx-auto max-w-lg"
      maxHeightClassName="max-h-[min(70dvh,480px)]"
    >
      <SheetHeader title="Play" onClose={onClose} />

      <DesktopContentColumn maxWidth="entry">
        <div className="desktop-entry-actions space-y-2.5">
          <AppLink
            to="/create"
            onClick={onClose}
            aria-label="Create session"
            className="home-card-btn home-card-btn-primary w-full"
          >
            <span>Create session</span>
            <span className="home-card-btn-hint">Host a game</span>
          </AppLink>
          <AppLink
            to="/join"
            onClick={onClose}
            aria-label="Join session"
            className="home-card-btn home-card-btn-secondary w-full"
          >
            <span>Join session</span>
            <span className="home-card-btn-hint">Enter 4-letter code</span>
          </AppLink>
          <AppLink
            to="/presets"
            onClick={onClose}
            aria-label="Custom game presets"
            className="home-card-btn home-card-btn-secondary w-full"
          >
            <span>Custom game</span>
            <span className="home-card-btn-hint">Saved templates</span>
          </AppLink>
        </div>
      </DesktopContentColumn>
    </MotionSheet>
  );
}
