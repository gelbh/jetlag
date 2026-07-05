import { useAnnotationStore } from "../../state/annotationStore";
import { useMapStore } from "../../state/mapStore";
import { useSessionStore } from "../../state/sessionStore";
import { useTimerStore } from "../../state/timerStore";

export function resetAllStores(): void {
  useSessionStore.setState({
    session: null,
    pendingWrites: 0,
    syncInFlight: 0,
    lastSyncError: null,
    remoteUpdateNotice: null,
  });
  useAnnotationStore.setState({
    annotations: [],
    redoAnnotationIds: [],
    selectedAnnotationId: null,
    geometryEditAnnotationId: null,
    pulsingAnnotationIds: [],
  });
  useMapStore.setState({
    activeTool: "none",
    transitEnabled: false,
    transitLiveEnabled: false,
    transitRouteFilter: "all",
    showCurrentLocation: true,
    keepScreenAwake: false,
    distanceUnit: "imperial",
    mapStyle: "standard",
    layerVisibility: {
      radar: true,
      thermometer: true,
      measuring: true,
      matching: true,
      zone: true,
      pin: true,
      tentacle: true,
      transit: true,
    },
  });
  useTimerStore.setState({ bySessionId: {} });
}
