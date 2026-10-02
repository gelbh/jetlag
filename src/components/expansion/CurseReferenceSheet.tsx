import { Stack, Text, TextInput } from "@mantine/core";
import { useId, useState } from "react";
import { InsetGroup, insetTextInputStyles } from "@/components/ui/entry/entryChrome";
import {
  EXPANSION_CURSE_COUNT,
  searchExpansionCurses,
} from "../../domain/expansion/expansionCurses";
import { SheetHost } from "../ui/sheets/SheetHost";

interface CurseReferenceSheetProps {
  open: boolean;
  onClose: () => void;
}

export function CurseReferenceSheet({ open, onClose }: CurseReferenceSheetProps) {
  const [query, setQuery] = useState("");
  const searchId = useId();

  const visibleCurses = searchExpansionCurses(query);

  return (
    <SheetHost
      open={open}
      onClose={onClose}
      ariaLabel="Expansion Pack curses"
      maxHeightClassName="max-h-[min(70dvh,560px)]"
      pinned={
        <h2 className="text-[1.375rem] font-bold tracking-tight text-[var(--color-field-ink)]">
          Expansion curses
        </h2>
      }
    >
      <Stack gap="md">
        <Text size="sm" c="var(--color-field-ink-muted)">
          {EXPANSION_CURSE_COUNT} curses from Expansion Pack Vol. 1. Reference only; play the
          physical card in your group.
        </Text>

        <InsetGroup>
          <TextInput
            id={searchId}
            label="Search curses"
            value={query}
            onChange={(event) => setQuery(event.currentTarget.value)}
            placeholder="Curse name or rule text"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="search"
            inputMode="search"
            styles={insetTextInputStyles}
          />
        </InsetGroup>

        <div className="jl-scroll space-y-4 overflow-y-auto pr-1">
          {visibleCurses.map((curse) => (
            <section key={curse.id} className="space-y-1">
              <Text size="sm" fw={600} c="var(--color-field-ink)">
                {curse.name}
              </Text>
              <Text size="sm" c="var(--color-field-ink-muted)" lh={1.4}>
                {curse.rulesText}
              </Text>
            </section>
          ))}
          {visibleCurses.length === 0 ? (
            <Text size="sm" c="var(--color-field-ink-muted)">
              No curses match your search.
            </Text>
          ) : null}
        </div>
      </Stack>
    </SheetHost>
  );
}
