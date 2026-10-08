// Copy checked against the tool code: src/domain/map/mapTools.ts (names, card costs),
// src/domain/map/distancePresets.ts (distances), src/domain/session/size/gameSizeRules.ts
// (size gating, deadlines), src/domain/questions/* (prompts, answers) and
// src/domain/geometry/adapter/eliminationMask.ts (shading). Re-check them when tools change.
import type { LearnPageContent } from "./learnContentTypes";

const TOOL_RELATED = ["/tools", "/guide", "/faq"] as const satisfies LearnPageContent["related"];

const SHADING_NOTE = "Shaded area is ruled out on the seekers' shared map.";

export const TOOLS_INDEX_CONTENT: LearnPageContent = {
  path: "/tools",
  intro:
    "Seekers find the hider by asking questions. The map companion has six question tools. Five of them turn the hider's answer into shading on the map; Photo gets you a picture to study instead.",
  sections: [
    {
      id: "overview",
      heading: "The six question tools",
      lead: "Each tool asks the hider one kind of question. The seekers set it up on the map, send it, and the hider answers in game chat. The code after each name is its card cost: D2P1 means the hider draws 2 cards and keeps 1.",
      blocks: [
        {
          kind: "paragraph",
          text: "Card costs only matter when the host turns on Simulate hider deck in the session settings. It is off by default.",
        },
        {
          kind: "showcase",
          showcase: "tools-hub",
          caption:
            "Tap a tool to open its guide. These are the same icons as the Ask dock in a live session.",
        },
        {
          kind: "table",
          caption: "Question tools and card costs",
          head: ["Tool", "What it asks"],
          rows: [
            ["Matching (D3P1)", "Is your nearest place of this type the same as mine?"],
            ["Measuring (D3P1)", "Are you closer to or further from this type of place than me?"],
            ["Thermometer (D2P1)", "After I traveled this far, am I hotter or colder?"],
            ["Radar (D2P1)", "Are you within this distance of me?"],
            ["Tentacles (D4P2)", "Which nearby place of this type are you closest to?"],
            ["Photo (D1P1)", "Send me a photo of this."],
          ],
        },
      ],
    },
    {
      id: "game-size",
      heading: "Game size changes the options",
      lead: "The app recommends a game size from the play area: small, medium, or large. Bigger games unlock longer distances and more categories. Tentacles is off in small games, and the hardest Photo prompts only appear in large games.",
      blocks: [
        {
          kind: "table",
          caption: "Game size by play area",
          head: ["Size", "Play area"],
          rows: [
            ["Small", "Under 250 km² (about 100 sq mi)"],
            ["Medium", "250 km² or more"],
            ["Large", "2,500 km² or more (about 1,000 sq mi)"],
          ],
        },
      ],
    },
    {
      id: "answer-time",
      heading: "How long the hider has to answer",
      lead: "Hiders get 5 minutes to answer most questions. Photo questions allow 10 minutes in small and medium games and 20 minutes in large games. The host can change these limits in the session settings.",
    },
    {
      id: "map-tools",
      heading: "Map markup tools",
      lead: "Zone, Pin, and Freehand are not questions. They let you draw a play boundary, mark a point, or sketch a line on the map while you plan the next move.",
    },
  ],
  related: [
    "/tools/radar",
    "/tools/thermometer",
    "/tools/matching",
    "/tools/measuring",
    "/tools/tentacles",
    "/tools/photo",
    "/guide",
    "/faq",
  ],
};

