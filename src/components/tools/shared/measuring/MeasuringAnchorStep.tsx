import { SearchField } from "@/components/ui/forms/SearchField";
import { useNamedLoadTask } from "@/hooks/progress/useLoadTask";
import { MEASURING_SEARCH_TASK } from "@/services/core/progress/namedTasks";
import { AnchorControls } from "../controls/AnchorControls";
import { CoordinateCopyButton } from "../controls/CoordinateCopyButton";
import { ToolSection } from "../panels/ToolSection";
import { LoadingReadout } from "../readout/LoadingReadout";

interface MeasuringAnchorStepProps {
  hasSeekerPoint: boolean;
  gpsLoading: boolean;
  seekerPlaceName: string | null;
  anchorLat?: number | null;
  anchorLng?: number | null;
  loading: boolean;
  anchorLoadingMessage: string | null;
  allowsSearch: boolean;
  searchQuery: string;
  searchLoading: boolean;
  onUseGps: () => void;
  onSearchQueryChange: (value: string) => void;
  onSearchSubmit: () => void;
}

export function MeasuringAnchorStep({
  hasSeekerPoint,
  gpsLoading,
  seekerPlaceName,
  anchorLat = null,
  anchorLng = null,
  loading,
  anchorLoadingMessage,
  allowsSearch,
  searchQuery,
  searchLoading,
  onUseGps,
  onSearchQueryChange,
  onSearchSubmit,
}: MeasuringAnchorStepProps) {
  const searchTask = useNamedLoadTask(MEASURING_SEARCH_TASK);
  return (
    <ToolSection first compact status="active">
      <AnchorControls
        gpsLoading={gpsLoading}
        hasAnchor={hasSeekerPoint}
        onUseGps={onUseGps}
        anchorPlaceName={hasSeekerPoint ? seekerPlaceName : null}
      />
      {hasSeekerPoint && typeof anchorLat === "number" && typeof anchorLng === "number" ? (
        <CoordinateCopyButton lat={anchorLat} lng={anchorLng} className="w-full" />
      ) : null}
      {loading && hasSeekerPoint && anchorLoadingMessage ? (
        <LoadingReadout>{anchorLoadingMessage}</LoadingReadout>
      ) : null}
      {allowsSearch ? (
        <SearchField
          label="Search anchor"
          value={searchQuery}
          onChange={onSearchQueryChange}
          onSubmit={onSearchSubmit}
          submitLabel="Find anchor"
          loading={searchLoading}
          task={searchTask}
          placeholder="Address, business, or landmark"
          submitClassName="btn-secondary w-full disabled:opacity-40"
        />
      ) : null}
    </ToolSection>
  );
}
