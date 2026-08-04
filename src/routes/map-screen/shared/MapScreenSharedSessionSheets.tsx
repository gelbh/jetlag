import type { SessionRecord } from "../../../domain/map/annotations";
import { RoleCodesSheet } from "../../../components/session/settings/RoleCodesSheet";

export type MapScreenRoleCodesSheetProps = {
  session: SessionRecord;
  uid: string | null | undefined;
  isHost: boolean;
  isCodesOpen: boolean;
  onCloseSheet: () => void;
  canOpenCodes: boolean;
};

/** Shared Codes sheet gate for seeker / hider / observer map chrome. */
export function MapScreenRoleCodesSheet({
  session,
  uid,
  isHost,
  isCodesOpen,
  onCloseSheet,
  canOpenCodes,
}: MapScreenRoleCodesSheetProps) {
  if (!uid || !canOpenCodes) {
    return null;
  }
  return (
    <RoleCodesSheet
      key={isCodesOpen ? "codes-open" : "codes-closed"}
      open={isCodesOpen}
      onClose={onCloseSheet}
      session={session}
      myUid={uid}
      isHost={isHost}
    />
  );
}
