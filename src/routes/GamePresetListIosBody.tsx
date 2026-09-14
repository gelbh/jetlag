import { Button, Stack, Text, TextInput } from "@mantine/core";
import { Link } from "react-router-dom";
import {
  IosInsetGroup,
  IosSectionLabel,
  iosFilledStyles,
} from "@/components/ui/apple/iosEntryChrome";
import { EmptyState } from "@/components/ui/feedback/EmptyState";
import { BundledPresetTree } from "@/components/presets/BundledPresetTree";
import {
  IosPresetBadge,
  IosPresetCard,
  IosPresetDangerButton,
  IosPresetHostButton,
  IosPresetSecondaryLink,
} from "@/components/presets/IosPresetCard";
import { PresetFavouriteButton } from "@/components/presets/PresetFavouriteButton";
import {
  bundledPresetDefinition,
  isBundledPresetId,
} from "@/domain/regions/bundledGamePresets";
import { formatBundledPresetLocation } from "@/domain/regions/bundledPresetHierarchy";
import { migrateGamePreset } from "@/domain/session/presets/gamePreset";
import { useGamePresetListModel } from "./GamePresetListModel";

type MigratedPreset = ReturnType<typeof migrateGamePreset>;

function presetBadges(preset: MigratedPreset) {
  return (
    <>
      {preset.advancedSettings.expansionPackEnabled ? (
        <IosPresetBadge>Expansion</IosPresetBadge>
      ) : null}
      {preset.advancedSettings.customQuestionPackEnabled ? (
        <IosPresetBadge>Custom Q</IosPresetBadge>
      ) : null}
      {preset.migrationStatus === "manual_required" ? (
        <IosPresetBadge tone="warning">Review</IosPresetBadge>
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
        <IosPresetHostButton to={`/presets/${preset.id}/edit`}>
          Review
        </IosPresetHostButton>
      ) : (
        <IosPresetHostButton to={`/create?preset=${preset.id}`}>
          Host
        </IosPresetHostButton>
      )}
      {!bundled ? (
        <>
          <IosPresetSecondaryLink to={`/presets/${preset.id}/edit`}>
            Edit
          </IosPresetSecondaryLink>
          <IosPresetDangerButton onClick={() => onDelete(preset.id)}>
            Delete
          </IosPresetDangerButton>
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
  const description = bundled
    ? bundledPresetDefinition(preset.id)?.description
    : undefined;

  return (
    <IosPresetCard
      name={preset.name}
      meta={presetMeta(preset)}
      description={description}
      badges={!bundled ? presetBadges(preset) : undefined}
      headerAction={
        <PresetFavouriteButton presetId={preset.id} chrome="ios" />
      }
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
  const location = definition
    ? formatBundledPresetLocation(definition)
    : undefined;

  return (
    <IosPresetCard
      name={preset.name}
      meta={presetMeta(preset)}
      location={location}
      description={description}
      badges={!bundled ? presetBadges(preset) : undefined}
      headerAction={
        <PresetFavouriteButton presetId={preset.id} chrome="ios" />
      }
      actions={<PresetRowActions preset={preset} onDelete={onDelete} />}
    />
  );
}

/** Join-style iOS browse body for Mantine presets list. */
export function GamePresetListIosBody() {
  const model = useGamePresetListModel();

  return (
    <Stack gap={22}>
      <Stack gap={8}>
        <IosSectionLabel>Search</IosSectionLabel>
        <IosInsetGroup>
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
        </IosInsetGroup>
      </Stack>

      <Button
        component={Link}
        to="/presets/new"
        fullWidth
        styles={iosFilledStyles}
      >
        New preset
      </Button>

      {model.searching ? (
        model.searchResults.length === 0 ? (
          <EmptyState>No presets match your search.</EmptyState>
        ) : (
          <Stack gap="sm">
            {model.searchResults.map((preset) => (
              <SearchResultRow
                key={preset.id}
                preset={preset}
                onDelete={model.onDelete}
              />
            ))}
          </Stack>
        )
      ) : (
        <Stack gap={22}>
          {model.favouritePresets.length > 0 ? (
            <Stack gap={8}>
              <IosSectionLabel>Favourites</IosSectionLabel>
              <Stack gap="sm">
                {model.favouritePresets.map((preset) => (
                  <UserOrFavouriteRow
                    key={preset.id}
                    preset={preset}
                    onDelete={model.onDelete}
                  />
                ))}
              </Stack>
            </Stack>
          ) : null}

          {model.bundledPresets.length > 0 ? (
            <Stack gap={8}>
              <IosSectionLabel>Recommended</IosSectionLabel>
              <Text size="xs" c="var(--color-field-ink-muted)" px={4}>
                Browse by continent, country, and region. More areas ship over
                time.
              </Text>
              <BundledPresetTree presets={model.bundledPresets} chrome="ios" />
            </Stack>
          ) : null}

          {model.userPresets.length === 0 ? (
            model.bundledPresets.length === 0 ? (
              <EmptyState>No presets saved on this device.</EmptyState>
            ) : null
          ) : (
            <Stack gap={8}>
              {model.bundledPresets.length > 0 ? (
                <IosSectionLabel>Your presets</IosSectionLabel>
              ) : null}
              <Stack gap="sm">
                {model.userPresets.map((preset) => (
                  <UserOrFavouriteRow
                    key={preset.id}
                    preset={preset}
                    onDelete={model.onDelete}
                  />
                ))}
              </Stack>
            </Stack>
          )}
        </Stack>
      )}
    </Stack>
  );
}
