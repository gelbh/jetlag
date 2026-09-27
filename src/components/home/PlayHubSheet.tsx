import { AppLink } from "../navigation/AppLink";
import { DrawerSheet } from "../ui/sheets/DrawerSheet";
import { SheetHeader } from "../ui/sheets/SheetHeader";
import {
  homeCardBtnHintOnPrimaryStyle,
  homeCardBtnHintStyle,
  homeCardBtnStyle,
} from "@/components/ui/entry/entryStyles";

interface PlayHubSheetProps {
  open: boolean;
  onClose: () => void;
}

export function PlayHubSheet({ open, onClose }: PlayHubSheetProps) {
  return (
    <DrawerSheet
      open={open}
      onClose={onClose}
      ariaLabel="Play"
      sheetClassName="mx-auto max-w-lg"
      maxHeightClassName="max-h-[min(70dvh,480px)]"
    >
      <SheetHeader title="Play" onClose={onClose} />

      <div className="space-y-2.5 lg:[&_a]:mx-auto lg:[&_a]:w-full lg:[&_a]:max-w-[20rem]">
        <AppLink
          to="/create"
          onClick={onClose}
          aria-label="Create session"
          data-feedback="tap"
          style={homeCardBtnStyle("primary")}
        >
          <span>Create session</span>
          <span style={homeCardBtnHintOnPrimaryStyle}>Host a game</span>
        </AppLink>
        <AppLink
          to="/join"
          onClick={onClose}
          aria-label="Join session"
          data-feedback="tap"
          style={homeCardBtnStyle("secondary")}
        >
          <span>Join session</span>
          <span style={homeCardBtnHintStyle}>Enter 4-letter code</span>
        </AppLink>
        <AppLink
          to="/presets"
          onClick={onClose}
          aria-label="Custom game presets"
          data-feedback="tap"
          style={homeCardBtnStyle("secondary")}
        >
          <span>Custom game</span>
          <span style={homeCardBtnHintStyle}>Saved templates</span>
        </AppLink>
      </div>
    </DrawerSheet>
  );
}
