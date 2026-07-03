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
import { LOCAL_SESSION_ID } from "../domain/annotations";
import { useSessionStore } from "../state/sessionStore";
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
  const [loading, setLoading] = useState(false);
  const metros = useMemo(() => listTransitMetros(), []);
  const [userFramedViewport, setUserFramedViewport] = useState(false);
  const ignoreViewportUpdatesRef = useRef(false);

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

      if (isFirebaseConfigured()) {
        const user = await ensureAnonymousUser();
        const session = await createRemoteSession(gameArea, user.uid, metroId);
        setSession(session);
      } else {
        setSession({
          id: LOCAL_SESSION_ID,
          code: generateLocalCode(),
          gameArea,
          createdAt: new Date().toISOString(),
          memberUids: [],
          transitMetroId: metroId,
        });
      }

      preloadGameAreaCaches(gameArea);
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

  return (
    <div className="relative h-full min-h-[100dvh]">
      <MapView
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

        <button
          type="button"
          onClick={() => void handleConfirm()}
          disabled={loading}
          className="btn-primary mt-4 w-full disabled:opacity-50"
        >
          {loading ? "Creating…" : "Confirm game area"}
        </button>
        {error ? <p className="text-error mt-2">{error}</p> : null}
      </MobileSheet>
    </div>
  );
}
