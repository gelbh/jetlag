import { useEffect, useMemo, useState } from "react";
import type { Feature, MultiPolygon, Polygon } from "geojson";
import type { GameArea } from "../../domain/map/annotations";
import type { SessionRulesInput } from "../../domain/session/sessionRules";
import type { MatchingAdminLevel } from "../../domain/session/sessionCustomContent";
import { gameAreaToPolygon } from "../../domain/geometry/geometry";
import { adminBoundaryLevelsForSession } from "../../services/geo/adminDivisionAvailability";
import { fetchAdminDivisionFeaturesInArea } from "../../services/geo/adminDivisionBoundaries";
import { usePreloadStore } from "../../state/preloadStore";

export interface AdminBoundaryFeature {
  id: string;
  adminLevel: number;
  feature: Feature<Polygon | MultiPolygon>;
}

function boundaryToFeature(
  id: string,
  adminLevel: number,
  boundary: GameArea,
): AdminBoundaryFeature {
  return {
    id,
    adminLevel,
    feature: {
      type: "Feature",
      properties: { adminLevel },
      geometry: gameAreaToPolygon(boundary).geometry,
    },
  };
}

export function useAdminBoundaryFeatures(
  gameArea: GameArea | null,
  session: SessionRulesInput,
  enabled: boolean,
): {
  features: readonly AdminBoundaryFeature[];
  loading: boolean;
} {
  const adminDivisionCounts = usePreloadStore((state) => state.adminDivisionCounts);
  const regionPackId = session.regionPackId;
  const customMatchingAreas = session.customMatchingAreas;
  const [features, setFeatures] = useState<readonly AdminBoundaryFeature[]>([]);
  const [loading, setLoading] = useState(false);
  const availableLevelKey = useMemo(
    () =>
      adminBoundaryLevelsForSession(
        regionPackId,
        customMatchingAreas,
        adminDivisionCounts,
      ).join(","),
    [adminDivisionCounts, customMatchingAreas, regionPackId],
  );

  const active = enabled && gameArea !== null;

  useEffect(() => {
    if (!active || !gameArea) {
      return;
    }

    let cancelled = false;

    const load = async () => {
      setFeatures([]);
      setLoading(true);

      const availableLevels = availableLevelKey
        ? availableLevelKey.split(",").map((level) => Number(level))
        : [];

      try {
        const levelFeatures = await Promise.all(
          availableLevels.map(async (level) => {
            const divisions = await fetchAdminDivisionFeaturesInArea(
              gameArea,
              level,
              customMatchingAreas?.[level as MatchingAdminLevel],
            );

            return divisions.map((division) =>
              boundaryToFeature(division.id, division.adminLevel, division.boundary),
            );
          }),
        );

        if (!cancelled) {
          setFeatures(levelFeatures.flat());
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [active, availableLevelKey, customMatchingAreas, gameArea]);

  return {
    features: active ? features : [],
    loading: active ? loading : false,
  };
}