export const RADAR_CONTENT: LearnPageContent = {
  path: "/tools/radar",
  intro:
    "Radar draws a circle around the seekers and asks one question: is the hider inside it? It costs D2P1 (the hider draws 2 cards and keeps 1) and is a simple first question for cutting the map down.",
  sections: [
    {
      id: "what-it-asks",
      heading: "What Radar asks",
      lead: "The seekers pick a distance and send “Are you within [distance] of me?” The circle is centered on the seekers' position. You can tap a preset distance or type a custom one, up to the largest preset for your game size.",
      blocks: [
        {
          kind: "showcase",
          showcase: "radar",
          caption:
            "Pick a distance, then try Yes or No. In a real game you place the circle center on the map first; here the center is already pinned so you can answer.",
        },
        {
          kind: "table",
          caption: "Radar distances",
          head: ["Game size", "Distances"],
          rows: [
            ["Small", "500 m, 1, 2, 5, 10 km (¼, ½, 1, 3, 5 mi)"],
            ["Medium", "Adds 15 and 40 km (10 and 25 mi)"],
            ["Large", "Adds 80 and 160 km (50 and 100 mi)"],
          ],
        },
      ],
    },
    {
      id: "how-to-answer",
      heading: "How the hider answers",
      lead: "The hider answers Yes or No in game chat. The app suggests the answer from the hider's reference point, which is the center of their hiding zone until the end game starts.",
    },
    {
      id: "map-shading",
      heading: "How the map shades",
      lead:
        "A No shades the whole circle, because the hider is somewhere outside it. A Yes shades everything outside the circle. " +
        SHADING_NOTE,
    },
    {
      id: "tips",
      heading: "Tips",
      lead: "Radar is cheap and easy to read, so it works well as an opening question.",
      blocks: [
        {
          kind: "bullets",
          items: [
            "Start wide to rule out a big chunk of the map, then tighten.",
            "Move before asking again so the next circle covers new ground.",
            "Pair a Yes with Thermometer to work out which part of the circle the hider is in.",
          ],
        },
      ],
    },
  ],
  related: ["/tools/thermometer", "/tools/tentacles", ...TOOL_RELATED],
};

export const THERMOMETER_CONTENT: LearnPageContent = {
  path: "/tools/thermometer",
  intro:
    "Thermometer tells the seekers whether a move took them toward the hider or away. It costs D2P1 (draw 2, keep 1) and splits the map in two.",
  sections: [
    {
      id: "what-it-asks",
      heading: "What Thermometer asks",
      lead: "The seekers choose a distance, travel that far, and ask “After traveling [distance], am I hotter or colder?” You can record the move with a GPS track as you go, or place the start and end pins on the map by hand.",
      blocks: [
        {
          kind: "showcase",
          showcase: "thermometer",
          caption:
            "Tap a walk distance. On the map you would then start a GPS track or place start and end pins; Hotter/Colder answers live there too.",
        },
        {
          kind: "table",
          caption: "Thermometer distances",
          head: ["Game size", "Distances"],
          rows: [
            ["Small", "1 and 5 km (½ and 3 mi)"],
            ["Medium", "Adds 15 km (10 mi)"],
            ["Large", "Adds 75 km (50 mi)"],
          ],
        },
        {
          kind: "paragraph",
          text: "A GPS track measures the straight-line distance between start and end, and stops on its own after 30 minutes.",
        },
      ],
    },
    {
      id: "how-to-answer",
      heading: "How the hider answers",
      lead: "The hider answers Hotter or Colder in game chat. Hotter means the seekers ended closer to the hider than where they started; Colder means they ended further away.",
    },
    {
      id: "map-shading",
      heading: "How the map shades",
      lead:
        "The app draws a line halfway between the start and end points, at a right angle to the direction of travel. Hotter shades the start side of that line; Colder shades the end side. " +
        SHADING_NOTE,
    },
    {
      id: "tips",
      heading: "Tips",
      lead: "The split is only as useful as the direction you travel, so point the move at the area you most want to test.",
      blocks: [
        {
          kind: "bullets",
          items: [
            "Travel across the middle of the remaining area so either answer removes a lot.",
            "Ride transit for the long distances; the GPS track only cares about start and end.",
            "Follow a Radar Yes with a Thermometer to pick a side of the circle.",
          ],
        },
      ],
    },
  ],
  related: ["/tools/radar", "/tools/measuring", ...TOOL_RELATED],
};

