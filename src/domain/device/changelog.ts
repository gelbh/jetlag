export const APP_VERSION = "0.4.0";

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
    version: "0.4.0",
    date: "2026-07-11",
    sections: [
      {
        title: "Improvements",
        items: [
          "Premium billing: Stripe checkout for session packs, monthly and yearly unlimited, lifetime access, and a 7-day subscription trial",
          "Create session: paid hosts unlock premium without an access code; access codes still work for beta hosts",
          "Home: Premium page lists plans and shows your remaining sessions or subscription status",
        ],
      },
      {
        title: "Technical",
        items: [
          "Cloud Functions: Stripe webhooks, checkout, billing portal, and paid premium session creation",
        ],
      }
    ],
  },
  {
    version: "0.3.0",
    date: "2026-07-11",
    sections: [
      {
        title: "Improvements",
        items: [
          "Recommended games: Hide + Seek show metros for NYC, London, Tokyo, Osaka, Zürich, and Lucerne",
          "Bundled presets: borough and ward play areas with local admin matching for each metro",
          "Create session: recommended presets set game size, distance unit, expansion pack, and transit metro where supported",
        ],
      }
    ],
  },
  {
    version: "0.2.4",
    date: "2026-07-11",
    sections: [
      {
        title: "Fixes",
        items: [
          "Matching wizard: step stays put when you pan the map",
          "Tool panel: stays collapsed after pan if you minimized it first",
          "Map clicks: wizard anchor step only; no accidental reset mid-flow",
          "Dublin games: hide country and province admin borders in matching and measuring",
          "Dublin county: play area size uses the full county boundary, not the first polygon slice",
          "Dublin county: play area outline no longer draws internal council seams when admin borders are off",
          "Play area mask: stroke only outer rings; no hole or tint edge lines on complex boundaries",
          "Admin boundaries: Dublin games only load local authority and LEA reference lines",
          "Admin divisions: hide border options until play-area counts finish loading",
          "Photo tool: no stale finish-open-question warning when nothing is pending",
          "Measuring: drop duplicate coastline distance line in the preview",
          "Seeker map: your location dot renders above other markers with a You label",
          "Photo uploads: refresh auth token before upload; default JPEG type when the file has none",
          "PWA: fill safe-area band on Home and Join with the app background",
          "Custom measure geometry: fix crash when advanced settings list is missing",
        ],
      },
      {
        title: "Improvements",
        items: [
          "Map settings: optional admin boundary reference layer (off by default)",
          "Admin boundaries: level-weighted strokes; readable on satellite basemap",
          "Tool previews: admin border overlays match standard and satellite basemap",
          "Chat badge: larger count pill with pulse on new messages",
          "Hider map: bottom dock matches seeker tool dock layout and safe-area",
          "Thermometer walk: start and live markers, distance label, satellite-aware line",
          "Map controls: zoom and basemap sit higher when the tool panel is minimized",
        ],
      },
      {
        title: "Technical",
        items: [
          "Error reporting: filter QuotaExceededError noise",
        ],
      }
    ],
  },
  {
    version: "0.2.3",
    date: "2026-07-10",
    sections: [
      {
        title: "Fixes",
        items: [
          "Map: tool dock safe-area band no longer adds a dark empty stripe below icons on iPhone",
          "Photo uploads: confirm hider access against the server before upload",
          "Photo uploads: clearer errors when sign-in and session membership diverge",
        ],
      },
      {
        title: "Improvements",
        items: [
          "Custom games: search presets by name or place; results show in a flat list while you type",
        ],
      }
    ],
  },
  {
    version: "0.2.2",
    date: "2026-07-10",
    sections: [
      {
        title: "Fixes",
        items: [
          "Map: compact tool dock height on iPhone no longer stacks icon row and safe-area padding",
          "Map: tool panel minimizes instantly when panning and stays pinned to the screen bottom while the dock hides",
          "Photo uploads: fix production Storage permissions so hiders can upload on mobile",
          "Photo uploads: accept gallery picks with missing file types; clearer unsupported format errors",
          "Photo uploads: remove orphaned files when saving the answer fails",
        ],
      },
      {
        title: "Improvements",
        items: [
          "Dublin games: built-in presets with local authority and local electoral area matching",
          "Dublin presets: play areas use exact council boundaries instead of rectangular boxes",
          "Recommended games: browse bundled presets in a collapsible continent → country → region tree",
          "Matching and Measuring: admin division levels appear only when the play area has at least two divisions",
        ],
      },
      {
        title: "Technical",
        items: [
          "Backend deploy: include Firebase Storage rules with Firestore and Functions",
        ],
      }
    ],
  },
  {
    version: "0.2.1",
    date: "2026-07-09",
    sections: [
      {
        title: "Fixes",
        items: [
          "App: fix blank screen on load from update banner outside the router",
          "Time traps: hiders can place traps without permission errors",
          "Photo uploads: heal session membership on storage denial with stronger retry",
          "Map: dock safe-area fix removes gap below the tool bar",
          "Map: tool dock sits flush on iPhone home-screen installs without a double bottom bar",
          "Home: safe-area background no longer shows a blue bar on notched devices",
          "Map: sync and preload beacons sit flush below the status bar on notched iPhones and when two timers stack",
        ],
      },
      {
        title: "Improvements",
        items: [
          "Join: new players must match the session app version; existing members can continue after updating",
          "Join: fix permission errors when joining a session as hider or seeker",
          "Presets: older saved presets migrate on load; unmigratable presets show a review banner",
          "Map nav: fixed top-left home and back links; sync and preload status as compact beacons",
          "Time trap panel: map pan and zoom work while the panel is open",
          "Preset list: card-style rows with expansion badges and clearer actions",
          "Advanced settings: collapsible sections with expansion and custom pack detail panels",
          "Create session: preset picker above game size; tentacle radius labels use your distance unit",
          "Map preload beacon: refresh icon matches HUD chrome and spins while map data loads",
          "Map preload panel: progress bar, broadcast title, and dismiss action aligned with sync status popover",
          "Map HUD: borderless home button stays centered as the status bar grows; preload refresh beacon matches sync size with solid icon",
        ],
      }
    ],
  },
  {
    version: "0.2.0",
    date: "2026-07-09",
    sections: [
      {
        title: "Fixes",
        items: [
          "Feedback: bug and idea links use GitHub Mobile-friendly issue templates",
        ],
      },
      {
        title: "Improvements",
        items: [
          "Expansion Pack Vol. 1: host toggle, time trap placement on valid transit stations, and searchable curse reference (30 curses, rules text only)",
          "Advanced settings: custom question pack (7-Eleven, letter zone, major city, etc.), custom LineString/Polygon measuring geometry import, and optional question preview before send",
          "Map tools: copy anchor coordinates in matching and measuring wizards; default catalogs stay official base-game only unless hosts opt in",
          "Hider map: expansion actions grouped in one menu; time trap search has labeled field and empty-state guidance",
          "Copy coordinates: larger tap target with copy failure feedback",
          "Advanced settings: expansion toggles grouped in a fieldset",
        ],
      }
    ],
  },
  {
    version: "0.1.7",
    date: "2026-07-09",
    sections: [
      {
        title: "Fixes",
        items: [
          "Feedback: GitHub bug and idea links open the structured templates",
        ],
      },
      {
        title: "Improvements",
        items: [
          "Feedback: separate bug reports and improvement ideas; browse existing threads before posting",
        ],
      }
    ],
  },
  {
    version: "0.1.6",
    date: "2026-07-09",
    sections: [
      {
        title: "Fixes",
        items: [
          "Timer: host leave pauses Firestore timer; guests see \"Syncing timer…\" while the session timer loads",
          "Photo uploads: wait for role sync; retry once on storage denial; clearer error copy",
          "Tentacles: committed out-of-reach answers shade the full search disk on the map",
        ],
      },
      {
        title: "Improvements",
        items: [
          "End game: hiders can decline; seekers and hosts can cancel; clear map and reset board disabled during end game",
          "Radar: pick a distance before sending; multiplayer sends on the distance step",
          "Question tools: open in preview while another question is pending",
          "Sync rail: link-lamp on the map top-right; tap opens a compact sync status popover",
          "Chat: unread count on the dock badge; system game events count as unread",
          "Hider map: banner when GPS shows you outside your hiding zone after the hiding period",
          "Settings: leave session navigates home instead of the create flow; leave locally without ending the game for others; create session back link to home",
          "Preload: cancels background jobs when the app is hidden",
        ],
      }
    ],
  },
  {
    version: "0.1.5",
    date: "2026-07-08",
    sections: [
      {
        title: "Improvements",
        items: [
          "Sheets: swipe down or scrim tap to dismiss; exit animations on map and home overlays",
          "Tool panel: drag handle with live feedback; dock highlight follows the active question tool",
          "Home → Map: view transition on session code when motion is enabled",
          "Map load: HUD skeleton instead of plain loading text",
          "Low power mode and reduced motion: instant transitions, no drag springs",
        ],
      }
    ],
  },
  {
    version: "0.1.4",
    date: "2026-07-08",
    sections: [
      {
        title: "Improvements",
        items: [
          "Web analytics: optional GA4 page views in production",
        ],
      },
      {
        title: "Technical",
        items: [
          "Functions: Firestore-backed rate limits on Overpass, transit, and vehicle proxies",
          "Functions: grantAccess failure throttling survives cold starts",
          "Release tooling: Changesets versions package.json and syncs in-app changelog",
        ],
      }
    ],
  },
  {
    version: "0.1.3",
    date: "2026-07-08",
    sections: [
      {
        title: "Fixes",
        items: [
          "Create session: panning after place search keeps the searched boundary",
          "Photo answers: upload re-checks server role; clearer denial messages",
          "Questions: timers start and block new questions until the current one finishes",
          "Thermometer: GPS track completes without Firestore errors",
          "Sea level measuring: preview no longer shades the full play area at highest elevation",
          "Tentacle: choose a category before map preview loads",
          "Tentacle: Next works on anchor step before you pick a category",
          "Thermometer: manual pins send one answer prompt in multiplayer",
        ],
      },
      {
        title: "Improvements",
        items: [
          "End game: hiders accept before the hiding zone reveal applies",
          "PWA updates: clearer reload banner",
          "Transit map: distinct stop icons per mode",
          "Hiding zone confirm no longer posts to seeker chat",
          "Thermometer wizard: movement-neutral copy and clearer distance step layout",
        ],
      },
      {
        title: "Technical",
        items: [
          "Firestore: allow answerableAt patch on pending questions; end-game request and accept rules",
        ],
      }
    ],
  },
  {
    version: "0.1.2",
    date: "2026-07-08",
    sections: [
      {
        title: "Fixes",
        items: [
          "Map screen: fix render loop that blocked session create and the tool dock",
          "Photo answers: hider can submit photo and cannot-answer replies in game chat",
          "PWA updates: skip broken service worker refresh on iOS Safari",
          "Map sync: stop reporting expected permission errors to Sentry",
        ],
      },
      {
        title: "Technical",
        items: [
          "E2E: refresh visual baselines and align smoke session timeouts",
        ],
      }
    ],
  },
  {
    version: "0.1.1",
    date: "2026-07-07",
    sections: [
      {
        title: "Fixes",
        items: [
          "Seeker map: pan and zoom no longer snap back on every sync",
          "Thermometer: distance step comes first; Start walk works after picking a distance",
          "Thermometer: Start walk shows errors in the panel and works in solo sessions",
          "Matching and measuring: map previews stay blank until you pick a category",
          "Tool dock: More menu closes an open question panel",
          "Status bar: game timer sits on the right after the round starts",
        ],
      },
      {
        title: "Improvements",
        items: [
          "Error reporting: Sentry captures map crashes",
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
      }
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
          "Metric sessions: radar defaults to 1 km; tentacle copy and distance labels use session units",
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
          "Single question timer in the top status bar (removed map duplicate)",
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
          "Spatial Voronoi and geodesic buffers for more accurate elimination zones (matching & tentacles)",
        ],
      }
    ],
  }
];
