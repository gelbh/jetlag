import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AnnotationType } from "../domain/map/annotations";
import type { DistanceUnit } from "../domain/map/distance";
import type { MapTool } from "../domain/map/mapToolTypes";
import type { TransitRouteFilter } from "../domain/map/transit";
import type { NotificationPreferences } from "../domain/device/chrome/notifications";
import { DEFAULT_NOTIFICATION_PREFERENCES } from "../domain/device/chrome/notifications";
import type { MapStyle, StreetBasemap } from "../domain/map/mapBasemaps";

export type LayerVisibility = Record<AnnotationType | "transit", boolean>;

const DEFAULT_LAYER_VISIBILITY: LayerVisibility = {
  radar: true,
  thermometer: true,
  measuring: true,
  matching: true,
  zone: true,
  pin: true,
  tentacle: true,
  transit: true,
};

export const useMapStore = create<{
  activeTool: MapTool;
  transitEnabled: boolean;
  transitLiveEnabled: boolean;
  transitRouteFilter: TransitRouteFilter;
  showCurrentLocation: boolean;
  showAdminBoundaries: boolean;
  keepScreenAwake: boolean;
  lowPowerMode: boolean;
  /** MapLibre tilt gestures; default flat. */
  mapPitchEnabled: boolean;
  notificationPreferences: NotificationPreferences;
  distanceUnit: DistanceUnit;
  mapStyle: MapStyle;
  streetBasemap: StreetBasemap;
  layerVisibility: LayerVisibility;
  setActiveTool: (tool: MapTool) => void;
  setTransitEnabled: (enabled: boolean) => void;
  setTransitLiveEnabled: (enabled: boolean) => void;
  setTransitRouteFilter: (filter: TransitRouteFilter) => void;
  setShowCurrentLocation: (enabled: boolean) => void;
  setShowAdminBoundaries: (enabled: boolean) => void;
  setKeepScreenAwake: (enabled: boolean) => void;
  setLowPowerMode: (enabled: boolean) => void;
  setMapPitchEnabled: (enabled: boolean) => void;
  setNotificationPreferences: (preferences: NotificationPreferences) => void;
  setDistanceUnit: (unit: DistanceUnit) => void;
  setMapStyle: (style: MapStyle) => void;
  setStreetBasemap: (streetBasemap: StreetBasemap) => void;
  setLayerVisibility: (layer: keyof LayerVisibility, visible: boolean) => void;
}>()(
  persist(
    (set) => ({
      activeTool: "none",
      transitEnabled: false,
      transitLiveEnabled: false,
      transitRouteFilter: "all",
      showCurrentLocation: true,
      showAdminBoundaries: false,
      keepScreenAwake: false,
      lowPowerMode: false,
      mapPitchEnabled: false,
      notificationPreferences: DEFAULT_NOTIFICATION_PREFERENCES,
      distanceUnit: "imperial",
      mapStyle: "standard",
      streetBasemap: "light",
      layerVisibility: DEFAULT_LAYER_VISIBILITY,
      setActiveTool: (activeTool) => set({ activeTool }),
      setTransitEnabled: (transitEnabled) => set({ transitEnabled }),
      setTransitLiveEnabled: (transitLiveEnabled) =>
        set({ transitLiveEnabled }),
      setTransitRouteFilter: (transitRouteFilter) =>
        set({ transitRouteFilter }),
      setShowCurrentLocation: (showCurrentLocation) =>
        set({ showCurrentLocation }),
      setShowAdminBoundaries: (showAdminBoundaries) =>
        set({ showAdminBoundaries }),
      setKeepScreenAwake: (keepScreenAwake) => set({ keepScreenAwake }),
      setLowPowerMode: (lowPowerMode) => set({ lowPowerMode }),
      setMapPitchEnabled: (mapPitchEnabled) => set({ mapPitchEnabled }),
      setNotificationPreferences: (notificationPreferences) =>
        set({ notificationPreferences }),
      setDistanceUnit: (distanceUnit) => set({ distanceUnit }),
      setMapStyle: (mapStyle) => set({ mapStyle }),
      setStreetBasemap: (streetBasemap) => set({ streetBasemap }),
      setLayerVisibility: (layer, visible) =>
        set((state) => ({
          layerVisibility: {
            ...state.layerVisibility,
            [layer]: visible,
          },
        })),
    }),
    {
      name: "jetlag-map",
      merge: (persistedState, currentState) => {
        const persisted = {
          ...currentState,
          ...((persistedState as Partial<typeof currentState> | undefined) ??
            {}),
        };
        return {
          ...persisted,
          streetBasemap:
            persisted.streetBasemap === "dark" ||
            persisted.streetBasemap === "light"
              ? persisted.streetBasemap
              : "light",
          mapPitchEnabled: persisted.mapPitchEnabled === true,
          showCurrentLocation: true,
          showAdminBoundaries: persisted.showAdminBoundaries ?? false,
          layerVisibility: {
            ...DEFAULT_LAYER_VISIBILITY,
            ...(persisted.layerVisibility ?? {}),
          },
        };
      },
      partialize: (state) => ({
        keepScreenAwake: state.keepScreenAwake,
        lowPowerMode: state.lowPowerMode,
        mapPitchEnabled: state.mapPitchEnabled,
        notificationPreferences: state.notificationPreferences,
        distanceUnit: state.distanceUnit,
        mapStyle: state.mapStyle,
        streetBasemap: state.streetBasemap,
        showAdminBoundaries: state.showAdminBoundaries,
        layerVisibility: state.layerVisibility,
      }),
    },
  ),
);
