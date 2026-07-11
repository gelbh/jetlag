import type { ReactNode } from "react";

interface SearchResultItem {
  id: string;
  displayName: string;
}

interface SearchResultsListProps<Item extends SearchResultItem> {
  results: readonly Item[];
  onSelect: (item: Item) => void;
  selectedId?: string | null;
  renderSubtitle?: (item: Item) => ReactNode;
  variant?: "panel" | "compact";
}

export function SearchResultsList<Item extends SearchResultItem>({
  results,
  onSelect,
  selectedId,
  renderSubtitle,
  variant = "panel",
}: SearchResultsListProps<Item>) {
  if (results.length === 0) {
    return null;
  }

  if (variant === "compact") {
    return (
      <div className="max-h-40 space-y-1 overflow-y-auto border-2 border-border bg-surface-deep p-1.5">
        {results.map((item) => {
          const selected = selectedId === item.id;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item)}
              className={`min-h-11 w-full px-3 py-2 text-left text-sm ${
                selected
                  ? "bg-highlight-soft font-display font-semibold uppercase tracking-wide text-highlight"
                  : "bg-transparent text-ink hover:bg-surface-raised"
              }`}
            >
              <span className="block">{item.displayName}</span>
              {renderSubtitle ? (
                <span className="mt-0.5 block text-xs font-normal normal-case tracking-normal text-ink-dim">
                  {renderSubtitle(item)}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="max-h-40 space-y-2 overflow-y-auto overscroll-contain rounded-[var(--radius-hud-md)] border border-border bg-surface-base p-2">
      {results.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onSelect(item)}
          className="btn-secondary min-h-12 w-full justify-start px-3 py-2 text-left text-sm"
        >
          {item.displayName}
        </button>
      ))}
    </div>
  );
}
