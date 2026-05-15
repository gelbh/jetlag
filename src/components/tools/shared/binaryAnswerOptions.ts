export const yesNoAnswerOptions = [
  {
    value: "yes" as const,
    label: "Yes",
    activeClassName: "bg-emerald-500 text-slate-950",
  },
  {
    value: "no" as const,
    label: "No",
    activeClassName: "bg-rose-500 text-slate-50",
  },
] as const;

export const closerFurtherAnswerOptions = [
  {
    value: "closer" as const,
    label: "Closer",
    activeClassName: "bg-emerald-500 text-slate-950",
  },
  {
    value: "further" as const,
    label: "Further",
    activeClassName: "bg-rose-500 text-slate-50",
  },
] as const;

export const hotterColderAnswerOptions = [
  {
    value: "hotter" as const,
    label: "Hotter",
    activeClassName: "bg-emerald-500 text-slate-950",
  },
  {
    value: "colder" as const,
    label: "Colder",
    activeClassName: "bg-rose-500 text-slate-50",
  },
] as const;
