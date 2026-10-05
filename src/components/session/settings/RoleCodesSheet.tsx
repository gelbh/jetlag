import type { SessionRecord } from "@/domain/map/annotations";
import { SheetHost } from "../../ui/sheets/SheetHost";
import { RolePasscodeSettings } from "./RolePasscodeSettings";

export interface RoleCodesSheetProps {
  open: boolean;
  onClose: () => void;
  session: SessionRecord;
  myUid: string;
  isHost: boolean;
}

export function RoleCodesSheet({ open, onClose, session, myUid, isHost }: RoleCodesSheetProps) {
  return (
    <SheetHost
      open={open}
      onClose={onClose}
      ariaLabel="Role codes"
      railTab="codes"
      maxHeightClassName="max-h-[min(85dvh,560px)]"
      pinned={
        <h2 className="mb-1 text-[1.375rem] font-bold tracking-tight text-[var(--color-field-ink)]">
          Role codes
        </h2>
      }
    >
      {open ? (
        <RolePasscodeSettings session={session} myUid={myUid} isHost={isHost} embedded />
      ) : null}
    </SheetHost>
  );
}
