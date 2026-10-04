import { Box, Button, Stack, Text } from "@mantine/core";
import { useCallback, useState } from "react";
import { EntryAsyncButton } from "@/components/ui/entry/EntryAsyncButton";
import { EntryHeader } from "@/components/ui/entry/EntryHeader";
import { filledStyles } from "@/components/ui/entry/entryStyles";
import { SegmentControl } from "@/components/ui/forms/SegmentControl";
import { CreateSessionMapPane } from "../../components/session/framing/CreateSessionMapPane";
import { GameAreaFramingModal } from "../../components/session/framing/GameAreaFramingModal";
import { RolePicker } from "../../components/session/identity/RolePicker";
import { AdvancedSessionSettings } from "../../components/session/settings/AdvancedSessionSettings";
import {
  buildCreateSessionPresetDraft,
  createSessionDraftToGamePreset,
} from "../../domain/session/presets/gamePreset";
import { ANALYTICS_EVENTS, track } from "../../services/core/analytics/analytics";
import { useGamePresetStore } from "../../state/gamePresetStore";
import { type CreateSheetStep, GameAreaSection } from "./GameAreaSection";
import { NestedSplitLayout } from "./NestedSplitLayout";
import { PremiumGateSection } from "./PremiumGateSection";
import { SessionSettingsSection } from "./SessionSettingsSection";
import { useCreateSession } from "./useCreateSession";