export const MATCHING_CONTENT: LearnPageContent = {
  path: "/tools/matching",
  intro:
    "Matching asks whether the hider and the seekers share the same nearest place of some type, like the same airport or the same park. It costs D3P1 (the hider draws 3 cards and keeps 1).",
  sections: [
    {
      id: "what-it-asks",
      heading: "What Matching asks",
      lead: "The seekers pick a category and send “Is your nearest [place] the same as my nearest [place]?” The app finds the seekers' nearest one from OpenStreetMap data and shows the rule for that category before you send.",
      blocks: [
        {
          kind: "showcase",
          showcase: "matching",
          caption:
            "Pick a place type, then answer Yes or No. The nearest name here is a demo stand-in for what the map would resolve.",
        },
        {
          kind: "table",
          caption: "Matching categories",
          head: ["Group", "Categories"],
          rows: [
            ["Transit", "Commercial airport, transit line, station name length, street or path"],
            ["Administrative divisions", "1st to 4th administrative division"],
            ["Natural", "Mountain, landmass, park"],
            [
              "Places of interest",
              "Amusement park, zoo, aquarium, golf course, museum, movie theater",
            ],
            ["Public utilities", "Hospital, library, foreign consulate"],
          ],
        },
        {
          kind: "paragraph",
          text: "Hosts can turn on the custom question pack in session settings, which adds Major city, Letter zone, and Same first letter station.",
        },
      ],
    },
    {
      id: "how-to-answer",
      heading: "How the hider answers",
      lead: "The hider answers Yes or No in game chat. Some categories also offer Null when the place is not in the play area. Transit line questions only count while the seekers are riding public transit.",
    },
    {
      id: "map-shading",
      heading: "How the map shades",
      lead:
        "For places like parks or museums, the app works out the area that is closer to the seekers' nearest place than to any other one. A Yes shades everything outside that area; a No shades the area itself. Administrative divisions use the division's boundary instead. " +
        SHADING_NOTE,
    },
    {
      id: "tips",
      heading: "Tips",
      lead: "Matching works best with categories that split your play area into a few big pieces.",
      blocks: [
        {
          kind: "bullets",
          items: [
            "Administrative divisions are strong early questions in large games.",
            "Common places like parks or libraries give small pieces, which suit the end game.",
          ],
        },
      ],
    },
  ],
  related: ["/tools/measuring", "/tools/tentacles", ...TOOL_RELATED],
};

export const MEASURING_CONTENT: LearnPageContent = {
  path: "/tools/measuring",
  intro:
    "Measuring compares distances: is the hider closer to a type of place, like a coastline or a hospital, than the seekers are? It costs D3P1 (the hider draws 3 cards and keeps 1).",
  sections: [
    {
      id: "what-it-asks",
      heading: "What Measuring asks",
      lead: "The seekers pick a category and send “Compared to me, are you closer to or further from [place]?” The app finds the seekers' nearest one and measures how far away it is.",
      blocks: [
        {
          kind: "showcase",
          showcase: "measuring",
          caption:
            "Pick what to measure from, then answer Closer or Further. Anchor and target pins are simulated for this page.",
        },
        {
          kind: "table",
          caption: "Measuring categories",
          head: ["Group", "Categories"],
          rows: [
            ["Transit", "Commercial airport, high speed train line, rail station"],
            ["Borders", "International border, 1st and 2nd administrative division border"],
            ["Natural", "Sea level, body of water, coastline, mountain, park"],
            [
              "Places of interest",
              "Amusement park, zoo, aquarium, golf course, museum, movie theater",
            ],
            ["Public utilities", "Hospital, library, foreign consulate"],
          ],
        },
        {
          kind: "paragraph",
          text: "The custom question pack adds 3rd and 4th administrative division borders, a custom place, 7-Eleven, McDonald's, and Major city.",
        },
      ],
    },
    {
      id: "how-to-answer",
      heading: "How the hider answers",
      lead: "The hider answers Closer or Further in game chat. For sea level, both sides compare altitude, using the altitude their phone reports.",
    },
    {
      id: "map-shading",
      heading: "How the map shades",
      lead:
        "The app marks every spot that is at least as close to that type of place as the seekers are. Closer shades everything outside that region; Further shades the region itself. " +
        SHADING_NOTE,
    },
    {
      id: "tips",
      heading: "Tips",
      lead: "Measuring is strongest when the seekers are at a middling distance from the target, so either answer removes a large part of the map.",
      blocks: [
        {
          kind: "bullets",
          items: [
            "Coastlines and borders draw long, clean edges across big games.",
            "Ask about common places like hospitals from a spot between two of them.",
          ],
        },
      ],
    },
  ],
  related: ["/tools/matching", "/tools/thermometer", ...TOOL_RELATED],
};

