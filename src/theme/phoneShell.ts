/** Centered player phone column max width (CSS px; iPhone 16/17 Pro Max class). */
export const PHONE_SHELL_MAX_WIDTH_PX = 440;

/** Phones on their side are 360-466px tall; the smallest landscape tablet is 744px. */
export const PHONE_LANDSCAPE_MAX_HEIGHT_PX = 500;

/** 13/9 keeps a portrait phone whose layout viewport shrinks for the keyboard out. */
export const LANDSCAPE_MAP_DOMINANT_MEDIA = `(orientation: landscape) and (max-height: ${PHONE_LANDSCAPE_MAX_HEIGHT_PX}px) and (min-aspect-ratio: 13/9)`;
