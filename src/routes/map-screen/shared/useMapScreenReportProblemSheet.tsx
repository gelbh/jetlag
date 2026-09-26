import type { ReactElement } from "react";
import { ReportProblemSheet } from "../../../components/incident/ReportProblemSheet";

/**
 * Report-problem sheet driven by the map overlay stack.
 * Open with `pushSheet("report-problem")` so closing returns to the prior sheet.
 */
export function useMapScreenReportProblemSheet(
  isOpen: boolean,
  onClose: () => void,
): {
  reportProblemSheet: ReactElement;
} {
  return {
    reportProblemSheet: (
      <ReportProblemSheet open={isOpen} onClose={onClose} />
    ),
  };
}
