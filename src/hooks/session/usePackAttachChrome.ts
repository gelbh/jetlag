import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { GameArea } from "@/domain/map/annotations";
import {
  playAreaAttachFingerprint,
  resolvePackAttachChrome,
  suggestRegionPackForGameArea,
  type PackAttachManualOverride,
  type PackAttachSource,
} from "@/domain/regions/packAttach";
import type { RegionPackId } from "@/domain/regions/regionPack";

export type { PackAttachSource };

export interface UsePackAttachChromeOptions {
  gameArea: GameArea | null;
  /** Seed from an existing preset (bundled or previously saved). */
  initialPackId?: RegionPackId;
}

export interface PackAttachChrome {
  packId: RegionPackId | undefined;
  source: PackAttachSource;
  showRequestCta: boolean;
  clearPack: () => void;
  changePack: (packId: RegionPackId) => void;
}

/**
 * Quiet pack-attach chrome for preset editors.
 * Auto-suggests from play-area overlap; manual clear/change sticks until the
 * AABB fingerprint changes.
 */
export function usePackAttachChrome({
  gameArea,
  initialPackId,
}: UsePackAttachChromeOptions): PackAttachChrome {
  const [manual, setManual] = useState<PackAttachManualOverride | null>(null);
  const [seededPackId, setSeededPackId] = useState<RegionPackId | undefined>(
    initialPackId,
  );
  const seededRef = useRef(initialPackId);

  useEffect(() => {
    if (initialPackId && initialPackId !== seededRef.current) {
      seededRef.current = initialPackId;
      /* eslint-disable react-hooks/set-state-in-effect -- re-seed when preset loads */
      setSeededPackId(initialPackId);
      setManual(null);
      /* eslint-enable react-hooks/set-state-in-effect */
    }
  }, [initialPackId]);

  const fingerprint = useMemo(
    () => playAreaAttachFingerprint(gameArea),
    [gameArea],
  );
  const suggestion = useMemo(
    () => (gameArea ? suggestRegionPackForGameArea(gameArea) : null),
    [gameArea],
  );
  const resolved = useMemo(
    () =>
      resolvePackAttachChrome({
        gameArea,
        fingerprint,
        suggestion,
        manual,
        seededPackId,
      }),
    [fingerprint, gameArea, manual, seededPackId, suggestion],
  );

  const clearPack = useCallback(() => {
    setManual({ fingerprint, packId: undefined });
  }, [fingerprint]);

  const changePack = useCallback(
    (next: RegionPackId) => {
      setManual({ fingerprint, packId: next });
    },
    [fingerprint],
  );

  return {
    packId: resolved.packId,
    source: resolved.source,
    showRequestCta: resolved.showRequestCta,
    clearPack,
    changePack,
  };
}
