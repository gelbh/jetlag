import { Box, Button, Group, Paper, Stack, Text, Title } from "@mantine/core";
import { MapView } from "../../map/chrome/MapView";
import { FramingPreviewLayers } from "../../map/layers/FramingPreviewLayers";
import { GameAreaMask } from "../../map/layers/GameAreaMask";
import { useScrollLock } from "@/hooks/layout/useScrollLock";
import type { MapStyle } from "@/domain/map/mapBasemaps";
import {
  boundingBoxHasMinimumSpan,
  gameAreaToBoundingBox,
} from "@/domain/geometry/gameArea/geometry";
import type {
  FramingMode,
  GameAreaFramingResult,
} from "@/hooks/session/useGameAreaFraming";
import type { MapBounds, MapBoundsExpression } from "@/domain/map/mapBounds";
import type { LatLngTuple } from "@/domain/geometry/gameArea/geometry";
import type { GameArea } from "@/domain/map/annotations";
import {
  FramingModeSegmentControl,
  GameAreaFramingPolygonActions,
  GameAreaFramingStats,
} from "./GameAreaFramingControls";
import { framingModeHint } from "./gameAreaFramingUi";
import {
  filledStyles,
  grayStyles,
} from "@/components/ui/entry/entryStyles";
import { JETLAG_MODAL_Z_INDEX } from "@/theme/theme";

export interface GameAreaFramingController {
  framingMode: FramingMode;
  setFramingMode: (mode: FramingMode) => void;
  focusBounds: MapBoundsExpression | null;
  previewGameArea: GameArea | null;
  circleCenter: LatLngTuple | null;
  circleRadiusMeters: number | null;
  polygonVertices: readonly LatLngTuple[];
  hasValidDraft: boolean;
  userFramed: boolean;
  handleBoundsChange: (bounds: MapBounds) => void;
  handleUserViewportFramed: () => void;
  handleMapClick: (lat: number, lng: number) => void;
  closePolygon: () => boolean;
  resetPolygonVertices: () => void;
}

interface GameAreaFramingModalProps {
  open: boolean;
  mapStyle: MapStyle;
  onMapStyleChange?: (style: MapStyle) => void;
  framing: GameAreaFramingController;
  /** Place search or saved area shown until the user draws on the map. */
  referenceGameArea?: GameArea | null;
  referenceFocusBounds?: MapBoundsExpression | null;
  onClose: () => void;
  onConfirm: (result: GameAreaFramingResult) => void;
}

const framingPanelStyles = {
  backgroundColor: "oklch(from var(--color-canvas) l c h / 0.92)",
  border: "0.33px solid oklch(from var(--color-field-ink) l c h / 0.14)",
  backdropFilter: "blur(20px) saturate(1.4)",
  WebkitBackdropFilter: "blur(20px) saturate(1.4)",
} as const;

export function GameAreaFramingModal({
  open,
  mapStyle,
  onMapStyleChange,
  framing,
  referenceGameArea = null,
  referenceFocusBounds = null,
  onClose,
  onConfirm,
}: GameAreaFramingModalProps) {
  useScrollLock(open);

  if (!open) {
    return null;
  }

  const manualFramingActive = framing.userFramed;
  const effectiveGameArea = manualFramingActive
    ? framing.previewGameArea
    : (referenceGameArea ?? framing.previewGameArea);
  const effectiveFocusBounds =
    !manualFramingActive && referenceFocusBounds
      ? referenceFocusBounds
      : framing.focusBounds;
  const hasValidDraft = manualFramingActive
    ? framing.hasValidDraft
    : Boolean(
        effectiveGameArea &&
          boundingBoxHasMinimumSpan(gameAreaToBoundingBox(effectiveGameArea)),
      );

  const handleConfirm = () => {
    if (!effectiveGameArea || !hasValidDraft) {
      return;
    }

    onConfirm({
      gameArea: effectiveGameArea,
      focusBounds: gameAreaToBoundingBox(effectiveGameArea),
    });
    onClose();
  };

  const maskGameArea =
    framing.framingMode === "circle" && !effectiveGameArea
      ? null
      : effectiveGameArea;

  return (
    <Box
      className="pointer-events-auto fixed inset-0"
      style={{
        zIndex: JETLAG_MODAL_Z_INDEX,
        backgroundColor: "var(--color-surface-deep)",
      }}
      data-testid="game-area-framing-modal"
    >
      <Box className="absolute inset-0">
        <MapView
          model={{
            mapStyle,
            onMapStyleChange,
            zoom: 10,
            focusBounds: effectiveFocusBounds,
            fitBoundsPadding: [56, 56],
            showZoomControl: true,
            zoomControlInset: "safe-area",
            mapStyleControlInset: "safe-area",
            onBoundsChange: framing.handleBoundsChange,
            onUserViewportFramed: framing.handleUserViewportFramed,
            onMapClick: framing.handleMapClick,
            className: "h-full w-full",
          }}
        >
          {manualFramingActive ? (
            <FramingPreviewLayers
              gameArea={maskGameArea}
              framingMode={framing.framingMode}
              circleCenter={framing.circleCenter}
              circleRadiusMeters={framing.circleRadiusMeters}
              polygonVertices={framing.polygonVertices}
            />
          ) : effectiveGameArea ? (
            <GameAreaMask gameArea={effectiveGameArea} framing />
          ) : null}
        </MapView>
      </Box>

      <Box
        className="pointer-events-none absolute inset-x-0 top-0 px-3"
        style={{
          zIndex: JETLAG_MODAL_Z_INDEX + 1,
          paddingTop: "max(0.75rem, env(safe-area-inset-top))",
        }}
      >
        <Paper
          className="pointer-events-auto mx-auto max-w-xl"
          radius={16}
          p="md"
          style={framingPanelStyles}
        >
          <Stack gap="sm">
            <Group justify="space-between" align="flex-start" wrap="nowrap">
              <Box>
                <Title
                  order={2}
                  size="h4"
                  c="var(--color-field-ink)"
                  style={{ letterSpacing: "-0.02em" }}
                >
                  Frame area
                </Title>
              </Box>
              <Group gap="xs" wrap="nowrap" className="shrink-0">
                <Button type="button" styles={grayStyles} onClick={onClose}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  styles={filledStyles}
                  onClick={handleConfirm}
                  disabled={!hasValidDraft}
                >
                  Done
                </Button>
              </Group>
            </Group>

            <FramingModeSegmentControl
              value={framing.framingMode}
              onChange={framing.setFramingMode}
            />
          </Stack>
        </Paper>
      </Box>

      <Box
        className="pointer-events-none absolute inset-x-0 bottom-0 px-3"
        style={{
          zIndex: JETLAG_MODAL_Z_INDEX + 1,
          paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))",
        }}
      >
        <Paper
          className="pointer-events-auto mx-auto max-w-xl"
          radius={16}
          p="md"
          style={framingPanelStyles}
        >
          <Stack gap="sm">
            <Text size="sm" c="var(--color-field-ink-muted)" lh={1.35}>
              {framingModeHint(framing.framingMode)}
            </Text>

            {framing.framingMode === "polygon" ? (
              <GameAreaFramingPolygonActions
                vertexCount={framing.polygonVertices.length}
                onClose={() => framing.closePolygon()}
                onReset={() => framing.resetPolygonVertices()}
              />
            ) : null}

            <GameAreaFramingStats gameArea={effectiveGameArea} compact />
          </Stack>
        </Paper>
      </Box>
    </Box>
  );
}
