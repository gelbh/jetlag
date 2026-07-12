import { AnchorControls } from "./AnchorControls";
import { CoordinateCopyButton } from "./CoordinateCopyButton";
import { LoadingReadout } from "./LoadingReadout";
import { SearchField } from "../../ui/SearchField";
import { ToolSection } from "./ToolSection";

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
  return (
    <ToolSection first compact status="active">
      <AnchorControls
        gpsLoading={gpsLoading}
        hasAnchor={hasSeekerPoint}
        onUseGps={onUseGps}
        anchorPlaceName={hasSeekerPoint ? seekerPlaceName : null}
      />
      {hasSeekerPoint &&
      typeof anchorLat === "number" &&
      typeof anchorLng === "number" ? (
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
          placeholder="Address, business, or landmark"
          submitClassName="btn-secondary w-full disabled:opacity-40"
        />
      ) : null}
    </ToolSection>
  );
}
