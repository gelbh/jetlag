import { useState, type ReactElement } from "react";
import { ReportProblemSheet } from "../../../components/incident/ReportProblemSheet";

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
