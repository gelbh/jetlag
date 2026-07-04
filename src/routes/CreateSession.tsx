import { useMemo, useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import type { LatLngBounds, LatLngBoundsExpression } from "leaflet";
import { MapView } from "../components/map/MapView";
import { GameAreaMask } from "../components/map/GameAreaMask";
import { MobileSheet } from "../components/ui/MobileSheet";
import {
  boundsToGameArea,
  boundingBoxHasMinimumSpan,
  boundingBoxToLeafletBounds,
  gameAreaToBoundingBox,
  isUsableMapBounds,
  placeToGameArea,
} from "../domain/geometry";
import { generateLocalCode } from "../domain/session";
import { LOCAL_SESSION_ID, type SessionTier } from "../domain/annotations";
import { useSessionStore, useMapStore } from "../state/sessionStore";
import {
  isFirebaseConfigured,
  ensureAnonymousUser,
} from "../services/firebase";
import { createRemoteSession } from "../services/firestoreAnnotations";
import { preloadGameAreaCaches } from "../services/gameAreaPreload";
import {
  inferTransitMetroId,
  listTransitMetros,
} from "../services/transitCatalog";
import { searchPlaces, type GeocodedPlace } from "../services/geocoding";
import { grantAccess, hasAccessClaim } from "../services/accessControl";
import { setPremiumApiContext } from "../services/premiumApiContext";

const TIER_OPTIONS: Array<{
  value: SessionTier;
  label: string;
  summary: string;
}> = [
  {
    value: "free",
    label: "Free",
    summary: "All map tools and team sync. Public map data.",
  },
  {
    value: "premium",
    label: "Premium",
    summary: "Live transit and faster map data. Host access code required once.",
  },
];

function placeToFocusBounds(place: GeocodedPlace): LatLngBoundsExpression {
  const { south, west, north, east } = place.bounds;
  return [
    [south, west],
    [north, east],
  ];
}

export function CreateSession() {
  const navigate = useNavigate();
  const setSession = useSessionStore((state) => state.setSession);
  const mapStyle = useMapStore((state) => state.mapStyle);
  const [bounds, setBounds] = useState<LatLngBounds | null>(null);
  const [focusBounds, setFocusBounds] = useState<LatLngBoundsExpression | null>(
    null,
  );
  const [locationQuery, setLocationQuery] = useState("");
  const [searchResults, setSearchResults] = useState<GeocodedPlace[]>([]);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [selectedPlace, setSelectedPlace] = useState<GeocodedPlace | null>(
    null,
  );
  const [searchLoading, setSearchLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accessCodeError, setAccessCodeError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [verifyingAccess, setVerifyingAccess] = useState(false);
  const [sessionTier, setSessionTier] = useState<SessionTier>("free");
  const [accessCode, setAccessCode] = useState("");
  const [hostHasAccessClaim, setHostHasAccessClaim] = useState(false);
  const metros = useMemo(() => listTransitMetros(), []);
  const [userFramedViewport, setUserFramedViewport] = useState(false);
  const ignoreViewportUpdatesRef = useRef(false);

  useEffect(() => {
    if (!isFirebaseConfigured()) {
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const user = await ensureAnonymousUser();
        if (cancelled) {
          return;
        }

        setHostHasAccessClaim(await hasAccessClaim(user));
      } catch {
        if (!cancelled) {
          setHostHasAccessClaim(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const inferredTransitMetroId = useMemo(() => {
    const gameArea =
      selectedPlace && !userFramedViewport
        ? placeToGameArea(selectedPlace)
        : bounds
          ? boundsToGameArea(bounds)
          : null;

    if (!gameArea) {
      return "";
    }

    return inferTransitMetroId(gameArea) ?? "";
  }, [bounds, selectedPlace, userFramedViewport]);
  const [transitMetroOverride, setTransitMetroOverride] = useState<
    string | null
  >(null);
  const [transitMetroInferenceSeed, setTransitMetroInferenceSeed] = useState(
    inferredTransitMetroId,
  );

  useEffect(() => {
    if (inferredTransitMetroId !== transitMetroInferenceSeed) {
      /* eslint-disable react-hooks/set-state-in-effect -- reset metro override when inference changes */
      setTransitMetroInferenceSeed(inferredTransitMetroId);
      setTransitMetroOverride(null);
      /* eslint-enable react-hooks/set-state-in-effect */
    }
  }, [inferredTransitMetroId, transitMetroInferenceSeed]);

  const transitMetroId = transitMetroOverride ?? inferredTransitMetroId;
  const showAccessCodeField =
    isFirebaseConfigured() &&
    sessionTier === "premium" &&
    !hostHasAccessClaim;

  const previewGameArea = useMemo(() => {
    if (selectedPlace && !userFramedViewport) {
      return placeToGameArea(selectedPlace);
    }

    if (bounds) {
      return boundsToGameArea(bounds);
    }

    return null;
  }, [bounds, selectedPlace, userFramedViewport]);

  const applyPlace = (place: GeocodedPlace) => {
    setSelectedPlaceId(place.id);
    setSelectedPlace(place);
    setSearchResults([]);
    setLocationQuery(place.displayName);
    setUserFramedViewport(false);
    ignoreViewportUpdatesRef.current = true;
    setBounds(boundingBoxToLeafletBounds(place.bounds));
    setFocusBounds(placeToFocusBounds(place));
    setError(null);
    window.setTimeout(() => {
      ignoreViewportUpdatesRef.current = false;
    }, 600);
  };

  const handleBoundsChange = (nextBounds: LatLngBounds) => {
    if (ignoreViewportUpdatesRef.current || !isUsableMapBounds(nextBounds)) {
      return;
    }

    setBounds(nextBounds);
    setUserFramedViewport(true);
  };

  const handleSearch = async () => {
    const trimmed = locationQuery.trim();
    if (trimmed.length < 2) {
      setError("Enter a city, county, state, or country.");
      return;
    }

    setSearchLoading(true);
    setError(null);

    try {
      const results = await searchPlaces(trimmed);
      if (results.length === 0) {
        setSearchResults([]);
        setError("No matching places found. Try a more specific name.");
        return;
      }

      if (results.length === 1) {
        applyPlace(results[0]);
        return;
      }

      setSearchResults(results);
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Unable to search for that place.",
      );
    } finally {
      setSearchLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!bounds && !selectedPlace) {
      setError(
        "Search for a place or move the map until the play area is framed.",
      );
      return;
    }

    setLoading(true);
    setError(null);
    setAccessCodeError(null);

    try {
      const viewportArea = bounds ? boundsToGameArea(bounds) : null;
      const gameArea =
        viewportArea &&
        userFramedViewport &&
        boundingBoxHasMinimumSpan(gameAreaToBoundingBox(viewportArea))
          ? viewportArea
          : selectedPlace
            ? placeToGameArea(selectedPlace)
            : viewportArea;

      if (!gameArea) {
        setError(
          "Search for a place or move the map until the play area is framed.",
        );
        return;
      }

      const metroId = transitMetroId || undefined;
      const tier =
        isFirebaseConfigured() && sessionTier === "premium" ? "premium" : "free";

      if (tier === "premium" && !hostHasAccessClaim) {
        const trimmedCode = accessCode.trim();
        if (!trimmedCode) {
          setAccessCodeError("Enter the host access code.");
          return;
        }

        setVerifyingAccess(true);
        try {
          await grantAccess(trimmedCode);
          setHostHasAccessClaim(true);
        } catch (nextError) {
          setAccessCodeError(
            nextError instanceof Error
              ? nextError.message
              : "Invalid access code.",
          );
          return;
        } finally {
          setVerifyingAccess(false);
        }
      }

      if (isFirebaseConfigured()) {
        const user = await ensureAnonymousUser();
        const session = await createRemoteSession(
          gameArea,
          user.uid,
          tier,
          metroId,
        );
        setSession(session);
        setPremiumApiContext(session);
        preloadGameAreaCaches(gameArea);
      } else {
        const localSession = {
          id: LOCAL_SESSION_ID,
          code: generateLocalCode(),
          gameArea,
          createdAt: new Date().toISOString(),
          memberUids: [],
          tier: "free" as const,
          transitMetroId: metroId,
        };
        setSession(localSession);
        setPremiumApiContext(localSession);
        preloadGameAreaCaches(gameArea);
      }

      navigate("/map");
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Unable to create session.",
      );
    } finally {
      setLoading(false);
    }
  };

  const confirmLabel = verifyingAccess
    ? "Verifying…"
    : loading
      ? "Creating…"
      : "Confirm game area";

  return (
    <div className="relative h-full min-h-[100dvh]">
      <MapView
        mapStyle={mapStyle}
        onBoundsChange={handleBoundsChange}
        zoom={12}
        focusBounds={focusBounds}
      >
        {previewGameArea ? (
          <GameAreaMask gameArea={previewGameArea} framing />
        ) : null}
      </MapView>

      <MobileSheet maxHeightClassName="max-h-[min(78dvh,720px)]">
        <h1 className="text-xl font-semibold text-ink">Frame the game area</h1>
        <p className="mt-2 text-pretty text-sm text-ink-muted">
          Search for a city or county to use its boundary, or pan and zoom to
          frame a custom play area.
        </p>

        <label className="field-label mt-4">
          City, county, state, or country
          <input
            value={locationQuery}
            onChange={(event) => {
              setLocationQuery(event.target.value);
              setSelectedPlaceId(null);
              setSelectedPlace(null);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void handleSearch();
              }
            }}
            className="field-input"
            placeholder="Dublin, Ireland"
            autoComplete="off"
            enterKeyHint="search"
            inputMode="search"
          />
        </label>

        <button
          type="button"
          onClick={() => void handleSearch()}
          disabled={searchLoading}
          className="btn-secondary mt-3 w-full disabled:opacity-50"
        >
          {searchLoading ? "Searching…" : "Find place"}
        </button>

        {searchResults.length > 0 ? (
          <div className="mt-3 max-h-40 space-y-2 overflow-y-auto rounded-[var(--radius-hud-md)] border border-border bg-surface-base p-2">
            {searchResults.map((place) => (
              <button
                key={place.id}
                type="button"
                onClick={() => applyPlace(place)}
                className={`min-h-12 w-full rounded-[var(--radius-hud-sm)] px-3 py-2 text-left text-sm ${
                  selectedPlaceId === place.id
                    ? "bg-action-soft text-status-info"
                    : "bg-surface-raised text-ink"
                }`}
              >
                {place.displayName}
              </button>
            ))}
          </div>
        ) : null}

        <label className="field-label mt-4">
          Transit metro
          <select
            value={transitMetroId}
            onChange={(event) => setTransitMetroOverride(event.target.value)}
            className="field-input"
          >
            <option value="">Auto / none</option>
            {metros.map((metro) => (
              <option key={metro.id} value={metro.id}>
                {metro.label}
              </option>
            ))}
          </select>
        </label>

        {isFirebaseConfigured() ? (
          <div className="mt-4 space-y-2">
            <p className="text-sm font-medium text-ink">Session tier</p>
            <div
              role="radiogroup"
              aria-label="Session tier"
              className="space-y-2"
            >
              {TIER_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={sessionTier === option.value}
                  disabled={loading || verifyingAccess}
                  onClick={() => {
                    setSessionTier(option.value);
                    setAccessCodeError(null);
                  }}
                  className={`min-h-12 w-full rounded-[var(--radius-hud-sm)] px-3 py-2 text-left disabled:opacity-50 ${
                    sessionTier === option.value
                      ? "bg-action-soft text-status-info"
                      : "bg-surface-raised text-ink"
                  }`}
                >
                  <span className="block text-sm font-medium">{option.label}</span>
                  <span className="mt-0.5 block text-xs text-ink-muted">
                    {option.summary}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div
          className={`overflow-hidden motion-safe:transition-[max-height,opacity] motion-safe:duration-200 motion-safe:ease-[cubic-bezier(0.25,1,0.5,1)] motion-reduce:transition-none ${
            showAccessCodeField
              ? "max-h-40 opacity-100"
              : "max-h-0 opacity-0"
          }`}
        >
          <label className="field-label mt-4">
            Host access code
            <input
              value={accessCode}
              onChange={(event) => {
                setAccessCode(event.target.value);
                setAccessCodeError(null);
              }}
              type="password"
              autoComplete="off"
              enterKeyHint="done"
              className="field-input"
            />
          </label>
          <p className="mt-1 text-xs text-ink-dim">
            Enter once. Friends join with the game code only.
          </p>
          {accessCodeError ? (
            <p className="text-error mt-2">{accessCodeError}</p>
          ) : null}
        </div>

        <button
          type="button"
          onClick={() => void handleConfirm()}
          disabled={loading || verifyingAccess}
          className="btn-primary mt-4 w-full disabled:opacity-50"
        >
          {confirmLabel}
        </button>
        {error ? <p className="text-error mt-2">{error}</p> : null}
      </MobileSheet>
    </div>
  );
}
