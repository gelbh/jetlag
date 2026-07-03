interface SearchResultsListProps<Item extends { id: string; displayName: string }> {
  results: readonly Item[];
  onSelect: (item: Item) => void;
}

export function SearchResultsList<Item extends { id: string; displayName: string }>({
  results,
  onSelect,
}: SearchResultsListProps<Item>) {
  if (results.length === 0) {
    return null;
  }

  return (
    <div className="max-h-40 space-y-2 overflow-y-auto overscroll-contain rounded-[var(--radius-hud-md)] border border-border bg-surface-base p-2">
      {results.map((place) => (
        <button
          key={place.id}
          type="button"
          onClick={() => onSelect(place)}
          className="btn-secondary min-h-12 w-full justify-start px-3 py-2 text-left text-sm"
        >
          {place.displayName}
        </button>
      ))}
    </div>
  );
}
