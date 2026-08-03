import { createThrottledPublisher } from "./mapViewportPublish";

export interface ViewportTrackerHandlers {
  onDragStart: () => void;
  onDragEnd: () => void;
  onMove: () => void;
  onZoom: () => void;
  onMoveEnd: () => void;
  onZoomEnd: () => void;
  disposePublisher: () => void;
  /** Test/helper: whether a user pan is currently active. */
  isPanActive: () => boolean;
}

/**
 * Shared pan/publish state machine for MapLibre viewport trackers.
 *
 * User `dragstart` always starts a pan. Placement-camera eases used to set a
 * suppress ref that raced MapFocus's dragstart clear and skipped pan start,
 * leaving chrome hide / `mapPanning` desynced after place-then-pan.
 */
export function createViewportTrackerHandlers(options: {
  publish: () => void;
  onUserPanStart?: () => void;
  onUserPanEnd?: () => void;
}): ViewportTrackerHandlers {
  let panActive = false;
  let skipMoveEndSchedule = false;
  const publisher = createThrottledPublisher(options.publish);

  const notifyPanStart = () => {
    if (panActive) {
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
      // Safety: clear pan if dragend was missed (ease interrupt, remount, etc.).
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
      notifyPanEnd();
      publisher.cancel();
    },
    isPanActive: () => panActive,
  };
}
