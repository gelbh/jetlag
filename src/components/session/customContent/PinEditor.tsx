import { Box, Button, Stack, Text, TextInput } from "@mantine/core";
import { useState } from "react";
import {
  compactDangerStyles,
  filledStyles,
  InsetGroup,
  insetTextInputStyles,
  SectionLabel,
} from "@/components/ui/entry/entryChrome";
import { InsetHairline } from "@/components/ui/entry/InsetRow";
import type { LatLngTuple } from "@/domain/geometry/gameArea/geometry";
import type { SessionCustomLocationPin } from "@/domain/session/catalog/sessionCustomContent";
import type { AdvancedSessionSettingsValue } from "@/domain/session/tools/advancedSessionSettings";

interface PinEditorProps {
  value: AdvancedSessionSettingsValue;
  onChange: (value: AdvancedSessionSettingsValue) => void;
  disabled?: boolean;
}

function createPinId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `custom-pin:${crypto.randomUUID()}`;
  }

  return `custom-pin:${Date.now()}`;
}

export function PinEditor({ value, onChange, disabled }: PinEditorProps) {
  const [pinDraft, setPinDraft] = useState({ name: "", lat: "", lng: "" });

  const addPin = () => {
    const name = pinDraft.name.trim();
    const lat = Number.parseFloat(pinDraft.lat);
    const lng = Number.parseFloat(pinDraft.lng);

    if (!name || !Number.isFinite(lat) || !Number.isFinite(lng)) {
      return;
    }

    const pin: SessionCustomLocationPin = {
      id: createPinId(),
      name,
      point: [lat, lng] as LatLngTuple,
    };

    onChange({
      ...value,
      customLocationPins: [...value.customLocationPins, pin],
    });
    setPinDraft({ name: "", lat: "", lng: "" });
  };

  return (
    <Stack gap="xs">
      <SectionLabel>Manual location pins</SectionLabel>
      <Text size="xs" c="var(--color-field-ink-muted)" px={4}>
        Named points for Measuring and Tentacle when map data is missing.
      </Text>

      {value.customLocationPins.length > 0 ? (
        <InsetGroup>
          {value.customLocationPins.map((pin, index) => (
            <Box key={pin.id}>
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
                    {pin.name}
                  </Text>
                  <Text size="xs" c="var(--color-field-ink-muted)">
                    {pin.point[0].toFixed(5)}, {pin.point[1].toFixed(5)}
                  </Text>
                </Box>
                <Button
                  type="button"
                  size="compact-sm"
                  disabled={disabled}
                  styles={compactDangerStyles}
                  onClick={() =>
                    onChange({
                      ...value,
                      customLocationPins: value.customLocationPins.filter(
                        (item) => item.id !== pin.id,
                      ),
                    })
                  }
                >
                  Remove
                </Button>
              </Box>
            </Box>
          ))}
        </InsetGroup>
      ) : null}

      <InsetGroup>
        <TextInput
          label="Name"
          value={pinDraft.name}
          disabled={disabled}
          onChange={(event) => {
            const name = event.currentTarget.value;
            setPinDraft((current) => ({ ...current, name }));
          }}
          styles={insetTextInputStyles}
        />
        <InsetHairline insetStart="1rem" />
        <TextInput
          label="Latitude"
          value={pinDraft.lat}
          disabled={disabled}
          inputMode="decimal"
          onChange={(event) => {
            const lat = event.currentTarget.value;
            setPinDraft((current) => ({ ...current, lat }));
          }}
          styles={insetTextInputStyles}
        />
        <InsetHairline insetStart="1rem" />
        <TextInput
          label="Longitude"
          value={pinDraft.lng}
          disabled={disabled}
          inputMode="decimal"
          onChange={(event) => {
            const lng = event.currentTarget.value;
            setPinDraft((current) => ({ ...current, lng }));
          }}
          styles={insetTextInputStyles}
        />
      </InsetGroup>

      <Button type="button" fullWidth disabled={disabled} styles={filledStyles} onClick={addPin}>
        Add pin
      </Button>
    </Stack>
  );
}
