import { useState } from "react";
import { Box, Button, Stack, Text, TextInput } from "@mantine/core";
import type { AdvancedSessionSettingsValue } from "@/domain/session/tools/advancedSessionSettings";
import type { LatLngTuple } from "@/domain/geometry/gameArea/geometry";
import type { SessionCustomLocationPin } from "@/domain/session/catalog/sessionCustomContent";
import {
  IosInsetGroup,
  IosSectionLabel,
  iosCompactDangerStyles,
  iosFilledStyles,
  iosInsetTextInputStyles,
} from "@/components/ui/apple/iosEntryChrome";
import { IosInsetHairline } from "@/components/ui/apple/IosInsetRow";

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
      <IosSectionLabel>Manual location pins</IosSectionLabel>
      <Text size="xs" c="var(--color-field-ink-muted)" px={4}>
        Named points for Measuring and Tentacle when map data is missing.
      </Text>

      {value.customLocationPins.length > 0 ? (
        <IosInsetGroup>
          {value.customLocationPins.map((pin, index) => (
            <Box key={pin.id}>
              {index > 0 ? <IosInsetHairline insetStart="1rem" /> : null}
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
                  styles={iosCompactDangerStyles}
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
        </IosInsetGroup>
      ) : null}

      <IosInsetGroup>
        <TextInput
          label="Name"
          value={pinDraft.name}
          disabled={disabled}
          onChange={(event) =>
            setPinDraft((current) => ({
              ...current,
              name: event.currentTarget.value,
            }))
          }
          styles={iosInsetTextInputStyles}
        />
        <IosInsetHairline insetStart="1rem" />
        <TextInput
          label="Latitude"
          value={pinDraft.lat}
          disabled={disabled}
          inputMode="decimal"
          onChange={(event) =>
            setPinDraft((current) => ({
              ...current,
              lat: event.currentTarget.value,
            }))
          }
          styles={iosInsetTextInputStyles}
        />
        <IosInsetHairline insetStart="1rem" />
        <TextInput
          label="Longitude"
          value={pinDraft.lng}
          disabled={disabled}
          inputMode="decimal"
          onChange={(event) =>
            setPinDraft((current) => ({
              ...current,
              lng: event.currentTarget.value,
            }))
          }
          styles={iosInsetTextInputStyles}
        />
      </IosInsetGroup>

      <Button
        type="button"
        fullWidth
        disabled={disabled}
        styles={iosFilledStyles}
        onClick={addPin}
      >
        Add pin
      </Button>
    </Stack>
  );
}
