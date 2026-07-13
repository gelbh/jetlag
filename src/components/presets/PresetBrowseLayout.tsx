import { AppLink } from "../navigation/AppLink";
import {
  ScreenHeader,
  screenHeaderOffsetClassName,
} from "../ui/ScreenHeader";
import { BundledPresetTree } from "./BundledPresetTree";
import { PresetSearchResults } from "./PresetSearchResults";
import { PresetDetailPanel } from "./PresetDetailPanel";
import { migrateGamePreset } from "../../domain/session/gamePreset";

export function PresetBrowseLayout({
  searchId,
  query,
  onQueryChange,
  searching,
  searchResults,
  favouritePresets,
  bundledPresets,
  userPresets,
  onDelete,
}: {
  searchId: string;
  query: string;
  onQueryChange: (value: string) => void;
  searching: boolean;
  searchResults: ReturnType<typeof migrateGamePreset>[];
  favouritePresets: ReturnType<typeof migrateGamePreset>[];
  bundledPresets: ReturnType<typeof migrateGamePreset>[];
  userPresets: ReturnType<typeof migrateGamePreset>[];
  onDelete: (id: string) => void;
}) {
  return (
    <main className="home-poster flex min-h-[100dvh] flex-col px-5 py-8">
      <ScreenHeader backTo="/" backLabel="Back" />
      <div
        className={`space-y-4 ${screenHeaderOffsetClassName} pb-[max(1rem,env(safe-area-inset-bottom))]`}
      >
        <h1 className="font-display text-2xl font-bold uppercase tracking-tight text-ink">
          Custom games
        </h1>
        <p className="text-sm text-ink-muted">
          Saved templates pre-fill create session. Game area can be added when
          hosting.
        </p>

        <label htmlFor={searchId} className="field-label block">
          Search presets
          <input
            id={searchId}
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            className="field-input min-h-11 w-full"
            placeholder="Name or place…"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="search"
            inputMode="search"
          />
        </label>

        <AppLink to="/presets/new" className="home-card-btn home-card-btn-primary">
          <span>New preset</span>
        </AppLink>

        {searching ? (
          <PresetSearchResults presets={searchResults} onDelete={onDelete} />
        ) : (
          <>
            {favouritePresets.length > 0 ? (
              <section className="space-y-2">
                <p className="font-display text-xs font-semibold uppercase tracking-[0.1em] text-ink-dim">
                  Favourites
                </p>
                <ul className="space-y-3">
                  {favouritePresets.map((preset) => (
                    <PresetDetailPanel
                      key={preset.id}
                      preset={preset}
                      onDelete={onDelete}
                    />
                  ))}
                </ul>
              </section>
            ) : null}

            {bundledPresets.length > 0 ? (
              <section className="space-y-2">
                <p className="font-display text-xs font-semibold uppercase tracking-[0.1em] text-ink-dim">
                  Recommended
                </p>
                <p className="text-xs leading-snug text-ink-muted">
                  Browse by continent, country, and region. More areas ship over
                  time.
                </p>
                <BundledPresetTree presets={bundledPresets} />
              </section>
            ) : null}

            {userPresets.length === 0 ? (
              bundledPresets.length === 0 ? (
                <p className="text-sm text-ink-dim">
                  No presets saved on this device.
                </p>
              ) : null
            ) : (
              <section className="space-y-2">
                {bundledPresets.length > 0 ? (
                  <p className="font-display text-xs font-semibold uppercase tracking-[0.1em] text-ink-dim">
                    Your presets
                  </p>
                ) : null}
                <ul className="space-y-3">
                  {userPresets.map((preset) => (
                    <PresetDetailPanel
                      key={preset.id}
                      preset={preset}
                      onDelete={onDelete}
                    />
                  ))}
                </ul>
              </section>
            )}
          </>
        )}
      </div>
    </main>
  );
}
