import { Button, Stack, Text, TextInput } from "@mantine/core";
import { Link } from "react-router-dom";
import { BundledPresetTree } from "@/components/presets/BundledPresetTree";
import {
  PresetBadge,
  PresetCard,
  PresetDangerButton,
  PresetHostButton,
  PresetSecondaryLink,
} from "@/components/presets/PresetCard";
import { PresetFavouriteButton } from "@/components/presets/PresetFavouriteButton";
import { filledStyles, InsetGroup, SectionLabel } from "@/components/ui/entry/entryChrome";
import { EmptyState } from "@/components/ui/feedback/EmptyState";
import { bundledPresetDefinition, isBundledPresetId } from "@/domain/regions/bundledGamePresets";
import { formatBundledPresetLocation } from "@/domain/regions/bundledPresetHierarchy";
import { migrateGamePreset } from "@/domain/session/presets/gamePreset";
import { useGamePresetListModel } from "./GamePresetListModel";

type MigratedPreset = ReturnType<typeof migrateGamePreset>;

function presetBadges(preset: MigratedPreset) {
  return (
    <>
      {preset.advancedSettings.expansionPackEnabled ? <PresetBadge>Expansion</PresetBadge> : null}
      {preset.advancedSettings.customQuestionPackEnabled ? (
        <PresetBadge>Custom Q</PresetBadge>
      ) : null}
      {preset.migrationStatus === "manual_required" ? (
        <PresetBadge tone="warning">Review</PresetBadge>
      ) : null}
    </>
  );
}

function presetMeta(preset: MigratedPreset) {
  return (
    <>
      {preset.gameSize} · {preset.distanceUnit}
      {preset.placeLabel ? ` · ${preset.placeLabel}` : ""}
    </>
  );
}

function PresetRowActions({
  preset,
  onDelete,
}: {
  preset: MigratedPreset;
  onDelete: (id: string) => void;
}) {
  const bundled = isBundledPresetId(preset.id);
  return (
    <>
      {preset.migrationStatus === "manual_required" ? (
        <PresetHostButton to={`/presets/${preset.id}/edit`}>Review</PresetHostButton>
      ) : (
        <PresetHostButton to={`/create?preset=${preset.id}`}>Host</PresetHostButton>
      )}
      {!bundled ? (
        <>
          <PresetSecondaryLink to={`/presets/${preset.id}/edit`}>Edit</PresetSecondaryLink>
          <PresetDangerButton onClick={() => onDelete(preset.id)}>Delete</PresetDangerButton>
        </>
      ) : null}
    </>
  );
}

function UserOrFavouriteRow({
  preset,
  onDelete,
}: {
  preset: MigratedPreset;
  onDelete: (id: string) => void;
}) {
  const bundled = isBundledPresetId(preset.id);
  const description = bundled ? bundledPresetDefinition(preset.id)?.description : undefined;

  return (
    <PresetCard
      name={preset.name}
      meta={presetMeta(preset)}
      description={description}
      badges={!bundled ? presetBadges(preset) : undefined}
      headerAction={<PresetFavouriteButton presetId={preset.id} />}
      actions={<PresetRowActions preset={preset} onDelete={onDelete} />}
    />
  );
}

function SearchResultRow({
  preset,
  onDelete,
}: {
  preset: MigratedPreset;
  onDelete: (id: string) => void;
}) {
  const bundled = isBundledPresetId(preset.id);
  const definition = bundled ? bundledPresetDefinition(preset.id) : undefined;
  const description = definition?.description;
  const location = definition ? formatBundledPresetLocation(definition) : undefined;

  return (
    <PresetCard
      name={preset.name}
      meta={presetMeta(preset)}
      location={location}
      description={description}
      badges={!bundled ? presetBadges(preset) : undefined}
      headerAction={<PresetFavouriteButton presetId={preset.id} />}
      actions={<PresetRowActions preset={preset} onDelete={onDelete} />}
    />
  );
}

/** Join-style iOS browse body for Mantine presets list. */
export function GamePresetListBody() {
  const model = useGamePresetListModel();

  return (
    <Stack gap={22}>
      <Stack gap={8}>
        <SectionLabel>Search</SectionLabel>
        <InsetGroup>
          <TextInput
            id={model.searchId}
            aria-label="Search presets"
            value={model.query}
            onChange={(event) => model.onQueryChange(event.currentTarget.value)}
            placeholder="Name or place…"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            inputMode="search"
            styles={{
              input: {
                border: "none",
                background: "transparent",
                minHeight: "3.25rem",
                color: "var(--color-field-ink)",
                fontSize: "1rem",
                fontWeight: 510,
                paddingInline: "1rem",
              },
            }}
          />
        </InsetGroup>
      </Stack>

      <Button component={Link} to="/presets/new" fullWidth styles={filledStyles}>
        New preset
      </Button>

      {model.searching ? (
        model.searchResults.length === 0 ? (
          <EmptyState>No presets match your search.</EmptyState>
        ) : (
          <Stack gap="sm">
            {model.searchResults.map((preset) => (
              <SearchResultRow key={preset.id} preset={preset} onDelete={model.onDelete} />
            ))}
          </Stack>
        )
      ) : (
        <Stack gap={22}>
          {model.favouritePresets.length > 0 ? (
            <Stack gap={8}>
              <SectionLabel>Favourites</SectionLabel>
              <Stack gap="sm">
                {model.favouritePresets.map((preset) => (
                  <UserOrFavouriteRow key={preset.id} preset={preset} onDelete={model.onDelete} />
                ))}
              </Stack>
            </Stack>
          ) : null}

          {model.bundledPresets.length > 0 ? (
            <Stack gap={8}>
              <SectionLabel>Recommended</SectionLabel>
              <Text size="xs" c="var(--color-field-ink-muted)" px={4}>
                Browse by continent, country, and region. More areas ship over time.
              </Text>
              <BundledPresetTree presets={model.bundledPresets} />
            </Stack>
          ) : null}

          {model.userPresets.length === 0 ? (
            model.bundledPresets.length === 0 ? (
              <EmptyState>No presets saved on this device.</EmptyState>
            ) : null
          ) : (
            <Stack gap={8}>
              {model.bundledPresets.length > 0 ? <SectionLabel>Your presets</SectionLabel> : null}
              <Stack gap="sm">
                {model.userPresets.map((preset) => (
                  <UserOrFavouriteRow key={preset.id} preset={preset} onDelete={model.onDelete} />
                ))}
              </Stack>
            </Stack>
          )}
        </Stack>
      )}
    </Stack>
  );
}
