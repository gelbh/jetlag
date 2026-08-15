import { type Page } from "@playwright/test";
import { E2E_GEOLOCATION } from "./map";

type E2eGeoPoint = { latitude: number; longitude: number; accuracy?: number };

/**
 * Playwright's CDP geolocation override often leaves `watchPosition` quiet.
 * Drive walk / live-location hooks by patching `navigator.geolocation` in-page
 * and notifying active watchers on each step.
 */
export async function installE2eGeolocationDriver(
  page: Page,
  initial: E2eGeoPoint = E2E_GEOLOCATION,
): Promise<void> {
  await page.context().setGeolocation({
    latitude: initial.latitude,
    longitude: initial.longitude,
    accuracy: initial.accuracy ?? 5,
  });

  await page.evaluate((start) => {
    type Driver = {
      lat: number;
      lng: number;
      accuracy: number;
      watchers: Map<number, PositionCallback>;
      nextId: number;
    };

    const root = window as unknown as { __jlE2eGeo?: Driver };
    if (root.__jlE2eGeo) {
      root.__jlE2eGeo.lat = start.latitude;
      root.__jlE2eGeo.lng = start.longitude;
      root.__jlE2eGeo.accuracy = start.accuracy ?? 5;
      return;
    }

    const state: Driver = {
      lat: start.latitude,
      lng: start.longitude,
      accuracy: start.accuracy ?? 5,
      watchers: new Map(),
      nextId: 1,
    };
    root.__jlE2eGeo = state;

    const makePosition = (): GeolocationPosition =>
      ({
        coords: {
          latitude: state.lat,
          longitude: state.lng,
          accuracy: state.accuracy,
          altitude: null,
          altitudeAccuracy: null,
          heading: null,
          speed: null,
          toJSON: () => ({}),
        },
        timestamp: Date.now(),
        toJSON: () => ({}),
      }) as GeolocationPosition;

    navigator.geolocation.getCurrentPosition = (success, error) => {
      try {
        success(makePosition());
      } catch (err) {
        error?.({
          code: 2,
          message: err instanceof Error ? err.message : "GPS unavailable",
          PERMISSION_DENIED: 1,
          POSITION_UNAVAILABLE: 2,
          TIMEOUT: 3,
        } as GeolocationPositionError);
      }
    };

    navigator.geolocation.watchPosition = (success) => {
      const id = state.nextId++;
      state.watchers.set(id, success);
      success(makePosition());
      return id;
    };

    navigator.geolocation.clearWatch = (id) => {
      state.watchers.delete(id);
    };
  }, initial);
}

export async function stepE2eGeolocation(
  page: Page,
  point: E2eGeoPoint,
): Promise<void> {
  await page.context().setGeolocation({
    latitude: point.latitude,
    longitude: point.longitude,
    accuracy: point.accuracy ?? 5,
  });

  await page.evaluate((next) => {
    const state = (window as unknown as { __jlE2eGeo?: {
      lat: number;
      lng: number;
      accuracy: number;
      watchers: Map<number, PositionCallback>;
    } }).__jlE2eGeo;
    if (!state) {
      return;
    }

    state.lat = next.latitude;
    state.lng = next.longitude;
    state.accuracy = next.accuracy ?? 5;

    const position = {
      coords: {
        latitude: state.lat,
        longitude: state.lng,
        accuracy: state.accuracy,
        altitude: null,
        altitudeAccuracy: null,
        heading: null,
        speed: null,
        toJSON: () => ({}),
      },
      timestamp: Date.now(),
      toJSON: () => ({}),
    } as GeolocationPosition;

    for (const callback of state.watchers.values()) {
      callback(position);
    }
  }, point);
}
