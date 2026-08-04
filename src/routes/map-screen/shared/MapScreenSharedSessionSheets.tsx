import { useState, type ReactElement } from "react";
import { ReportProblemSheet } from "../../../components/incident/ReportProblemSheet";
import { RoleCodesSheet } from "../../../components/session/settings/RoleCodesSheet";
import type { SessionRecord } from "../../../domain/map/annotations";

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

/**
 * Report-problem sheet + opener used by role docks/settings.
 * Closes the active overlay before opening so sheets do not stack.
 */
export function useMapScreenReportProblemSheet(closeOverlays: () => void): {
  openReportProblem: () => void;
  reportProblemSheet: ReactElement;
} {
  const [reportProblemOpen, setReportProblemOpen] = useState(false);
  return {
    openReportProblem: () => {
      closeOverlays();
      setReportProblemOpen(true);
    },
    reportProblemSheet: (
      <ReportProblemSheet
        open={reportProblemOpen}
        onClose={() => setReportProblemOpen(false)}
      />
    ),
  };
}
