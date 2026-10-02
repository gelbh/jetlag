import { Box, Button, SegmentedControl, Stack, Text, TextInput } from "@mantine/core";
import { Link } from "react-router-dom";
import {
  ErrorCallout,
  filledStyles,
  grayStyles,
  InsetGroup,
  plainStyles,
  SectionLabel,
} from "@/components/ui/entry/entryChrome";
import { PackAttachChip } from "../components/presets/PackAttachChip";
import { RequestPackWhenUnavailable } from "../components/presets/RequestPackWhenUnavailable";
import { GameAreaFramingStats } from "../components/session/framing/GameAreaFramingControls";
import { GameAreaFramingModal } from "../components/session/framing/GameAreaFramingModal";
import { PlaceAreaSearchFields } from "../components/session/framing/PlaceAreaSearchFields";
import { GameSizePicker } from "../components/session/identity/GameSizePicker";
import { AdvancedSessionSettings } from "../components/session/settings/AdvancedSessionSettings";
import { buildPreloadPresetSnapshot } from "../domain/preloadRequest/buildPreloadPresetSnapshot";
import { hidingZoneRadiusMeters } from "../domain/session/size/gameSize";
import { defaultAdvancedSessionSettings } from "../domain/session/tools/advancedSessionSettings";
import { useGamePresetEditorModel } from "./GamePresetEditorModel";

