import {
  MEASURING_GROUPS,
  measuringCatalogOptionsForGroup,
  measuringQuestionFor,
  measuringSupportsMapTarget,
  measuringSupportsNearest,
  measuringSupportsSearch,
  measuringTargetKind,
  measuringTargetLabel,
  type MeasuringAnswer,
  type MeasuringFromKind,
  type MeasuringLocationCategory,
  type MeasuringSubject,
  type MeasuringTargetMode,
} from "../../domain/measuringQuestions";
import type { GeocodedPlace } from "../../services/geocoding";
import { formatDistance, type DistanceUnit } from "../../domain/distance";
import { BinaryAnswerPicker } from "./shared/BinaryAnswerPicker";
import { ToolPanelShell } from "./shared/ToolPanelShell";

type MeasuringSearchRole = "seeker" | "target";

interface MeasuringPanelProps {
  distanceUnit: DistanceUnit;
  measureFrom: MeasuringFromKind;
  usesAllPlacesInArea: boolean;
  usedMeasuringFromKinds: ReadonlySet<MeasuringFromKind>;
  subject: MeasuringSubject;
  targetMode: MeasuringTargetMode;
  anchorAltitudeMeters: number | null;
  hasSeekerPoint: boolean;
  hasTargetPoint: boolean;
  seekerPlaceName: string | null;
  targetPlaceName: string | null;
  distanceMeters: number | null;
  loading: boolean;
  gpsLoading: boolean;
  searchQuery: string;
  searchResults: GeocodedPlace[];
  searchLoading: boolean;
  searchRole: MeasuringSearchRole;
  answer: MeasuringAnswer | null;
  error?: string | null;
  onMeasureFromChange: (kind: MeasuringFromKind) => void;
  onTargetModeChange: (mode: MeasuringTargetMode) => void;
  onSearchQueryChange: (value: string) => void;
  onSearchSubmit: (role: MeasuringSearchRole) => void;
  onSearchResultSelect: (
    place: GeocodedPlace,
    role: MeasuringSearchRole,
  ) => void;
  onUseGps: () => void;
  onFindCoastline: () => void;
  onFindLinearFeature: () => void;
  onFindNearest: () => void;
  onAnswerChange: (answer: MeasuringAnswer) => void;
  onCommit: () => void;
}

