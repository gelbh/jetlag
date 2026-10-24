import type { ReactElement } from "react";
import { ReportProblemSheet } from "../../../components/incident/ReportProblemSheet";

export function useMapScreenReportProblemSheet(
  isOpen: boolean,
  onClose: () => void,
): {
  reportProblemSheet: ReactElement;
} {
  return {
    reportProblemSheet: <ReportProblemSheet open={isOpen} onClose={onClose} />,
  };
}