/** Join-style iOS editor body for Mantine presets (title lives in EntryHeader). */
export function GamePresetEditorContent() {
  const model = useGamePresetEditorModel();

  return (
    <>
      <GameAreaFramingModal
        open={model.framingModalOpen}
        mapStyle={model.mapStyle}
        onMapStyleChange={model.setMapStyle}
        framing={model.framing}
        referenceGameArea={!model.framing.userFramed ? model.gameArea : null}
        referenceFocusBounds={!model.framing.userFramed ? model.referenceFocusBounds : null}
        onClose={() => model.setFramingModalOpen(false)}
        onConfirm={(result) => {
          const manualResult = model.framing.userFramed;
          model.setGameArea(result.gameArea);
          model.setFocusBounds(result.focusBounds);
          if (manualResult) {
            model.setPlaceLabel("");
            model.placeSearch.resetSearch();
          }
          model.framing.loadFramingResult(result);
        }}
      />

      <Stack gap={22}>
        {model.needsMigrationReview ? (
          <Box
            role="status"
            style={{
              borderRadius: 12,
              padding: "0.75rem 1rem",
              backgroundColor: "oklch(from var(--color-status-warning) l c h / 0.14)",
              border: "0.33px solid oklch(from var(--color-status-warning) l c h / 0.35)",
            }}
          >
            <Text size="sm" fw={510} c="var(--color-status-warning)">
              This preset uses an older format. Review settings and save to upgrade.
            </Text>
          </Box>
        ) : null}

        <Stack gap={8}>
          <SectionLabel>Play boundary</SectionLabel>
          <Text size="xs" c="var(--color-field-ink-muted)" px={4}>
            Optional. Search for a place or draw the play area on the map.
          </Text>

          <div className="flex flex-col gap-3">
            <PlaceAreaSearchFields
              locationQuery={model.placeSearch.locationQuery}
              onLocationQueryChange={model.placeSearch.setLocationQuery}
              onSearch={() => void model.placeSearch.handleSearch()}
              searchLoading={model.placeSearch.searchLoading}
              searchResults={model.placeSearch.searchResults}
              selectedPlaceId={model.placeSearch.selectedPlaceId}
              selectedPlace={model.placeSearch.selectedPlace}
              onSelectPlace={model.placeSearch.applyPlace}
            />
          </div>

          {model.placeSearch.searchError ? (
            <ErrorCallout>{model.placeSearch.searchError}</ErrorCallout>
          ) : null}

          <Button
            type="button"
            fullWidth
            styles={filledStyles}
            onClick={() => model.setFramingModalOpen(true)}
            disabled={model.placeSearch.searchLoading}
          >
            Open fullscreen map
          </Button>

          {model.gameArea ? (
            <Stack
              gap="sm"
              pt="sm"
              style={{
                borderTop: "0.33px solid oklch(from var(--color-field-ink) l c h / 0.12)",
              }}
            >
              <GameAreaFramingStats gameArea={model.gameArea} compact />
              <Button
                type="button"
                styles={plainStyles}
                onClick={() => model.setFramingModalOpen(true)}
              >
                Reframe
              </Button>
              <Button
                type="button"
                styles={{
                  root: {
                    minHeight: "2.75rem",
                    borderRadius: 14,
                    border: "none",
                    backgroundColor: "transparent",
                    color: "var(--color-halt)",
                    fontWeight: 510,
                    "&:hover": {
                      backgroundColor: "oklch(from var(--color-halt) l c h / 0.12)",
                    },
                  },
                }}
                onClick={() => {
                  model.setGameArea(null);
                  model.setPlaceLabel("");
                  model.setFocusBounds(null);
                  model.placeSearch.resetSearch();
                  model.framing.resetManualFraming();
                }}
              >
                Clear
              </Button>
              {model.packAttach.packId ? (
                <PackAttachChip
                  packId={model.packAttach.packId}
                  source={model.packAttach.source}
                  onClear={model.packAttach.clearPack}
                  onChangePack={model.packAttach.changePack}
                />
              ) : null}
            </Stack>
          ) : null}
        </Stack>

        <Stack gap={8}>
          <SectionLabel>Preset name</SectionLabel>
          <InsetGroup>
            <TextInput
              aria-label="Preset name"
              value={model.name}
              onChange={(event) => {
                model.setName(event.currentTarget.value);
                model.setError(null);
              }}
              styles={{
                input: {
                  border: "none",
                  background: "transparent",
                  minHeight: "3.25rem",
                  color: "var(--color-field-ink)",
                  fontSize: "1rem",
                  fontWeight: 510,
                  paddingInline: "1rem",
                },
              }}
            />
          </InsetGroup>
        </Stack>

        <Stack gap={8}>
          <SectionLabel>Distance edition</SectionLabel>
          <SegmentedControl
            fullWidth
            value={model.distanceUnit}
            onChange={(value) => {
              const unit = value as "imperial" | "metric";
              model.setDistanceUnit(unit);
              model.setAdvancedSettings(defaultAdvancedSessionSettings(model.gameSize, unit));
            }}
            data={[
              { label: "Imperial (mi)", value: "imperial" },
              { label: "Metric (km)", value: "metric" },
            ]}
            aria-label="Distance edition"
            styles={{
              root: {
                backgroundColor: "oklch(from var(--color-field-ink) l c h / 0.08)",
                border: "0.33px solid oklch(from var(--color-field-ink) l c h / 0.12)",
                borderRadius: 12,
                padding: 2,
              },
              label: {
                color: "var(--color-field-ink)",
                fontWeight: 510,
                fontSize: "0.875rem",
              },
              indicator: {
                backgroundColor: "oklch(from var(--color-field-ink) l c h / 0.16)",
                borderRadius: 10,
              },
            }}
          />
        </Stack>

        <div className="flex flex-col gap-4">
          <GameSizePicker
            gameArea={model.gameArea}
            value={model.gameSize}
            distanceUnit={model.distanceUnit}
            onChange={(size) => {
              model.setGameSize(size);
              model.setAdvancedSettings((current) => ({
                ...defaultAdvancedSessionSettings(size, model.distanceUnit),
                ...current,
                hidingZoneRadiusMeters: hidingZoneRadiusMeters(size, model.distanceUnit),
              }));
            }}
          />

          <AdvancedSessionSettings
            gameSize={model.gameSize}
            distanceUnit={model.distanceUnit}
            value={model.advancedSettings}
            onChange={model.setAdvancedSettings}
          />

          {model.isUserPreset && model.packAttach.showRequestCta ? (
            <RequestPackWhenUnavailable
              getSnapshot={() =>
                buildPreloadPresetSnapshot({
                  name: model.name,
                  placeLabel: model.placeLabel,
                  gameSize: model.gameSize,
                  distanceUnit: model.distanceUnit,
                  focusBounds: model.focusBounds,
                  gameArea: model.gameArea,
                  regionPackId: model.packAttach.packId,
                  presetId: model.existing?.id,
                })
              }
            />
          ) : null}
        </div>

        <ErrorCallout>{model.error}</ErrorCallout>

        <Stack gap="sm">
          <Button type="button" fullWidth styles={filledStyles} onClick={model.handleSave}>
            Save preset
          </Button>
          {model.existing && !model.needsMigrationReview ? (
            <Button
              component={Link}
              to={`/create?preset=${model.existing.id}`}
              fullWidth
              styles={grayStyles}
            >
              Host
            </Button>
          ) : null}
          {model.existing ? (
            <Button
              type="button"
              fullWidth
              styles={grayStyles}
              onClick={() => {
                model.deletePreset(model.existing!.id);
                model.navigate("/presets");
              }}
            >
              Delete
            </Button>
          ) : null}
          <Button component={Link} to="/presets" fullWidth styles={plainStyles}>
            Cancel
          </Button>
        </Stack>
      </Stack>
    </>
  );
}
