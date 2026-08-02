import type { MutableRefObject } from "react";
import { createThrottledPublisher } from "./mapViewportPublish";

export interface ViewportTrackerHandlers {
  onDragStart: () => void;
  onDragEnd: () => void;
  onMove: () => void;
  onZoom: () => void;
  onMoveEnd: () => void;
  onZoomEnd: () => void;
  disposePublisher: () => void;
}

/** Shared pan/publish state machine for Leaflet and MapLibre viewport trackers. */
export function createViewportTrackerHandlers(options: {
  publish: () => void;
  onUserPanStart?: () => void;
  onUserPanEnd?: () => void;
  suppressPanRef?: MutableRefObject<boolean>;
}): ViewportTrackerHandlers {
  let panActive = false;
  let skipMoveEndSchedule = false;
  const publisher = createThrottledPublisher(options.publish);

  const notifyPanStart = () => {
    if (options.suppressPanRef?.current || panActive) {
      return;
    }
    panActive = true;
    options.onUserPanStart?.();
  };

  const notifyPanEnd = () => {
    if (!panActive) {
      return;
    }
    panActive = false;
    options.onUserPanEnd?.();
  };

  return {
    onDragStart: () => {
      notifyPanStart();
    },
    onDragEnd: () => {
      notifyPanEnd();
      publisher.flush();
      skipMoveEndSchedule = true;
    },
    onMove: () => {
      publisher.schedule();
    },
    onZoom: () => {
      publisher.schedule();
    },
    onMoveEnd: () => {
      notifyPanEnd();
      if (skipMoveEndSchedule) {
        skipMoveEndSchedule = false;
        return;
      }
      publisher.schedule();
    },
    onZoomEnd: () => {
      skipMoveEndSchedule = true;
      publisher.flush();
    },
    disposePublisher: () => {
      publisher.cancel();
    },
  };
}
