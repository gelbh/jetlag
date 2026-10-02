import { Box, Button, Stack, Text, Textarea, TextInput } from "@mantine/core";
import { useId, useState } from "react";
import {
  compactDangerStyles,
  ErrorCallout,
  filledStyles,
  InsetGroup,
  insetTextareaStyles,
  insetTextInputStyles,
} from "@/components/ui/entry/entryChrome";
import { InsetHairline } from "@/components/ui/entry/InsetRow";
import {
  createCustomMeasureGeometryId,
  type SessionCustomMeasureGeometry,
} from "@/domain/session/catalog/customMeasureGeometry";
import type { AdvancedSessionSettingsValue } from "@/domain/session/tools/advancedSessionSettings";

interface CustomMeasureGeometrySettingsProps {
  value: AdvancedSessionSettingsValue;
  onChange: (value: AdvancedSessionSettingsValue) => void;
  disabled?: boolean;
}

function parseMeasureGeometryGeoJson(text: string, label: string): SessionCustomMeasureGeometry {
  const parsed = JSON.parse(text) as {
    type?: string;
    geometry?: { type?: string };
    features?: Array<{ geometry?: { type?: string } }>;
  };

  let geometryType: string | undefined;
  if (parsed.type === "Feature") {
    geometryType = parsed.geometry?.type;
  } else if (parsed.type === "FeatureCollection") {
    geometryType = parsed.features?.[0]?.geometry?.type;
  } else {
    geometryType = parsed.type;
  }

  if (geometryType !== "LineString" && geometryType !== "Polygon") {
    throw new Error("GeoJSON must be a LineString or Polygon.");
  }

  const feature =
    parsed.type === "Feature"
      ? parsed
      : parsed.type === "FeatureCollection" && parsed.features?.[0]
        ? parsed.features[0]
        : {
            type: "Feature",
            properties: {},
            geometry: parsed,
          };

  return {
    id: createCustomMeasureGeometryId(label),
    label,
    kind: geometryType === "Polygon" ? "polygon" : "line",
    geometryJson: JSON.stringify(feature),
  };
}

export function CustomMeasureGeometrySettings({
  value,
  onChange,
  disabled,
}: CustomMeasureGeometrySettingsProps) {
  const [label, setLabel] = useState("");
  const [geoJson, setGeoJson] = useState("");
  const [error, setError] = useState<string | null>(null);
  const panelId = useId();
  const customMeasureGeometries = value.customMeasureGeometries ?? [];

  const addGeometry = () => {
    const trimmedLabel = label.trim();
    if (!trimmedLabel) {
      setError("Enter a label for this measuring target.");
      return;
    }

    try {
      const geometry = parseMeasureGeometryGeoJson(geoJson.trim(), trimmedLabel);
      onChange({
        ...value,
        customMeasureGeometries: [...customMeasureGeometries, geometry],
      });
      setLabel("");
      setGeoJson("");
      setError(null);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Couldn't import GeoJSON.");
    }
  };

  const removeGeometry = (id: string) => {
    onChange({
      ...value,
      customMeasureGeometries: customMeasureGeometries.filter((geometry) => geometry.id !== id),
    });
  };

  return (
    <Stack gap="xs">
      <Text id={panelId} size="xs" c="var(--color-field-ink-muted)" px={4}>
        Import a LineString or Polygon GeoJSON for coastline traces, HSR lines, or other custom
        measuring targets.
      </Text>

      {customMeasureGeometries.length > 0 ? (
        <InsetGroup>
          {customMeasureGeometries.map((geometry, index) => (
            <Box key={geometry.id}>
              {index > 0 ? <InsetHairline insetStart="1rem" /> : null}
              <Box
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  paddingInline: "1rem",
                  paddingBlock: "0.65rem",
                }}
              >
                <Box style={{ flex: 1, minWidth: 0 }}>
                  <Text size="sm" c="var(--color-field-ink)">
                    {geometry.label}
                  </Text>
                  <Text size="xs" c="var(--color-field-ink-muted)">
                    {geometry.kind}
                  </Text>
                </Box>
                <Button
                  type="button"
                  size="compact-sm"
                  disabled={disabled}
                  styles={compactDangerStyles}
                  onClick={() => removeGeometry(geometry.id)}
                >
                  Remove
                </Button>
              </Box>
            </Box>
          ))}
        </InsetGroup>
      ) : null}

      <InsetGroup error={Boolean(error)}>
        <TextInput
          label="Label"
          value={label}
          disabled={disabled}
          placeholder="South coast trace"
          aria-describedby={panelId}
          onChange={(event) => setLabel(event.currentTarget.value)}
          styles={insetTextInputStyles}
        />
        <InsetHairline insetStart="1rem" />
        <Textarea
          label="GeoJSON"
          value={geoJson}
          disabled={disabled}
          placeholder="Paste GeoJSON Feature or FeatureCollection…"
          rows={5}
          onChange={(event) => setGeoJson(event.currentTarget.value)}
          styles={{
            ...insetTextareaStyles,
            input: {
              ...insetTextareaStyles.input,
              fontFamily: "var(--font-mono)",
              fontSize: "0.8125rem",
            },
          }}
        />
      </InsetGroup>

      <ErrorCallout>{error}</ErrorCallout>

      <Button
        type="button"
        fullWidth
        disabled={disabled || !label.trim() || !geoJson.trim()}
        styles={filledStyles}
        onClick={addGeometry}
      >
        Add measuring geometry
      </Button>
    </Stack>
  );
}
