import { useCallback } from "react";
import { Box, Button, Stack, Text } from "@mantine/core";
import { IosEntryHeader } from "@/components/ui/apple/IosEntryHeader";
import { iosFilledStyles } from "@/components/ui/apple/iosEntryStyles";
import { CreateSessionMapPane } from "../../components/session/framing/CreateSessionMapPane";
import { GameAreaFramingModal } from "../../components/session/framing/GameAreaFramingModal";
import { MobileSheet } from "../../components/ui/sheets/MobileSheet";
import {
  buildCreateSessionPresetDraft,
  createSessionDraftToGamePreset,
} from "../../domain/session/presets/gamePreset";
import { useGamePresetStore } from "../../state/gamePresetStore";
import { GameAreaSection } from "./GameAreaSection";
import { PremiumGateSection } from "./PremiumGateSection";
import { SessionSettingsSection } from "./SessionSettingsSection";
import { useCreateSession } from "./useCreateSession";

export function CreateMantine() {
  const savePreset = useGamePresetStore((state) => state.savePreset);
  const session = useCreateSession();

  const handlePresetSelect = useCallback(
    (presetId: string) => {
      session.navigate(`/create?preset=${presetId}`);
    },
    [session],
  );

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
          placeLabel:
            session.selectedPlace?.displayName ?? session.locationQuery,
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
    <Box
      className="jl-create-session flex h-full min-h-0 max-h-full flex-col overflow-hidden"
      data-player-ux-world="survey"
    >
      <IosEntryHeader title="Create" />

      <Stack gap={0} className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <CreateSessionMapPane
          mapStyle={session.mapStyle}
          onMapStyleChange={session.setMapStyle}
          focusBounds={session.mapFocusBounds}
          previewGameArea={session.mapPreviewGameArea ?? session.previewGameArea}
          selectedGameSize={session.gameSize}
          manualFramingActive={session.manualFramingActive}
          framingMode={session.framing.framingMode}
          circleCenter={session.framing.circleCenter}
          circleRadiusMeters={session.framing.circleRadiusMeters}
          polygonVertices={session.framing.polygonVertices}
          onBoundsChange={session.framing.handleBoundsChange}
          onUserViewportFramed={session.handleUserViewportFramed}
          onMapClick={
            session.manualFramingActive &&
            (session.framing.framingMode === "circle" ||
              session.framing.framingMode === "polygon")
              ? session.framing.handleMapClick
              : undefined
          }
        />

        <GameAreaFramingModal
          open={session.framingModalOpen}
          mapStyle={session.mapStyle}
          onMapStyleChange={session.setMapStyle}
          framing={session.framing}
          referenceGameArea={
            !session.manualFramingActive ? session.previewGameArea : null
          }
          referenceFocusBounds={
            !session.manualFramingActive ? session.mapFocusBounds : null
          }
          onClose={() => session.setFramingModalOpen(false)}
          onConfirm={session.handleFramingModalConfirm}
        />

        <MobileSheet
          variant="nested"
          layout="split"
          maxHeightClassName="max-h-[min(58dvh,640px)]"
          className="flex min-h-0 flex-1 flex-col"
          footer={
            <Box
              className="shrink-0 px-4 pt-3 pb-[max(0.25rem,env(safe-area-inset-bottom))]"
              style={{
                backgroundColor: "oklch(from var(--color-canvas) l c h / 0.88)",
                borderTop:
                  "0.33px solid oklch(from var(--color-field-ink) l c h / 0.12)",
                backdropFilter: "blur(20px) saturate(1.4)",
                WebkitBackdropFilter: "blur(20px) saturate(1.4)",
              }}
            >
              <Button
                type="button"
                fullWidth
                styles={iosFilledStyles}
                onClick={() => void session.handleConfirm()}
                disabled={confirmBusy || session.requiresPremiumSignIn}
                loading={confirmBusy}
              >
                {session.confirmLabel}
              </Button>
              {session.error ? (
                <Text c="var(--color-halt)" size="sm" mt={8}>
                  {session.error}
                </Text>
              ) : null}
            </Box>
          }
        >
          <GameAreaSection
            chrome="ios"
            bundledPresetSelectGroups={session.bundledPresetSelectGroups}
            favouritePresetSelectOptions={session.favouritePresetSelectOptions}
            userPresets={session.userPresets}
            loading={session.loading}
            verifyingAccess={session.verifyingAccess}
            searchLoading={session.searchLoading}
            importLoading={session.importLoading}
            importFileInputRef={session.importFileInputRef}
            locationQuery={session.locationQuery}
            searchResults={session.searchResults}
            selectedPlaceId={session.selectedPlaceId}
            selectedPlace={session.selectedPlace}
            selectedAreas={session.selectedAreas}
            previewGameArea={session.previewGameArea}
            manualFramingActive={session.manualFramingActive}
            framing={session.framing}
            transitMetroId={session.transitMetroId}
            metros={session.metros}
            onPresetSelect={handlePresetSelect}
            onSavePreset={handleSavePreset}
            onOpenFramingModal={() => session.setFramingModalOpen(true)}
            onFramingModeChange={session.handleFramingModeChange}
            onRemoveSelectedArea={session.removeSelectedArea}
            onLocationQueryChange={session.handleLocationQueryChange}
            onSearch={() => void session.handleSearch()}
            onAddCurrentArea={session.addCurrentArea}
            onBoundaryImport={(event) => void session.handleBoundaryImport(event)}
            onApplyPlace={session.applyPlace}
            onRequestLocationBias={session.requestLocationBias}
            onTransitMetroChange={session.setTransitMetroOverride}
            settingsSlot={
              <SessionSettingsSection
                loading={session.loading}
                verifyingAccess={session.verifyingAccess}
                previewGameArea={session.previewGameArea}
                playerRole={session.playerRole}
                onPlayerRoleChange={session.handlePlayerRoleChange}
                gameSize={session.gameSize}
                distanceUnit={session.distanceUnit}
                advancedSettings={session.advancedSettings}
                onAdvancedSettingsChange={session.setAdvancedSettings}
                onGameSizeChange={session.handleGameSizeChange}
                onDistanceUnitChange={session.handleDistanceUnitChange}
                resolvedSessionTier={session.resolvedSessionTier}
                visibleTierOptions={session.visibleTierOptions}
                premiumEntitlements={session.premiumEntitlements}
                onSessionTierChange={session.handleSessionTierChange}
                packCreditsLabel={session.packCreditsLabel}
                packPremiumFlow={session.packPremiumFlow}
              />
            }
          />

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
        </MobileSheet>
      </Stack>
    </Box>
  );
}
