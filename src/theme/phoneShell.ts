/** Centered player phone column max width. */
export const PHONE_SHELL_MAX_WIDTH_PX = 390;

/**
 * Phone-class landscape: map-dominant chrome (not wide desktop letterbox).
 * Viewport still phone-width even when orientation is landscape.
 */
export const PHONE_LANDSCAPE_MAX_WIDTH_PX = 1023;

export const LANDSCAPE_MAP_DOMINANT_MEDIA = `(orientation: landscape) and (max-width: ${PHONE_LANDSCAPE_MAX_WIDTH_PX}px)`;
