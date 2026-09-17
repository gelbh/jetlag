import { useRef, useState } from "react";
import { Box, Button, Stack, Text } from "@mantine/core";
import type { AdvancedSessionSettingsValue } from "@/domain/session/tools/advancedSessionSettings";
import type { MatchingAdminLevel } from "@/domain/session/catalog/sessionCustomContent";
import { parseMatchingAreaGeoJson } from "@/services/geo/matching/matchingAreaGeoJson";
import type { GameArea } from "@/domain/map/annotations";
import {
  IosErrorCallout,
  IosInsetGroup,
  IosSectionLabel,
  iosCompactDangerStyles,
  iosCompactGrayStyles,
} from "@/components/ui/apple/iosEntryChrome";
import { IosInsetHairline } from "@/components/ui/apple/IosInsetRow";

const ADMIN_LEVEL_LABELS: Record<MatchingAdminLevel, string> = {
  4: "1st division (admin level 4)",
  6: "2nd division (admin level 6)",
  8: "3rd division (admin level 8)",
  9: "4th division (admin level 9)",
};

interface MatchingAreaUploadProps {
  value: AdvancedSessionSettingsValue;
  onChange: (value: AdvancedSessionSettingsValue) => void;
  gameArea?: GameArea | null;
  disabled?: boolean;
}

export function MatchingAreaUpload({
  value,
  onChange,
  gameArea,
  disabled,
}: MatchingAreaUploadProps) {
  const fileInputRefs = useRef<
    Partial<Record<MatchingAdminLevel, HTMLInputElement | null>>
  >({});
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleMatchingAreaUpload = async (
    level: MatchingAdminLevel,
    file: File,
  ) => {
    if (!gameArea) {
      setUploadError("Frame a play area on the map before uploading boundaries.");
      return;
    }

    setUploadError(null);

    try {
      const text = await file.text();
      parseMatchingAreaGeoJson(text, gameArea, level);
      onChange({
        ...value,
        customMatchingAreas: {
          ...value.customMatchingAreas,
          [level]: text,
        },
      });
    } catch (error) {
      setUploadError(
        error instanceof Error ? error.message : "Couldn't import GeoJSON.",
      );
    }
  };

  return (
    <Stack gap="xs">
      <IosSectionLabel>Custom matching areas</IosSectionLabel>
      <Text size="xs" c="var(--color-field-ink-muted)" px={4}>
        Upload GeoJSON FeatureCollections to replace OpenStreetMap admin
        boundaries for a division level in this session.
      </Text>
      {!gameArea ? (
        <Text size="xs" c="var(--color-signal)" px={4}>
          Frame a play area to validate imported boundaries.
        </Text>
      ) : null}
      <IosInsetGroup>
        {([4, 6, 8, 9] as const).map((level, index) => {
          const uploaded = Boolean(value.customMatchingAreas[level]);

          return (
            <Box key={level}>
              {index > 0 ? <IosInsetHairline insetStart="1rem" /> : null}
              <Box
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  gap: "0.5rem",
                  paddingInline: "1rem",
                  paddingBlock: "0.65rem",
                  minHeight: "2.875rem",
                }}
              >
                <Text
                  size="sm"
                  style={{ flex: 1, minWidth: "8rem", color: "var(--color-field-ink)" }}
                >
                  {ADMIN_LEVEL_LABELS[level]}
                  {uploaded ? (
                    <Text
                      span
                      size="xs"
                      c="var(--color-field-ink-muted)"
                      ml={6}
                    >
                      Uploaded
                    </Text>
                  ) : null}
                </Text>
                <input
                  ref={(element) => {
                    fileInputRefs.current[level] = element;
                  }}
                  type="file"
                  accept=".json,.geojson,application/geo+json,application/json"
                  className="hidden"
                  disabled={disabled}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) {
                      void handleMatchingAreaUpload(level, file);
                    }
                    event.target.value = "";
                  }}
                />
                <Button
                  type="button"
                  size="compact-sm"
                  disabled={disabled}
                  styles={iosCompactGrayStyles}
                  onClick={() => fileInputRefs.current[level]?.click()}
                >
                  {uploaded ? "Replace" : "Upload"}
                </Button>
                {uploaded ? (
                  <Button
                    type="button"
                    size="compact-sm"
                    disabled={disabled}
                    styles={iosCompactDangerStyles}
                    onClick={() => {
                      const next = { ...value.customMatchingAreas };
                      delete next[level];
                      onChange({ ...value, customMatchingAreas: next });
                    }}
                  >
                    Remove
                  </Button>
                ) : null}
              </Box>
            </Box>
          );
        })}
      </IosInsetGroup>
      <IosErrorCallout>{uploadError}</IosErrorCallout>
    </Stack>
  );
}
