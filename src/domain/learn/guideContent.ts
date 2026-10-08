// Copy checked against the session flow: src/routes/create-session/*, src/routes/JoinSession.tsx,
// src/components/session/identity/RolePicker.tsx, src/domain/session/size/*,
// src/domain/session/players/*, src/components/map/chrome/SessionIslandSlots.tsx and
// src/components/session/GameOverSheet.tsx. Re-check them when the flow changes.
import type { LearnPageContent } from "./learnContentTypes";

export const GUIDE_CONTENT: LearnPageContent = {
  path: "/guide",
  intro:
    "Jet Lag Map Companion runs a Hide + Seek game in the style of Jet Lag: The Game on a live shared map. One person hides near a transit station, the seekers ask questions, and every answer shades out part of the map until the hider is found.",
  sections: [
    {
      id: "what-you-need",
      heading: "What you need",
      lead: "You need at least two players, a phone each, and a town, city, or region with public transit. The app runs in the browser, and you can play without making an account. Location sharing is optional, but the map is far more useful with it on.",
    },
    {
      id: "roles",
      heading: "Pick your roles",
      lead: "Every player joins as a Seeker, a Hider, or an Observer. Seekers ask questions and share their live location. Hiders answer questions, set their hiding zone, and can watch the seekers move. Observers watch read-only and can switch between the seeker and hider views.",
      blocks: [
        {
          kind: "table",
          caption: "Roles",
          head: ["Role", "What you do"],
          rows: [
            ["Seeker", "Ask questions, mark the map, share live location"],
            ["Hider", "Answer questions, set the hiding zone, watch the seekers"],
            ["Observer", "Watch the game read-only, switching between seeker and hider views"],
          ],
        },
        {
          kind: "paragraph",
          text: "Seekers never see the hider's live location on their map. Hiders and observers can see where everyone is.",
        },
      ],
    },
    {
      id: "create",
      heading: "Create a session",
      lead: "The host taps Create session and works through three steps: Where, Rules, and Play. Where sets the game area, Rules adds extras like transit lines or more areas, and Play sets the game size and units. Then Create game gives you a four-letter session code.",
      blocks: [
        {
          kind: "steps",
          items: [
            "Where: search for a place, load a built-in preset, or draw the area on the map.",
            "Rules: add more areas, import a KML or KMZ file, pick a metro system, or save the setup as a preset.",
            "Play: choose small, medium, or large, metric or imperial distances, and a free or Premium session.",
            "Tap Create game and share the code or the invite link.",
          ],
        },
      ],
    },
    {
      id: "join",
      heading: "Join a session",
      lead: "Other players tap Join session, enter the four-letter code from the host, and pick a role. An invite link fills in the code for you. The first player on each side joins freely; later players need that side's role code from a teammate or can request access.",
      blocks: [
        {
          kind: "paragraph",
          text: "Observers always need the observer code from the host.",
        },
      ],
    },
    {
      id: "game-area",
      heading: "Game area and game size",
      lead: "The game area is the boundary everyone plays inside. Its size sets the game size, which controls the hiding time, the hiding zone, and which question options are available. The app recommends a size from the area, and the host can change it.",
      blocks: [
        {
          kind: "table",
          caption: "Game sizes",
          head: ["Size", "Typical area, hiding zone, hiding time"],
          rows: [
            ["Small", "Town or neighborhood, 500 m (¼ mi) zone, 30 minutes"],
            ["Medium", "City or metro area, 500 m (¼ mi) zone, 60 minutes"],
            ["Large", "Region or country, 1 km (½ mi) zone, 3 hours"],
          ],
        },
      ],
    },
    {
      id: "hiding",
      heading: "Hide",
      lead: "When the host starts the timer, the hiding period counts down. The hider travels, then sets a hiding zone: a circle around a transit station inside the game area. Tap a transit stop on the map, or tap anywhere to place it by hand. The hider can move the zone later; with the hider deck on, that takes a Move card.",
      blocks: [
        {
          kind: "paragraph",
          text: "The host can change the zone radius, from 100 m up to 1 km, in the session settings. A 250 m preset suits bus stops.",
        },
      ],
    },
    {
      id: "asking-questions",
      heading: "Ask questions",
      lead: "When the hiding period ends, the seekers start asking. Each question tool sets up on the map and goes to the hider in game chat. The hider usually has 5 minutes to answer. Once they do, the app shades the part of the map where the hider cannot be.",
      blocks: [
        {
          kind: "showcase",
          showcase: "tools-hub",
          caption:
            "Open any question tool guide from here. The rail uses the same icons as the live Ask dock.",
        },
        {
          kind: "bullets",
          items: [
            "Matching: is your nearest airport, park, or museum the same as ours?",
            "Measuring: are you closer to the coastline, a hospital, or another place than we are?",
            "Thermometer: after we traveled this far, are we hotter or colder?",
            "Radar: are you within this distance of us?",
            "Tentacles: which nearby museum, library, or other place are you closest to?",
            "Photo: send us a photo of the sky, the widest street, and more.",
          ],
        },
        {
          kind: "paragraph",
          text: "The question tools page explains each one, with the distances and categories for every game size.",
        },
      ],
    },
    {
      id: "end-game",
      heading: "End game and finding the hider",
      lead: "When the seekers reach the hider's station, they tap Station to start the end game. Once the hider accepts, the hiding zone is revealed on the map. When the seekers spot the hider, they tap Found, and the round ends once the hider confirms.",
    },
    {
      id: "after-the-round",
      heading: "After the round",
      lead: "The game over sheet shows who won and how long the hiding and seeking phases took. Tap Switch roles and rematch to play again with someone new hiding. Sign in to see your stats and the global and friends leaderboards.",
      blocks: [
        {
          kind: "paragraph",
          text: "Want the show's card deck too? The host can turn on Simulate hider deck for a hider hand with time bonuses, power-ups, and curses. It is off by default.",
        },
      ],
    },
  ],
  related: ["/tools", "/tools/radar", "/tools/matching", "/faq"],
};
