/** Home orientation for compass / play-area camera resets. */
export const MAP_CAMERA_HOME_ORIENTATION = {
  bearing: 0,
  pitch: 0,
} as const;

export type MapCameraHomeOrientation = typeof MAP_CAMERA_HOME_ORIENTATION;
