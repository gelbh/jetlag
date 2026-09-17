import { Box, Button, Stack, Text } from "@mantine/core";
import { usePersistedDismiss } from "@/hooks/forms/usePersistedDismiss";
import {
  IosInsetGroup,
  IosSectionLabel,
  iosFilledStyles,
} from "@/components/ui/apple/iosEntryChrome";
import { IosInsetHairline } from "@/components/ui/apple/IosInsetRow";
import { SheetHost } from "../../ui/sheets/SheetHost";

const STORAGE_KEY = "jetlag.mapFirstRunDismissed";

interface MapFirstRunSheetProps {
  open: boolean;
  onDismiss: () => void;
  /** Open from Settings even after first-run dismiss. */
  forceOpen?: boolean;
}

function GuideRow({
  title,
  body,
  showSeparator = false,
}: {
  title: string;
  body: string;
  showSeparator?: boolean;
}) {
  return (
    <>
      {showSeparator ? <IosInsetHairline insetStart="1rem" /> : null}
      <Box px="1rem" py="0.75rem">
        <Text
          style={{
            fontSize: "1.0625rem",
            fontWeight: 590,
            letterSpacing: "-0.01em",
            color: "var(--color-field-ink)",
            lineHeight: 1.25,
          }}
        >
          {title}
        </Text>
        <Text
          style={{
            marginTop: "0.25rem",
            fontSize: "0.875rem",
            lineHeight: 1.4,
            color: "var(--color-field-ink-muted)",
          }}
        >
          {body}
        </Text>
      </Box>
    </>
  );
}

export function MapFirstRunSheet({
  open,
  onDismiss,
  forceOpen = false,
}: MapFirstRunSheetProps) {
  const { dismissed, dismiss: persistDismiss } = usePersistedDismiss(STORAGE_KEY);

  if (dismissed && !forceOpen) {
    return null;
  }

  const dismiss = () => {
    persistDismiss();
    onDismiss();
  };

  return (
    <SheetHost
      open={open}
      onClose={dismiss}
      ariaLabel="Map tools guide"
      maxHeightClassName="max-h-[min(70dvh,32rem)]"
      pinned={
        <h2 className="text-[1.375rem] font-bold tracking-tight text-[var(--color-field-ink)]">
          Map tools
        </h2>
      }
    >
      <Stack gap="lg">
        <Text
          style={{
            fontSize: "0.9375rem",
            lineHeight: 1.45,
            color: "var(--color-field-ink-muted)",
          }}
        >
          Question tools live on the Hunt dock. Cue sits up top; chips stay in
          the thumb zone; the send strip arms when you are ready. Markup lives
          under Draw.
        </Text>

        <Stack gap="xs">
          <IosSectionLabel>Hunt dock</IosSectionLabel>
          <IosInsetGroup>
            <GuideRow
              title="Ask tools"
              body="Matching, Measuring, Thermometer, Radar, Tentacles, and Photo. Place on the map, then commit from the primed strip."
            />
            <GuideRow
              showSeparator
              title="Cue and cost"
              body="The top cue names the next step. Cost chips show the question card spend before you send."
            />
          </IosInsetGroup>
        </Stack>

        <Stack gap="xs">
          <IosSectionLabel>Draw</IosSectionLabel>
          <IosInsetGroup>
            <GuideRow
              title="Zone, Pin, Freehand"
              body="Open Draw (or More on narrow phones) for boundaries, point marks, and freehand scribbles."
            />
          </IosInsetGroup>
        </Stack>

        <Stack gap="xs">
          <IosSectionLabel>Settings</IosSectionLabel>
          <IosInsetGroup>
            <GuideRow
              title="Map, Game, Session"
              body="Layers and basemap under Map. Join code and rules under Game. Device power, help, and leave under Session."
            />
          </IosInsetGroup>
        </Stack>

        <Button fullWidth styles={iosFilledStyles} onClick={dismiss}>
          {forceOpen ? "Done" : "Got it"}
        </Button>
      </Stack>
    </SheetHost>
  );
}
