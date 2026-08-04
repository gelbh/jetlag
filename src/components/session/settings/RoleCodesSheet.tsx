import { SheetHeader } from "../../ui/sheets/SheetHeader";
import { SheetHost } from "../../ui/sheets/SheetHost";
import type { SessionRecord } from "@/domain/map/annotations";
import { RolePasscodeSettings } from "./RolePasscodeSettings";

export interface RoleCodesSheetProps {
  open: boolean;
  onClose: () => void;
  session: SessionRecord;
  myUid: string;
  isHost: boolean;
}

export function RoleCodesSheet({
  open,
  onClose,
  session,
  myUid,
  isHost,
}: RoleCodesSheetProps) {
  return (
    <SheetHost
      open={open}
      onClose={onClose}
      ariaLabel="Role codes"
      railTab="codes"
      maxHeightClassName="max-h-[min(85dvh,560px)]"
      pinned={
        <SheetHeader
          title="Role codes"
          eyebrow="Access"
          onClose={onClose}
          titleSize="xl"
          flush
          className="jl-settings-header pb-3"
        />
      }
    >
      <RolePasscodeSettings
        session={session}
        myUid={myUid}
        isHost={isHost}
        embedded
      />
    </SheetHost>
  );
}