export function MeasuringPanel({
  distanceUnit,
  measureFrom,
  usesAllPlacesInArea,
  usedMeasuringFromKinds,
  subject,
  targetMode,
  anchorAltitudeMeters,
  hasSeekerPoint,
  hasTargetPoint,
  seekerPlaceName,
  targetPlaceName,
  distanceMeters,
  loading,
  gpsLoading,
  searchQuery,
  searchResults,
  searchLoading,
  searchRole,
  answer,
  error,
  onMeasureFromChange,
  onTargetModeChange,
  onSearchQueryChange,
  onSearchSubmit,
  onSearchResultSelect,
  onUseGps,
  onFindCoastline,
  onFindLinearFeature,
  onFindNearest,
  onAnswerChange,
  onCommit,
}: MeasuringPanelProps) {
  const locationCategory =
    subject === "location"
      ? (measureFrom as MeasuringLocationCategory)
      : undefined;
  const question = measuringQuestionFor(subject, locationCategory);
  const targetLabel = measuringTargetLabel(subject, locationCategory);
  const targetKind = measuringTargetKind(measureFrom);
  const isCoastline = targetKind === "coastline";
  const isSeaLevel = targetKind === "sea_level";
  const isLinear = targetKind === "linear";
  const allowsSearch = measuringSupportsSearch(measureFrom);
  const canFindNearest = measuringSupportsNearest(measureFrom);
  const canUseMapTarget = measuringSupportsMapTarget(measureFrom);
  const targetSummary = isSeaLevel
    ? hasTargetPoint
      ? "Sea level reference loaded"
      : "Set your anchor to read elevation"
    : (targetPlaceName ??
      (hasTargetPoint ? `${targetLabel} pinned` : "No target yet"));
  const availableGroups = MEASURING_GROUPS.map((group) => ({
    ...group,
    options: measuringCatalogOptionsForGroup(group.id).filter(
      (option) => !usedMeasuringFromKinds.has(option.id),
    ),
  })).filter((group) => group.options.length > 0);
  const hasAvailableMeasureOptions = availableGroups.length > 0;

  return (
    <ToolPanelShell
      toolId="measuring"
      helper="Compare distances from your anchor to a target in the play area."
    >
      <label className="block text-sm text-slate-300">
        Measuring from
        <select
          value={measureFrom}
          onChange={(event) =>
            onMeasureFromChange(event.target.value as MeasuringFromKind)
          }
          disabled={!hasAvailableMeasureOptions}
          className="mt-1 min-h-12 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 disabled:opacity-40"
        >
          {availableGroups.map((group) => (
            <optgroup key={group.id} label={group.label}>
              {group.options.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </label>
      {!hasAvailableMeasureOptions ? (
        <p className="text-sm text-slate-400">
          Every measure category has already been added to this session.
        </p>
      ) : null}
      <p className="text-sm font-medium text-slate-100">{question.prompt}</p>
      <p className="text-xs text-slate-400">{question.ruleSummary}</p>

      <div className="space-y-2">
        <p className="text-sm text-slate-300">Your anchor</p>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onUseGps}
            disabled={gpsLoading}
            className="min-h-12 rounded-xl bg-slate-800 px-3 text-sm font-medium disabled:opacity-40"
          >
            {gpsLoading ? "Reading GPS…" : "Use my location"}
          </button>
          <div className="flex min-h-12 items-center rounded-xl border border-slate-700 bg-slate-900/60 px-3 text-sm text-slate-300">
            {hasSeekerPoint
              ? (seekerPlaceName ?? "Pinned on map")
              : "Tap map for anchor"}
          </div>
        </div>
        {allowsSearch ? (
          <>
            <label className="block text-sm text-slate-300">
              Search anchor
              <input
                value={searchQuery}
                onChange={(event) => onSearchQueryChange(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    onSearchSubmit("seeker");
                  }
                }}
                className="mt-1 min-h-12 w-full rounded-xl border border-slate-700 bg-slate-900 px-3"
                placeholder="Address, business, or landmark"
                autoComplete="off"
                enterKeyHint="search"
                inputMode="search"
              />
            </label>
            <button
              type="button"
              onClick={() => onSearchSubmit("seeker")}
              disabled={searchLoading}
              className="min-h-12 w-full rounded-xl bg-slate-800 px-3 text-sm font-medium disabled:opacity-40"
            >
              {searchLoading ? "Searching…" : "Find anchor"}
            </button>
          </>
        ) : null}
      </div>

      <div className="space-y-2">
        <p className="text-sm text-slate-300">Target</p>
        {isCoastline ? (
          <>
            <button
              type="button"
              onClick={onFindCoastline}
              disabled={!hasSeekerPoint || loading}
              className="min-h-12 w-full rounded-xl bg-slate-800 px-3 text-sm font-medium disabled:opacity-40"
            >
              {loading ? "Finding coastline…" : "Find coastline in play area"}
            </button>
            {loading ? (
              <p className="text-sm text-slate-400">
                Finding coastline in the play area…
              </p>
            ) : null}
          </>
        ) : isSeaLevel ? (
          <>
            {loading ? (
              <p className="text-sm text-slate-400">
                Reading elevation and shading the play area…
              </p>
            ) : null}
            {hasTargetPoint && anchorAltitudeMeters !== null ? (
              <p className="text-sm text-slate-300">
                Your altitude is {Math.round(anchorAltitudeMeters)} m (
                {formatDistance(distanceMeters ?? 0, distanceUnit)} from sea
                level).
              </p>
            ) : null}
          </>
        ) : isLinear ? (
          <>
            <button
              type="button"
              onClick={onFindLinearFeature}
              disabled={!hasSeekerPoint || loading}
              className="min-h-12 w-full rounded-xl bg-slate-800 px-3 text-sm font-medium disabled:opacity-40"
            >
              {loading
                ? `Finding ${targetLabel.toLowerCase()}…`
                : `Find ${targetLabel.toLowerCase()} in play area`}
            </button>
            {loading ? (
              <p className="text-sm text-slate-400">
                Finding {targetLabel.toLowerCase()} in the play area…
              </p>
            ) : null}
          </>
        ) : usesAllPlacesInArea ? (
          <>
            <p className="text-sm text-slate-400">
              All {targetLabel.toLowerCase()}s in the play area are used for
              this question. Set your anchor to load them.
            </p>
            {loading ? (
              <p className="text-sm text-slate-400">
                Loading {targetLabel.toLowerCase()}s in the play area…
              </p>
            ) : null}
            {hasTargetPoint && distanceMeters !== null ? (
              <p className="text-sm text-slate-300">
                Nearest is {formatDistance(distanceMeters, distanceUnit)} away
                {targetPlaceName ? ` (${targetPlaceName})` : ""}.
              </p>
            ) : null}
          </>
        ) : (
          <>
            <div
              className={`grid gap-2 ${allowsSearch ? "grid-cols-3" : "grid-cols-2"}`}
            >
              {canUseMapTarget ? (
                <button
                  type="button"
                  onClick={() => onTargetModeChange("map")}
                  className={`min-h-12 rounded-xl px-2 text-sm ${
                    targetMode === "map"
                      ? "bg-sky-500 text-slate-950"
                      : "bg-slate-800"
                  }`}
                >
                  Map
                </button>
              ) : null}
              {allowsSearch ? (
                <button
                  type="button"
                  onClick={() => onTargetModeChange("search")}
                  className={`min-h-12 rounded-xl px-2 text-sm ${
                    targetMode === "search"
                      ? "bg-sky-500 text-slate-950"
                      : "bg-slate-800"
                  }`}
                >
                  Search
                </button>
              ) : null}
              {canFindNearest ? (
                <button
                  type="button"
                  onClick={() => onTargetModeChange("nearest")}
                  className={`min-h-12 rounded-xl px-2 text-sm ${
                    targetMode === "nearest"
                      ? "bg-sky-500 text-slate-950"
                      : "bg-slate-800"
                  }`}
                >
                  Nearest
                </button>
              ) : null}
            </div>
            {targetMode === "map" && canUseMapTarget ? (
              <p className="text-sm text-slate-400">
                {hasSeekerPoint
                  ? `Tap the map to mark the ${targetLabel.toLowerCase()}.`
                  : "Set your anchor first, then tap the map for the target."}
              </p>
            ) : null}
            {allowsSearch && targetMode === "search" ? (
              <>
                <label className="block text-sm text-slate-300">
                  Search target
                  <input
                    value={searchQuery}
                    onChange={(event) =>
                      onSearchQueryChange(event.target.value)
                    }
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        onSearchSubmit("target");
                      }
                    }}
                    className="mt-1 min-h-12 w-full rounded-xl border border-slate-700 bg-slate-900 px-3"
                    placeholder="Address, business, or landmark"
                    autoComplete="off"
                    enterKeyHint="search"
                    inputMode="search"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => onSearchSubmit("target")}
                  disabled={searchLoading || !hasSeekerPoint}
                  className="min-h-12 w-full rounded-xl bg-slate-800 px-3 text-sm font-medium disabled:opacity-40"
                >
                  {searchLoading ? "Searching…" : "Find target"}
                </button>
              </>
            ) : null}
            {targetMode === "nearest" && canFindNearest ? (
              <button
                type="button"
                onClick={onFindNearest}
                disabled={!hasSeekerPoint || loading}
                className="min-h-12 w-full rounded-xl bg-slate-800 px-3 text-sm font-medium disabled:opacity-40"
              >
                {loading
                  ? `Finding nearest ${targetLabel.toLowerCase()}…`
                  : `Find nearest ${targetLabel.toLowerCase()}`}
              </button>
            ) : null}
          </>
        )}
        <p className="text-sm text-slate-300">{targetSummary}</p>
      </div>

      {hasTargetPoint && distanceMeters !== null && !isSeaLevel ? (
        <p className="text-sm text-slate-300">
          {targetPlaceName ?? targetLabel} is{" "}
          {formatDistance(distanceMeters, distanceUnit)} from you.
        </p>
      ) : null}

      <BinaryAnswerPicker
        value={answer}
        onChange={onAnswerChange}
        options={[
          {
            value: "closer",
            label: "Closer",
            activeClassName: "bg-emerald-500 text-slate-950",
          },
          {
            value: "further",
            label: "Further",
            activeClassName: "bg-rose-500 text-slate-50",
          },
        ]}
      />

      {allowsSearch && searchResults.length > 0 ? (
        <div className="max-h-40 space-y-2 overflow-y-auto rounded-xl border border-slate-700 bg-slate-900 p-2">
          {searchResults.map((place) => (
            <button
              key={place.id}
              type="button"
              onClick={() => onSearchResultSelect(place, searchRole)}
              className="min-h-12 w-full rounded-lg bg-slate-800/70 px-3 py-2 text-left text-sm text-slate-100"
            >
              {place.displayName}
            </button>
          ))}
        </div>
      ) : null}

      <button
        type="button"
        onClick={onCommit}
        disabled={
          !hasAvailableMeasureOptions ||
          !hasSeekerPoint ||
          !hasTargetPoint ||
          answer === null
        }
        className="min-h-12 w-full rounded-xl bg-sky-500 px-3 text-sm font-semibold text-slate-950 disabled:opacity-40"
      >
        Add measure question
      </button>

      {error ? <p className="text-sm text-rose-300">{error}</p> : null}
    </ToolPanelShell>
  );
}
