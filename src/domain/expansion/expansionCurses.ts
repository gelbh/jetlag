export interface ExpansionCurse {
  id: string;
  name: string;
  rulesText: string;
}

export const EXPANSION_CURSE_COUNT = 30;

export const EXPANSION_CURSES: readonly ExpansionCurse[] = [
  {
    id: "archaeologist",
    name: "Curse of the Archaeologist",
    rulesText:
      '"Building or structure" encompasses any manmade objects. To verify the age, you must have at least one credible source that specifically references that object. Partially rebuilt or renovated structures may use their original build date, but fully rebuilt structures (or structures designed to emulate an older structure) may not.',
  },
  {
    id: "bargain-hunter",
    name: "Curse of the Bargain Hunter",
    rulesText:
      "The discount cannot be found online or in a publication; it must be in a store that is selling that item in-person. The discount must be clearly marked as being a discount; it can't just be an item that happens to be cheaper than normal.",
  },
  {
    id: "clone",
    name: "Curse of the Clone",
    rulesText:
      "Long sleeves are defined as sleeves that extend past the elbow, and long pants/skirts are defined as extending past the knee.",
  },
  {
    id: "curious-explorer",
    name: "Curse of the Curious Explorer",
    rulesText:
      '"Museum" is anything categorized as a museum by the mapping app you are using. Players may also choose to wait outside if the museum is closed by the time they arrive. "Off-transit" means that players have physically disembarked their last form of transit and that it has left the station (i.e. you cannot temporarily step off a train while it\'s stopped to fulfill the condition.)',
  },
  {
    id: "data-leak",
    name: "Curse of the Data Leak",
    rulesText:
      '"Route" includes start and end destinations and the line of transit (if applicable.) If forced off a route for any reason, the hider must be notified immediately. Players may not discard part of a time bonus; they must discard cards in their entirety. It is possible that players may have to discard more than the required number of minutes in order to pay for this curse.',
  },
  {
    id: "empty-mind",
    name: "Curse of the Empty Mind",
    rulesText:
      '"Immediately" means that this curse never enters your hand; it is played the moment it is chosen. Cards must be chosen before the next question is asked.',
  },
  {
    id: "express-route",
    name: "Curse of the Express Route",
    rulesText:
      "Players may not discard part of a time bonus; they must discard cards in their entirety. It is possible that players may have to discard more than the required number of minutes in order to pay for this curse.",
  },
  {
    id: "featherless-flight",
    name: "Curse of Featherless Flight",
    rulesText:
      "A paper airplane may take any form, but must be constructed entirely from paper. The paper airplane may be thrown from a height in order to achieve extra lateral distance.",
  },
  {
    id: "gilded-inquiry",
    name: "Curse of the Gilded Inquiry",
    rulesText:
      '"Vetoed" in this case should be treated identically to a veto card being played; the question is not answered, no reward is given, and it is removed from the game for the rest of the round.',
  },
  {
    id: "hide-and-seek-ception",
    name: "Curse of the Hide-And-Seek-Ception",
    rulesText:
      'The hiding seeker may call or text the other seeker(s) when they are in position, but no more communication is allowed. "Off-transit" means that players have physically disembarked their last form of transit and that it has left the station (i.e. you cannot temporarily step off a train while it\'s stopped to fulfill the condition.)',
  },
  {
    id: "impenetrable-fog",
    name: "Curse of the Impenetrable Fog",
    rulesText:
      '"Intersection" here is defined as any point along a named path or street (i.e. has a name on whatever mapping app you choose to use) where the player has an opportunity to turn onto one or more different named paths or streets. If there are somehow more than six divergent paths, a random number generator can be used instead of a die.',
  },
  {
    id: "long-shot",
    name: "Curse of the Long Shot",
    rulesText:
      'When seekers are "frozen," they cannot make progress on clearing other curses or take any form of transit. If they are currently on transit when they become frozen, they must disembark at the next opportunity and wait out the rest of their freeze period at that station. Players may walk around freely while frozen for non game-related reasons, but must resume from the place where they were frozen when the freeze period concludes.',
  },
  {
    id: "okaihau-express",
    name: "Curse of the Okaihau Express",
    rulesText:
      "The hider must sing the full Okaihau Express lyrics to the seekers (see Expansion Pack Vol. 1 rules for the complete song text).",
  },
  {
    id: "passenger-princess",
    name: "Curse of the Passenger Princess",
    rulesText:
      "If there are more than two seekers, there is still only one passenger princess. If there is only one seeker, this card cannot be played. The passenger princess may speak to the other seeker(s) as normal, but must effectively act as though the game does not exist and cannot provide any substantive commentary that could help the other players in any way.",
  },
  {
    id: "pomologist",
    name: "Curse of the Pomologist",
    rulesText:
      'Specificity is defined by the title of the Wikipedia page (e.g. "Golden Delicious" is a variety of apple that has a Wikipedia page, so finding a Golden Delicious apple would require the seekers to do the same. "Summerset" is a variety of apple that does not have a Wikipedia page, so you could send the Wikipedia page for "apple" and the seekers could respond with anything that would fall under the category of "apple.") You cannot create a Wikipedia page.',
  },
  {
    id: "pong-champion",
    name: "Curse of the Pong Champion",
    rulesText:
      "Players may not practice or solicit any external support from people outside the game. The hider attempt follows the same parameters as the seeker attempt. The dice must come to rest in the cup; if they enter but bounce out, they are not scored.",
  },
  {
    id: "post-office",
    name: "Curse of the Post Office",
    rulesText:
      "After the letter has been mailed, they may also use any other form of communication to ask you the question.",
  },
  {
    id: "prosperous-home",
    name: "Curse of the Prosperous Home",
    rulesText:
      "Players may not discard part of a time bonus; they must discard cards in their entirety. It is possible that players may have to discard more than the required number of minutes in order to pay for this curse.",
  },
  {
    id: "queue",
    name: "Curse of the Queue",
    rulesText:
      "Players are considered no longer in line once there are no more people in front of them.",
  },
  {
    id: "quill",
    name: "Curse of the Quill",
    rulesText:
      "The category words are: MATCHING, MEASURING, RADAR, THERMOMETER, PHOTO, TENTACLES. There must be reasonable evidence to suggest that a handwritten letter was written directly on the surface by a person (with a pencil, pen, marker, paintbrush, spray can, chalk, etc.) and not printed.",
  },
  {
    id: "rewind",
    name: "Curse of the Rewind",
    rulesText:
      "It is the responsibility of the hider to keep track of where the last question was asked (and therefore where the seekers must return before asking their next question.)",
  },
  {
    id: "runner",
    name: "Curse of the Runner",
    rulesText:
      '"Running" is defined as a gait that does not have a double-support phase (i.e. both feet cannot be touching the ground at the same time.) If players want to be still and place both feet on the ground simultaneously, they must do so for 5 seconds or longer. Players may not discard part of a time bonus; they must discard cards in their entirety. It is possible that players may have to discard more than the required number of minutes in order to pay for this curse.',
  },
  {
    id: "seabird",
    name: "Curse of the Seabird",
    rulesText:
      '"Body of water" can be natural or manmade, but must be large enough to be visible on the mapping app you are using. "Off-transit" means that players have physically disembarked their last form of transit and that it has left the station (i.e. you cannot temporarily step off a train while it\'s stopped to fulfill the condition.)',
  },
  {
    id: "shark",
    name: "Curse of the Shark",
    rulesText:
      "Power-ups include veto, randomize, duplicate, discard 1 draw 2, discard 2 draw 3, discard 3 draw 4, expand maximum hand size by 1, and expand maximum hand size by 2.",
  },
  {
    id: "shrewd-critic",
    name: "Curse of the Shrewd Critic",
    rulesText:
      'If the guessed location does not have a Google pin or any reviews, seekers may make another guess immediately. "Off-transit" means that players have physically disembarked their last form of transit and that it has left the station (i.e. you cannot temporarily step off a train while it\'s stopped to fulfill the condition.)',
  },
  {
    id: "sniper",
    name: "Curse of the Sniper",
    rulesText:
      "All seekers must be visible in the photo provided. The 60 seconds begins from the moment the curse and photo are delivered.",
  },
  {
    id: "soothsayer",
    name: "Curse of the Soothsayer",
    rulesText:
      '"Triple rewards" means that the reward is earned three times in succession, not all at once (i.e. a radar question would have you draw two, keep one, draw two, keep one, draw two, keep one.)',
  },
  {
    id: "tiny-home",
    name: "Curse of the Tiny Home",
    rulesText:
      "This curse cannot be played if the hider would be outside their new zone once the curse takes effect; it must be played within a half radius of the station.",
  },
  {
    id: "trickster",
    name: "Curse of the Trickster",
    rulesText:
      "You are not required to lie after playing this curse; you may choose to answer the next three questions truthfully.",
  },
  {
    id: "zipped-lip",
    name: "Curse of the Zipped Lip",
    rulesText:
      "Power-ups include veto, randomize, duplicate, discard 1 draw 2, discard 2 draw 3, discard 3 draw 4, expand maximum hand size by 1, and expand maximum hand size by 2.",
  },
] as const;

export function searchExpansionCurses(query: string): ExpansionCurse[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return [...EXPANSION_CURSES];
  }

  return EXPANSION_CURSES.filter(
    (curse) =>
      curse.name.toLowerCase().includes(normalized) ||
      curse.rulesText.toLowerCase().includes(normalized),
  );
}
