import { Box, Button, Stack, Text, Textarea, TextInput } from "@mantine/core";
import { useState } from "react";
import {
  compactDangerStyles,
  filledStyles,
  InsetGroup,
  insetTextareaStyles,
  insetTextInputStyles,
  SectionLabel,
} from "@/components/ui/entry/entryChrome";
import { InsetHairline } from "@/components/ui/entry/InsetRow";
import {
  createSessionCustomCategoryId,
  type SessionCustomCategory,
} from "@/domain/session/catalog/sessionCustomContent";
import type { AdvancedSessionSettingsValue } from "@/domain/session/tools/advancedSessionSettings";

interface CategoryEditorProps {
  value: AdvancedSessionSettingsValue;
  onChange: (value: AdvancedSessionSettingsValue) => void;
  disabled?: boolean;
}

export function CategoryEditor({ value, onChange, disabled }: CategoryEditorProps) {
  const [categoryDraft, setCategoryDraft] = useState({
    label: "",
    promptNoun: "",
    selectors: "",
  });

  const addCategory = () => {
    const label = categoryDraft.label.trim();
    const promptNoun = categoryDraft.promptNoun.trim();
    const selectors = categoryDraft.selectors
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    if (!label || !promptNoun || selectors.length === 0) {
      return;
    }

    const category: SessionCustomCategory = {
      id: createSessionCustomCategoryId(label),
      label,
      promptNoun,
      overpassSelectors: selectors,
    };

    onChange({
      ...value,
      customCategories: [...value.customCategories, category],
    });
    setCategoryDraft({ label: "", promptNoun: "", selectors: "" });
  };

  return (
    <Stack gap="xs">
      <SectionLabel>Custom POI categories</SectionLabel>
      <Text size="xs" c="var(--color-field-ink-muted)" px={4}>
        Add Overpass tag selectors for Matching, Measuring, and Tentacle (one selector per line,
        e.g. amenity=police).
      </Text>

      {value.customCategories.length > 0 ? (
        <InsetGroup>
          {value.customCategories.map((category, index) => (
            <Box key={category.id}>
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
                    {category.label}
                  </Text>
                  <Text size="xs" c="var(--color-field-ink-muted)">
                    {category.overpassSelectors.join(", ")}
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
                      customCategories: value.customCategories.filter(
                        (item) => item.id !== category.id,
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
          label="Label"
          value={categoryDraft.label}
          disabled={disabled}
          onChange={(event) =>
            setCategoryDraft((current) => ({
              ...current,
              label: event.currentTarget.value,
            }))
          }
          styles={insetTextInputStyles}
        />
        <InsetHairline insetStart="1rem" />
        <TextInput
          label="Prompt noun"
          value={categoryDraft.promptNoun}
          disabled={disabled}
          placeholder="police station"
          onChange={(event) =>
            setCategoryDraft((current) => ({
              ...current,
              promptNoun: event.currentTarget.value,
            }))
          }
          styles={insetTextInputStyles}
        />
        <InsetHairline insetStart="1rem" />
        <Textarea
          label="Overpass selectors"
          value={categoryDraft.selectors}
          disabled={disabled}
          rows={3}
          placeholder="[amenity=police]"
          onChange={(event) =>
            setCategoryDraft((current) => ({
              ...current,
              selectors: event.currentTarget.value,
            }))
          }
          styles={insetTextareaStyles}
        />
      </InsetGroup>

      <Button
        type="button"
        fullWidth
        disabled={disabled}
        styles={filledStyles}
        onClick={addCategory}
      >
        Add category
      </Button>
    </Stack>
  );
}