export function CreateSession() {
  const savePreset = useGamePresetStore((state) => state.savePreset);
  const session = useCreateSession();
  const [createStep, setCreateStep] = useState<CreateSheetStep>("where");

  const handleSavePreset = useCallback(() => {
    const name = window.prompt("Preset name");
    if (!name?.trim()) {
      return;
    }

    savePreset(
      createSessionDraftToGamePreset(
        buildCreateSessionPresetDraft({
          gameSize: session.gameSize,
          distanceUnit: session.distanceUnit,
          advancedSettings: session.advancedSettings,
          gameArea: session.previewGameArea,
          placeLabel: session.selectedPlace?.displayName ?? session.locationQuery,
          sessionTier: session.resolvedSessionTier,
          regionPackId: session.regionPackId,
          subregionId: session.regionPackSubregionId,
          transitMetroId: session.transitMetroId || undefined,
        }),
        name.trim(),
      ),
    );
  }, [savePreset, session]);

  const confirmBusy = session.loading || session.verifyingAccess;

  return (
    <Box className="jl-create-session flex h-full min-h-0 max-h-full flex-col overflow-hidden">
      <EntryHeader title="Create" />

      <Stack gap={0} className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <CreateSessionMapPane
          mapStyle={session.mapStyle}
          focusBounds={session.mapFocusBounds}
          mapFocusToken={session.mapFocusToken}
          previewGameArea={session.mapPreviewGameArea ?? session.previewGameArea}
          selectedGameSize={session.gameSize}
          mapRequested={session.mapRequested}
          mapMounted={session.mapMounted}
          onRequestMap={session.openMapAtLocation}
          onMapMounted={session.handleMapMounted}
          onRequestLocation={session.requestLocationBias}
          locationBusy={session.locationBusy}
          locationStatus={session.locationStatus}
          locationStatusTone={session.locationStatusTone}
        />

        <GameAreaFramingModal
          open={session.framingModalOpen}
          mapStyle={session.mapStyle}
          onMapStyleChange={session.setMapStyle}
          framing={session.framing}
          referenceGameArea={!session.manualFramingActive ? session.previewGameArea : null}
          referenceFocusBounds={!session.manualFramingActive ? session.mapFocusBounds : null}
          onClose={() => session.setFramingModalOpen(false)}
          onConfirm={session.handleFramingModalConfirm}
        />

        <NestedSplitLayout
          maxHeightClassName="max-h-[min(58dvh,640px)]"
          className="flex min-h-0 flex-1 flex-col"
          pinned={
            <div className="pb-3">
              <SegmentControl<CreateSheetStep>
                aria-label="Create steps"
                value={createStep}
                onChange={setCreateStep}
                options={[
                  { value: "where", label: "Where" },
                  { value: "rules", label: "Rules" },
                  { value: "play", label: "Play" },
                ]}
              />
            </div>
          }
          footer={
            <Box
              className="shrink-0 px-4 pt-3 pb-[max(0.25rem,var(--safe-area-bottom))]"
              style={{
                backgroundColor: "oklch(from var(--color-canvas) l c h / 0.88)",
                borderTop: "0.33px solid oklch(from var(--color-field-ink) l c h / 0.12)",
                backdropFilter: "blur(20px) saturate(1.4)",
                WebkitBackdropFilter: "blur(20px) saturate(1.4)",
              }}
            >
              <div className="flex gap-2">
                {createStep !== "where" ? (
                  <Button
                    type="button"
                    variant="subtle"
                    color="gray"
                    className="min-h-11"
                    onClick={() => setCreateStep(createStep === "play" ? "rules" : "where")}
                  >
                    Back
                  </Button>
                ) : null}
                {createStep !== "play" ? (
                  <Button
                    type="button"
                    variant="subtle"
                    color="gray"
                    className="min-h-11 flex-1"
                    onClick={() => setCreateStep(createStep === "where" ? "rules" : "play")}
                  >
                    Next
                  </Button>
                ) : (
                  <div className="min-w-0 flex-1">
                    <EntryAsyncButton
                      type="button"
                      fullWidth
                      styles={filledStyles}
                      busy={confirmBusy}
                      unavailable={session.requiresPremiumSignIn || !session.hostAuthReady}
                      idleLabel="Create game"
                      busyLabel={session.confirmLabel}
                      onClick={() => void session.handleConfirm()}
                    />
                  </div>
                )}
              </div>
              {session.hostAuthError ? (
                <Stack gap={6} mt={8}>
                  <Text c="var(--color-halt)" size="sm">
                    {session.hostAuthError}
                  </Text>
                  <Button
                    type="button"
                    variant="subtle"
                    size="compact-sm"
                    onClick={() => session.retryHostAuth()}
                  >
                    Retry
                  </Button>
                </Stack>
              ) : null}
              {session.error ? (
                <Text c="var(--color-halt)" size="sm" mt={8}>
                  {session.error}
                </Text>
              ) : null}
            </Box>
          }
        >
          <GameAreaSection
            step={createStep}
            model={{
              bundledPresetSelectGroups: session.bundledPresetSelectGroups,
              favouritePresetSelectOptions: session.favouritePresetSelectOptions,
              userPresets: session.userPresets,
              loadedPreset: session.loadedPreset,
              loading: session.loading,
              verifyingAccess: session.verifyingAccess,
              searchLoading: session.searchLoading,
              importLoading: session.importLoading,
              importFileInputRef: session.importFileInputRef,
              locationQuery: session.locationQuery,
              searchResults: session.searchResults,
              selectedPlaceId: session.selectedPlaceId,
              selectedPlace: session.selectedPlace,
              selectedAreas: session.selectedAreas,
              previewGameArea: session.previewGameArea,
              transitMetroId: session.transitMetroId,
              metros: session.metros,
              onPresetSelect: session.selectPreset,
              onSavePreset: handleSavePreset,
              onOpenFramingModal: () => {
                session.requestMap();
                session.setFramingModalOpen(true);
              },
              onRemoveSelectedArea: session.removeSelectedArea,
              onLocationQueryChange: session.handleLocationQueryChange,
              onSearch: () => void session.handleSearch(),
              onAddCurrentArea: session.addCurrentArea,
              onBoundaryImport: (event) => void session.handleBoundaryImport(event),
              onApplyPlace: session.applyPlace,
              onTransitMetroChange: session.setTransitMetroOverride,
            }}
            settingsSlot={
              <SessionSettingsSection
                loading={session.loading}
                verifyingAccess={session.verifyingAccess}
                previewGameArea={session.previewGameArea}
                gameSize={session.gameSize}
                gameSizeUserOverrode={session.gameSizeUserOverrode}
                distanceUnit={session.distanceUnit}
                onGameSizeChange={session.handleGameSizeChange}
                onGameSizeUserOverride={session.handleGameSizeUserOverride}
                onDistanceUnitChange={session.handleDistanceUnitChange}
                resolvedSessionTier={session.resolvedSessionTier}
                visibleTierOptions={session.visibleTierOptions}
                premiumEntitlements={session.premiumEntitlements}
                onSessionTierChange={session.handleSessionTierChange}
                packCreditsLabel={session.packCreditsLabel}
                packPremiumFlow={session.packPremiumFlow}
              />
            }
            advancedSlot={
              <AdvancedSessionSettings
                gameSize={session.gameSize}
                distanceUnit={session.distanceUnit}
                gameArea={session.previewGameArea}
                value={session.advancedSettings}
                onChange={session.setAdvancedSettings}
                disabled={session.loading || session.verifyingAccess}
                collapsible={false}
              />
            }
            playSlot={
              <RolePicker
                value={session.playerRole}
                onChange={(role) => {
                  session.handlePlayerRoleChange(role);
                  queueMicrotask(() => {
                    track(ANALYTICS_EVENTS.role_selected, { role, surface: "create" });
                  });
                }}
                disabled={session.loading || session.verifyingAccess}
              />
            }
          />

          {createStep === "play" ? (
            <PremiumGateSection
              requiresPremiumSignIn={session.requiresPremiumSignIn}
              showPremiumUnlockPanel={session.showPremiumUnlockPanel}
              showAccessCodeField={session.showAccessCodeField}
              accessCode={session.accessCode}
              accessCodeError={session.accessCodeError}
              accessCodeExpanded={session.accessCodeExpanded}
              onAccessCodeChange={session.handleAccessCodeChange}
              onAccessCodeExpandedChange={session.setAccessCodeExpanded}
              onPremiumSignedIn={session.handlePremiumSignedIn}
            />
          ) : null}
        </NestedSplitLayout>
      </Stack>
    </Box>
  );
}
