import { useId, useState } from "react";
import { AnimatedOverlay } from "../ui/AnimatedOverlay";
import { SheetHeader } from "../ui/SheetHeader";
import {
  EXPANSION_CURSE_COUNT,
  searchExpansionCurses,
} from "../../domain/expansion/expansionCurses";

interface CurseReferenceSheetProps {
  open: boolean;
  onClose: () => void;
}

export function CurseReferenceSheet({ open, onClose }: CurseReferenceSheetProps) {
  const [query, setQuery] = useState("");
  const searchId = useId();

  const visibleCurses = searchExpansionCurses(query);

  return (
    <AnimatedOverlay
      open={open}
      onClose={onClose}
      ariaLabel="Expansion Pack curses"
      sheetClassName="mx-auto max-w-lg"
      maxHeightClassName="max-h-[min(70dvh,560px)]"
    >
      <SheetHeader title="Expansion curses" onClose={onClose} />

      <p className="mb-3 text-sm text-ink-muted">
        {EXPANSION_CURSE_COUNT} curses from Expansion Pack Vol. 1. Reference
        only — play the physical card in your group.
      </p>

      <label htmlFor={searchId} className="field-label mb-4 block">
        Search curses
        <input
          id={searchId}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="field-input min-h-11 w-full"
          placeholder="Curse name or rule text…"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="search"
          inputMode="search"
        />
      </label>

      <div className="space-y-4 overflow-y-auto pr-1">
        {visibleCurses.map((curse) => (
          <section key={curse.id} className="space-y-1">
            <h3 className="text-sm font-semibold text-ink">{curse.name}</h3>
            <p className="text-sm leading-snug text-ink-secondary">
              {curse.rulesText}
            </p>
          </section>
        ))}
        {visibleCurses.length === 0 ? (
          <p className="text-sm text-ink-muted">No curses match your search.</p>
        ) : null}
      </div>
    </AnimatedOverlay>
  );
}
