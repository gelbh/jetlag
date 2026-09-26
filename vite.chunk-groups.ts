/** Client Rolldown code-splitting groups (names + regexes must stay stable). */
export const clientChunkGroups = [
  {
    name: "vendor-firebase",
    test: /node_modules\/firebase\/(?!storage|functions)/,
  },
  {
    name: "vendor-firebase-storage",
    test: /node_modules\/firebase\/storage/,
  },
  {
    name: "vendor-firebase-functions",
    test: /node_modules\/firebase\/functions/,
  },
  {
    name: "vendor-turf",
    test: /node_modules\/@turf\//,
  },
];
