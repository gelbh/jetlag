import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PackAttachSource } from "@/components/presets/PackAttachChip";
import { gameAreaToBoundingBoxRaw } from "@/domain/geometry/gameArea/gameAreaBounds";
import type { GameArea } from "@/domain/map/annotations";
import { suggestRegionPackForGameArea } from "@/domain/regions/packAttach";
import type { RegionPackId } from "@/domain/regions/regionPack";

function gameAreaFingerprint(gameArea: GameArea | null): string | null {
  if (!gameArea) {
    return null;
  }
  const box = gameAreaToBoundingBoxRaw(gameArea);
  return `${box.south}:${box.west}:${box.north}:${box.east}`;
}

export interface UsePackAttachChromeOptions {
  gameArea: GameArea | null;
  /** Seed from an existing preset (bundled or previously saved). */
  initialPackId?: RegionPackId;
  initialSource?: PackAttachSource;
}

export interface PackAttachChrome {
  packId: RegionPackId | undefined;
  source: PackAttachSource;
  showRequestCta: boolean;
  clearPack: () => void;
  changePack: (packId: RegionPackId) => void;
}

/**
 * Quiet pack-attach chrome for preset / create-session editors.
 * Auto-suggests while source is auto/bundled; manual clear/change sticks
 * until the play-area fingerprint changes.
 */
export function usePackAttachChrome({
  gameArea,
  initialPackId,
  initialSource = initialPackId ? "bundled" : "auto",
}: UsePackAttachChromeOptions): PackAttachChrome {
  const [packId, setPackId] = useState<RegionPackId | undefined>(initialPackId);
  const [source, setSource] = useState<PackAttachSource>(initialSource);
  const fingerprint = useMemo(
    () => gameAreaFingerprint(gameArea),
    [gameArea],
  );
  const previousFingerprintRef = useRef(fingerprint);
  const seededPackRef = useRef(initialPackId);
  const sourceRef = useRef(source);
  const packIdRef = useRef(packId);
  sourceRef.current = source;
  packIdRef.current = packId;

  useEffect(() => {
    if (initialPackId && initialPackId !== seededPackRef.current) {
      seededPackRef.current = initialPackId;
      /* eslint-disable react-hooks/set-state-in-effect -- re-seed when preset loads */
      setPackId(initialPackId);
      setSource(initialSource);
      /* eslint-enable react-hooks/set-state-in-effect */
    }
  }, [initialPackId, initialSource]);

  useEffect(() => {
    const areaChanged = fingerprint !== previousFingerprintRef.current;
    previousFingerprintRef.current = fingerprint;
    const currentSource = sourceRef.current;
    const currentPackId = packIdRef.current;

    if (!gameArea) {
      if (currentPackId !== undefined || currentSource !== "auto") {
        /* eslint-disable react-hooks/set-state-in-effect -- sync attach to cleared area */
        setPackId(undefined);
        setSource("auto");
        /* eslint-enable react-hooks/set-state-in-effect */
      }
      return;
    }

    if (currentSource === "manual" && !areaChanged) {
      return;
    }

    const suggestion = suggestRegionPackForGameArea(gameArea);
    if (suggestion) {
      const nextSource: PackAttachSource =
        !areaChanged &&
        currentSource === "bundled" &&
        currentPackId === suggestion.packId
          ? "bundled"
          : "auto";
      if (currentPackId !== suggestion.packId || currentSource !== nextSource) {
        /* eslint-disable react-hooks/set-state-in-effect -- sync attach to suggestion */
        setPackId(suggestion.packId);
        setSource(nextSource);
        /* eslint-enable react-hooks/set-state-in-effect */
      }
      return;
    }

    if (
      (currentSource !== "bundled" || areaChanged) &&
      (currentPackId !== undefined || currentSource !== "auto")
    ) {
      /* eslint-disable react-hooks/set-state-in-effect -- clear when no suggestion */
      setPackId(undefined);
      setSource("auto");
      /* eslint-enable react-hooks/set-state-in-effect */
    }
  }, [fingerprint, gameArea]);

  const clearPack = useCallback(() => {
    setPackId(undefined);
    setSource("manual");
  }, []);

  const changePack = useCallback((next: RegionPackId) => {
    setPackId(next);
    setSource("manual");
  }, []);

  return {
    packId,
    source,
    showRequestCta: Boolean(gameArea) && packId == null,
    clearPack,
    changePack,
  };
}
