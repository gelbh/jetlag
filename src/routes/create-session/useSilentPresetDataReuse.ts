import {
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
  useEffect,
  useRef,
} from "react";
import type { GameArea } from "@/domain/map/annotations";
import type { RegionPackId } from "@/domain/regions/regionPack";
import type { GamePreset } from "@/domain/session/presets/gamePreset";
import {
  applySilentReuseDraftGeo,
  matchingAreaFeatureKeys,
  mergeMatchingLevels,
  stripReuseMatchingAreas,
  suggestPresetDataReuseForGameArea,
} from "@/domain/session/presets/presetDataReuse";
import type { AdvancedSessionSettingsValue } from "@/domain/session/tools/advancedSessionSettings";
import { loadRegionPackSessionBoundaries } from "@/services/geo/matching/regionPackBoundaries";

type SilentReuseOverlay = {
  pinIds: Set<string>;
  suggestionMatchingKeys: Set<string>;
  packMatchingKeys: Set<string>;
  attachedPack: boolean;
};

export type UseSilentPresetDataReuseArgs = {
  draftGameArea: GameArea | null;
  draftGameAreaFingerprint: string | null;
  presets: readonly GamePreset[];
  loadedPresetId: string | null;
  /** Set after a successful `?preset=` apply finishes. */
  appliedPresetId: string | null;
  regionPackId: RegionPackId | undefined;
  regionPackSubregionId: string | undefined;
  setAdvancedSettings: Dispatch<SetStateAction<AdvancedSessionSettingsValue>>;
  setRegionPackId: (id: RegionPackId | undefined) => void;
  setRegionPackSubregionId: (id: string | undefined) => void;
  setTransitMetroOverride: (id: string | null) => void;
  /** Shared with Load-preset apply so reuse can cancel in-flight Load boundary loads. */
  presetApplyGenerationRef: MutableRefObject<number>;
};

/**
 * Silent pack + custom geo reuse on `/create` (fingerprint-driven).
 * Keeps host-framed gameArea; never applies pack `playArea`.
 */
export function useSilentPresetDataReuse({
  draftGameArea,
  draftGameAreaFingerprint,
  presets,
  loadedPresetId,
  appliedPresetId,
  regionPackId,
  regionPackSubregionId,
  setAdvancedSettings,
  setRegionPackId,
  setRegionPackSubregionId,
  setTransitMetroOverride,
  presetApplyGenerationRef,
}: UseSilentPresetDataReuseArgs): {
  /** Call after Load-preset apply so prior silent overlay tracking is dropped. */
  resetSilentReuseOverlay: () => void;
} {
  const overlayRef = useRef<SilentReuseOverlay>({
    pinIds: new Set(),
    suggestionMatchingKeys: new Set(),
    packMatchingKeys: new Set(),
    attachedPack: false,
  });

  const resetSilentReuseOverlay = () => {
    overlayRef.current = {
      pinIds: new Set(),
      suggestionMatchingKeys: new Set(),
      packMatchingKeys: new Set(),
      attachedPack: false,
    };
  };

  useEffect(() => {
    if (!draftGameArea || !draftGameAreaFingerprint) {
      return;
    }

    // Wait for explicit ?preset= apply to finish so reuse does not cancel its boundary load.
    if (loadedPresetId && appliedPresetId !== loadedPresetId) {
      return;
    }

    const suggestion = suggestPresetDataReuseForGameArea(draftGameArea, presets, {
      excludePresetIds: loadedPresetId ? [loadedPresetId] : undefined,
    });

    const overlay = overlayRef.current;
    const hadSilentReuse =
      overlay.pinIds.size > 0 ||
      overlay.suggestionMatchingKeys.size > 0 ||
      overlay.packMatchingKeys.size > 0 ||
      overlay.attachedPack;
    const hasSuggestionSources = suggestion.sourcePresetIds.length > 0;

    if (!hasSuggestionSources && !hadSilentReuse) {
      return;
    }

    const nextPack = suggestion.regionPackId;
    const nextSub = suggestion.subregionId;
    const packChanged =
      Boolean(nextPack) && (nextPack !== regionPackId || nextSub !== regionPackSubregionId);
    const stripPackMatching = !nextPack || packChanged || !hasSuggestionSources;

    const matchingKeysToStrip = new Set(overlay.suggestionMatchingKeys);
    if (stripPackMatching) {
      for (const key of overlay.packMatchingKeys) {
        matchingKeysToStrip.add(key);
      }
    }

    const suggestionPins = suggestion.customLocationPins;
    const suggestionMatching = suggestion.customMatchingAreas;
    const reusePinIds = overlay.pinIds;
    const nextPackMatchingKeys = stripPackMatching ? new Set<string>() : overlay.packMatchingKeys;

    overlayRef.current = {
      pinIds: new Set((suggestionPins ?? []).map((pin) => pin.id)),
      suggestionMatchingKeys: matchingAreaFeatureKeys(suggestionMatching),
      packMatchingKeys: nextPackMatchingKeys,
      attachedPack: overlay.attachedPack,
    };

    setAdvancedSettings((prev) => {
      const applied = applySilentReuseDraftGeo({
        previousPins: prev.customLocationPins,
        previousMatching: prev.customMatchingAreas,
        previousReusePinIds: reusePinIds,
        previousReuseMatchingKeys: matchingKeysToStrip,
        suggestionPins,
        suggestionMatching,
      });
      return {
        ...prev,
        customMatchingAreas: applied.customMatchingAreas ?? {},
        customLocationPins: applied.customLocationPins,
      };
    });

    if (!nextPack) {
      presetApplyGenerationRef.current += 1;
      if (overlayRef.current.attachedPack) {
        overlayRef.current = { ...overlayRef.current, attachedPack: false };
        setRegionPackId(undefined);
        setRegionPackSubregionId(undefined);
        setTransitMetroOverride(null);
      }
      return;
    }

    if (!packChanged) {
      return;
    }

    overlayRef.current = { ...overlayRef.current, attachedPack: true };
    setRegionPackId(nextPack);
    setRegionPackSubregionId(nextSub);
    setTransitMetroOverride(suggestion.transitMetroId ?? null);

    const generation = ++presetApplyGenerationRef.current;
    void loadRegionPackSessionBoundaries(nextPack, nextSub)
      .then((boundaries) => {
        if (generation !== presetApplyGenerationRef.current) {
          return;
        }
        // Pack matching only: never re-apply a closed-over suggestion (same-pack race).
        const packKeys = matchingAreaFeatureKeys(boundaries.customMatchingAreas);
        const priorPackKeys = overlayRef.current.packMatchingKeys;
        overlayRef.current = {
          ...overlayRef.current,
          packMatchingKeys: packKeys,
        };
        setAdvancedSettings((current) => {
          const withoutOldPack = stripReuseMatchingAreas(
            current.customMatchingAreas,
            priorPackKeys,
          );
          const nextMatching = mergeMatchingLevels(withoutOldPack, boundaries.customMatchingAreas);
          return {
            ...current,
            customMatchingAreas: nextMatching ?? {},
          };
        });
      })
      .catch(() => {
        // Non-fatal: keep framed area; pack id may still help live fetches.
      });
  }, [
    appliedPresetId,
    draftGameArea,
    draftGameAreaFingerprint,
    loadedPresetId,
    presets,
    presetApplyGenerationRef,
    regionPackId,
    regionPackSubregionId,
    setAdvancedSettings,
    setRegionPackId,
    setRegionPackSubregionId,
    setTransitMetroOverride,
  ]);

  return { resetSilentReuseOverlay };
}
