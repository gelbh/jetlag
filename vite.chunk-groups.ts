/** Client Rolldown code-splitting groups (names + regexes must stay stable). */
export const clientChunkGroups = [
  // Keep tslib out of vendor-firebase: Firebase 13 absorbs it, then Mantine Drawer
  // (on the App static path) would import vendor-firebase for __rest/__assign helpers.
  {
    name: "vendor-tslib",
    test: /node_modules\/tslib\//,
  },
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
