import { HUD_BINARY_NO, HUD_BINARY_YES } from "../../ui/hudTokens";

export const yesNoAnswerOptions = [
  {
    value: "yes" as const,
    label: "Yes",
    activeClassName: HUD_BINARY_YES,
  },
  {
    value: "no" as const,
    label: "No",
    activeClassName: HUD_BINARY_NO,
  },
] as const;

export const closerFurtherAnswerOptions = [
  {
    value: "closer" as const,
    label: "Closer",
    activeClassName: HUD_BINARY_YES,
  },
  {
    value: "further" as const,
    label: "Further",
    activeClassName: HUD_BINARY_NO,
  },
] as const;

export const hotterColderAnswerOptions = [
  {
    value: "hotter" as const,
    label: "Hotter",
    activeClassName: HUD_BINARY_YES,
  },
  {
    value: "colder" as const,
    label: "Colder",
    activeClassName: HUD_BINARY_NO,
  },
] as const;
