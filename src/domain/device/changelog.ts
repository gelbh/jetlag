export const APP_VERSION = "0.1.1";

export interface ChangelogEntry {
  version: string;
  date: string;
  sections: Array<{
    title: string;
    items: string[];
  }>;
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: "0.1.1",
    date: "2026-07-07",
    sections: [
      {
        title: "Improvements",
        items: [
          "Error reporting: Sentry captures map crashes when VITE_SENTRY_DSN is configured",
          "Config validation: startup checks catch incomplete Firebase or proxy env settings",
          "Session data: Firestore session, annotation, and question payloads validated on read",
          "Security: content security policy runs in report-only mode before enforcement",
        ],
      },
      {
        title: "Technical",
        items: [
          "Timer display: shared date-fns clock formatting helpers",
          "E2E: Playwright visual baselines for home and join screens",
          "Functions: Zod validation on transit and Overpass proxy inputs",
        ],
      },
    ],
  },
  {
    version: "0.1.0",
    date: "2026-07-07",
    sections: [
      {
        title: "Fixes",
        items: [
          "Photo uploads: clearer permission errors and hider role checks before upload",
          "Matching wizard: category dropdown selection works reliably on mobile",
          "Metric sessions: radar defaults to 1 km; tentacle copy uses session units",
          "Question send: answer timer starts only after the question fully syncs",
          "Sea level measuring: send blocked until elevation region is ready",
        ],
      },
      {
        title: "Improvements",
        items: [
          "Map pan hides tool panels without clearing your in-progress draft",
          "Drag tool panel handle down to minimize; tap the pill to expand again",
          "Wizard steps start with anchor / location before question options",
          "End game moved to More tools menu",
          "Single question timer in the top status bar",
          "Reworked GPS anchor button and compact Home feedback link",
          "PWA update toast when a new version is available",
          "Create session: square, circle, or polygon play-area shapes with a clearer map boundary",
          "Create session and presets: fullscreen map for framing the game area",
          "Presets: save a framed game area from the editor",
          "Presets: search for a place when setting the play area",
          "Fullscreen play-area map: searched places show exact boundaries like the game map",
        ],
      },
      {
        title: "Technical",
        items: [
          "Spatial Voronoi and geodesic buffers for more accurate elimination zones",
        ],
      },
    ],
  },
];
