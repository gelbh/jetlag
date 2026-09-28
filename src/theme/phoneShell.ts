/** Centered player phone column max width (CSS px; iPhone 16/17 Pro Max class). */
export const PHONE_SHELL_MAX_WIDTH_PX = 440;

/**
 * Phone-class landscape: map-dominant chrome (not wide desktop letterbox).
 * Viewport still phone-width even when orientation is landscape.
 */
export const PHONE_LANDSCAPE_MAX_WIDTH_PX = 1023;

export const LANDSCAPE_MAP_DOMINANT_MEDIA = `(orientation: landscape) and (max-width: ${PHONE_LANDSCAPE_MAX_WIDTH_PX}px)`;