export const TENTACLES_CONTENT: LearnPageContent = {
  path: "/tools/tentacles",
  intro:
    "Tentacles asks the hider to name which nearby place of a type they are closest to. It costs D4P2 (the hider draws 4 cards and keeps 2) and is available in medium and large games only.",
  sections: [
    {
      id: "what-it-asks",
      heading: "What Tentacles asks",
      lead: "The seekers pick a category and send “Within [distance] of me, which [places] are you nearest to?” The question only counts if the hider is also within that distance. The app lists every place of that type inside the circle.",
      blocks: [
        {
          kind: "showcase",
          showcase: "tentacles",
          caption:
            "Pick a place type, then choose which nearby place the hider is closest to (or Out of reach).",
        },
        {
          kind: "table",
          caption: "Tentacles categories",
          head: ["Game size", "Categories and distance"],
          rows: [
            ["Small", "Not available"],
            ["Medium", "Museum, library, movie theater, hospital, within 2 km (1 mi)"],
            ["Large", "Adds metro line, zoo, aquarium, amusement park, within 25 km (15 mi)"],
          ],
        },
      ],
    },
    {
      id: "how-to-answer",
      heading: "How the hider answers",
      lead: "The hider picks one of the listed places in game chat, or answers Not within reach if they are outside the circle.",
    },
    {
      id: "map-shading",
      heading: "How the map shades",
      lead:
        "When the hider names a place, everything outside the circle is shaded, along with the parts of the circle that are closer to one of the other listed places. Not within reach shades the whole circle. " +
        SHADING_NOTE,
    },
    {
      id: "tips",
      heading: "Tips",
      lead: "Tentacles is expensive but precise, so save it for when the hider is probably close.",
      blocks: [
        {
          kind: "bullets",
          items: [
            "Pick a category with several places inside the circle.",
            "A Radar Yes at the same distance first makes a Not within reach answer unlikely.",
          ],
        },
      ],
    },
  ],
  related: ["/tools/radar", "/tools/matching", ...TOOL_RELATED],
};

export const PHOTO_CONTENT: LearnPageContent = {
  path: "/tools/photo",
  intro:
    "Photo asks the hider to send a picture of something around them. It costs D1P1 (draw 1, keep 1) and gives the seekers a picture to study instead of map shading.",
  sections: [
    {
      id: "what-it-asks",
      heading: "What Photo asks",
      lead: "The seekers pick a prompt and send “Send me a photo of [subject].” Each prompt comes with its own rule for what a valid photo shows. Larger games unlock more prompts.",
      blocks: [
        {
          kind: "showcase",
          showcase: "photo",
          caption: "Pick a photo ask. In a live game the hider replies with a picture in chat.",
        },
        {
          kind: "table",
          caption: "Photo prompts by game size",
          head: ["Game size", "Prompts"],
          rows: [
            [
              "All sizes",
              "Any building visible from a transit station, widest street, tree, tallest structure in your sightline, you, the sky",
            ],
            [
              "Medium and large",
              "Adds tallest building visible from a transit station, trace nearest street or path, 2 buildings, restaurant interior, park, grocery store aisle, place of worship, train platform",
            ],
            [
              "Large only",
              "Adds 1 km (½ mile) of streets traced, tallest mountain visible from a transit station, biggest body of water in your zone, 5 buildings",
            ],
          ],
        },
      ],
    },
    {
      id: "how-to-answer",
      heading: "How the hider answers",
      lead: "The hider uploads the photo in the app, marks it as sent if they shared it another way, or answers that they cannot answer. Photo answers get more time than other questions: 10 minutes in small and medium games, 20 minutes in large games.",
    },
    {
      id: "tips",
      heading: "Tips",
      lead: "Photo is the cheapest question, so it is a good way to gather clues between map questions.",
      blocks: [
        {
          kind: "bullets",
          items: [
            "Skylines, mountains, and water give the most location clues.",
            "Use what you see to choose the next Matching or Measuring category.",
          ],
        },
      ],
    },
  ],
  related: ["/tools/matching", "/tools/measuring", ...TOOL_RELATED],
};
