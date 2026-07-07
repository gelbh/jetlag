import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AnnotationType } from "../domain/map/annotations";
import type { DistanceUnit } from "../domain/map/distance";
import type { MapTool } from "../domain/map/mapToolTypes";
import type { TransitRouteFilter } from "../domain/map/transit";
import type { NotificationPreferences } from "../domain/device/notifications";
import { DEFAULT_NOTIFICATION_PREFERENCES } from "../domain/device/notifications";
import type { MapStyle } from "../domain/map/mapBasemaps";

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
  keepScreenAwake: boolean;
  lowPowerMode: boolean;
  notificationPreferences: NotificationPreferences;
  distanceUnit: DistanceUnit;
  mapStyle: MapStyle;
  layerVisibility: LayerVisibility;
  setActiveTool: (tool: MapTool) => void;
  setTransitEnabled: (enabled: boolean) => void;
  setTransitLiveEnabled: (enabled: boolean) => void;
  setTransitRouteFilter: (filter: TransitRouteFilter) => void;
  setShowCurrentLocation: (enabled: boolean) => void;
  setKeepScreenAwake: (enabled: boolean) => void;
  setLowPowerMode: (enabled: boolean) => void;
  setNotificationPreferences: (preferences: NotificationPreferences) => void;
  setDistanceUnit: (unit: DistanceUnit) => void;
  setMapStyle: (style: MapStyle) => void;
  setLayerVisibility: (layer: keyof LayerVisibility, visible: boolean) => void;
}>()(
  persist(
    (set) => ({
      activeTool: "none",
      transitEnabled: false,
      transitLiveEnabled: false,
      transitRouteFilter: "all",
      showCurrentLocation: true,
      keepScreenAwake: false,
      lowPowerMode: false,
      notificationPreferences: DEFAULT_NOTIFICATION_PREFERENCES,
      distanceUnit: "imperial",
      mapStyle: "standard",
      layerVisibility: DEFAULT_LAYER_VISIBILITY,
      setActiveTool: (activeTool) => set({ activeTool }),
      setTransitEnabled: (transitEnabled) => set({ transitEnabled }),
      setTransitLiveEnabled: (transitLiveEnabled) =>
        set({ transitLiveEnabled }),
      setTransitRouteFilter: (transitRouteFilter) =>
        set({ transitRouteFilter }),
      setShowCurrentLocation: (showCurrentLocation) =>
        set({ showCurrentLocation }),
      setKeepScreenAwake: (keepScreenAwake) => set({ keepScreenAwake }),
      setLowPowerMode: (lowPowerMode) => set({ lowPowerMode }),
      setNotificationPreferences: (notificationPreferences) =>
        set({ notificationPreferences }),
      setDistanceUnit: (distanceUnit) => set({ distanceUnit }),
      setMapStyle: (mapStyle) => set({ mapStyle }),
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
      merge: (persistedState, currentState) => ({
        ...currentState,
        ...((persistedState as typeof currentState | undefined) ?? {}),
        showCurrentLocation: true,
        layerVisibility: {
          ...DEFAULT_LAYER_VISIBILITY,
          ...((persistedState as typeof currentState | undefined)
            ?.layerVisibility ?? {}),
        },
      }),
      partialize: (state) => ({
        keepScreenAwake: state.keepScreenAwake,
        lowPowerMode: state.lowPowerMode,
        notificationPreferences: state.notificationPreferences,
        distanceUnit: state.distanceUnit,
        mapStyle: state.mapStyle,
        layerVisibility: state.layerVisibility,
      }),
    },
  ),
);
