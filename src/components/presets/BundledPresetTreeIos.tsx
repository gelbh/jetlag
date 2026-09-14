import { Box, Stack, Text, UnstyledButton } from "@mantine/core";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { IosInsetGroup } from "@/components/ui/apple/iosEntryChrome";
import { BUNDLED_GAME_PRESET_DEFINITIONS } from "@/domain/regions/bundledGamePresets";
import {
  districtNumberFromSubregionId,
  glyphIdForHierarchyCategory,
  type HierarchyCategoryGlyphId,
} from "@/domain/regions/bundledPresetCategorySymbols";
import {
  flagMarkForBundledPresetId,
  flagMarkForSegmentRow,
  type RegionFlagMark,
} from "@/domain/regions/bundledPresetFlags";
import {
  buildBundledPresetTree,
  type BundledPresetTreeNode,
} from "@/domain/regions/bundledPresetHierarchy";
import { bundledPresetDefinition } from "@/domain/regions/bundledGamePresets";
import { migrateGamePreset } from "@/domain/session/presets/gamePreset";
import { PresetFavouriteButton } from "./PresetFavouriteButton";

type MigratedPreset = ReturnType<typeof migrateGamePreset>;
type GroupNode = Extract<BundledPresetTreeNode, { kind: "group" }>;

type VisibleRow =
  | {
      kind: "group";
      node: GroupNode;
      depth: number;
      open: boolean;
      count: number;
      ancestorIds: string[];
    }
  | {
      kind: "preset";
      preset: MigratedPreset;
      depth: number;
      ancestorIds: string[];
    };

function countPresets(node: BundledPresetTreeNode): number {
  if (node.kind === "preset") {
    return 1;
  }
  return node.children.reduce((sum, child) => sum + countPresets(child), 0);
}

function collectVisibleRows(
  nodes: readonly BundledPresetTreeNode[],
  openGroupIds: ReadonlySet<string>,
  presetsById: ReadonlyMap<string, MigratedPreset>,
  depth: number,
  out: VisibleRow[],
  ancestorIds: string[] = [],
): void {
  for (const node of nodes) {
    if (node.kind === "group") {
      const open = openGroupIds.has(node.id);
      out.push({
        kind: "group",
        node,
        depth,
        open,
        count: countPresets(node),
        ancestorIds,
      });
      if (open) {
        collectVisibleRows(
          node.children,
          openGroupIds,
          presetsById,
          depth + 1,
          out,
          [...ancestorIds, node.id],
        );
      }
      continue;
    }

    const preset = presetsById.get(node.presetId);
    if (preset) {
      out.push({ kind: "preset", preset, depth, ancestorIds });
    }
  }
}

function DisclosureChevron({ open }: { open: boolean }) {
  return (
    <Box
      component="svg"
      width={11}
      height={11}
      viewBox="0 0 12 12"
      aria-hidden
      style={{
        flexShrink: 0,
        color: "var(--color-field-ink-muted)",
        transform: open ? "rotate(90deg)" : "rotate(0deg)",
        transition: "transform 160ms ease",
      }}
    >
      <path
        d="M4.25 2.25 L8.25 6 L4.25 9.75"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Box>
  );
}

const leadingSlotStyle = {
  flexShrink: 0,
  width: "1.35rem",
  height: "1rem",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
} as const;

function CategoryGlyph({ id }: { id: HierarchyCategoryGlyphId }) {
  const common = {
    width: 14,
    height: 14,
    viewBox: "0 0 14 14",
    fill: "none",
    "aria-hidden": true,
    style: { color: "var(--color-field-ink-muted)" },
  } as const;

  if (id === "local-authorities") {
    // Civic building
    return (
      <Box component="svg" {...common}>
        <path
          d="M2.5 12.25h9M3.25 12.25V6.1L7 3.4l3.75 2.7v5.85M5.1 12.25V8.6h1.55v3.65M7.35 12.25V8.6H8.9v3.65"
          stroke="currentColor"
          strokeWidth="1.15"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Box>
    );
  }

  if (id === "wards") {
    // 2×2 parcel grid
    return (
      <Box component="svg" {...common}>
        <rect
          x="2.25"
          y="2.25"
          width="4"
          height="4"
          rx="0.6"
          stroke="currentColor"
          strokeWidth="1.15"
        />
        <rect
          x="7.75"
          y="2.25"
          width="4"
          height="4"
          rx="0.6"
          stroke="currentColor"
          strokeWidth="1.15"
        />
        <rect
          x="2.25"
          y="7.75"
          width="4"
          height="4"
          rx="0.6"
          stroke="currentColor"
          strokeWidth="1.15"
        />
        <rect
          x="7.75"
          y="7.75"
          width="4"
          height="4"
          rx="0.6"
          stroke="currentColor"
          strokeWidth="1.15"
        />
      </Box>
    );
  }

  if (id === "boroughs") {
    // Three vertical borough strips
    return (
      <Box component="svg" {...common}>
        <rect
          x="2.2"
          y="2.5"
          width="2.7"
          height="9"
          rx="0.55"
          stroke="currentColor"
          strokeWidth="1.15"
        />
        <rect
          x="5.65"
          y="2.5"
          width="2.7"
          height="9"
          rx="0.55"
          stroke="currentColor"
          strokeWidth="1.15"
        />
        <rect
          x="9.1"
          y="2.5"
          width="2.7"
          height="9"
          rx="0.55"
          stroke="currentColor"
          strokeWidth="1.15"
        />
      </Box>
    );
  }

  // Districts: nested parcels
  return (
    <Box component="svg" {...common}>
      <rect
        x="2.25"
        y="2.5"
        width="9.5"
        height="9"
        rx="0.7"
        stroke="currentColor"
        strokeWidth="1.15"
      />
      <path
        d="M2.25 7h9.5M7 2.5v9"
        stroke="currentColor"
        strokeWidth="1.15"
        strokeLinecap="round"
      />
    </Box>
  );
}

function RowLeading({
  mark,
  category,
  districtNumber,
}: {
  mark: RegionFlagMark | null;
  category?: string;
  districtNumber?: number | null;
}) {
  if (mark) {
    const cutout = mark.presentation === "cutout";
    return (
      <Box
        component="img"
        src={mark.src}
        alt=""
        aria-hidden
        style={{
          ...leadingSlotStyle,
          objectFit: cutout ? "contain" : "cover",
          borderRadius: 2,
          border: cutout
            ? "none"
            : "0.33px solid oklch(from var(--color-field-ink) l c h / 0.22)",
          backgroundColor: cutout
            ? "transparent"
            : "oklch(from var(--color-field-ink) l c h / 0.08)",
        }}
      />
    );
  }

  if (districtNumber != null) {
    return (
      <Box
        aria-hidden
        style={{
          ...leadingSlotStyle,
          borderRadius: 3,
          border: "0.33px solid oklch(from var(--color-field-ink) l c h / 0.2)",
          backgroundColor: "oklch(from var(--color-field-ink) l c h / 0.08)",
          color: "var(--color-field-ink-muted)",
          fontSize: "0.625rem",
          fontWeight: 700,
          letterSpacing: "-0.02em",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {districtNumber}
      </Box>
    );
  }

  const glyphId = category ? glyphIdForHierarchyCategory(category) : null;
  if (glyphId) {
    return (
      <Box aria-hidden style={leadingSlotStyle}>
        <CategoryGlyph id={glyphId} />
      </Box>
    );
  }

  return <Box aria-hidden style={leadingSlotStyle} />;
}

/** Continent = flush; each nested level steps in more clearly. */
function rowPad(depth: number): number {
  if (depth <= 0) {
    return 14;
  }
  return 18 + depth * 16;
}

function groupLabelStyle(depth: number): {
  fw: number;
  size: "md" | "sm";
  opacity?: number;
} {
  if (depth === 0) {
    return { fw: 650, size: "md" };
  }
  if (depth === 1) {
    return { fw: 590, size: "sm" };
  }
  return { fw: 510, size: "sm", opacity: 0.92 };
}

const hairline =
  "0.33px solid oklch(from var(--color-field-ink) l c h / 0.12)";

function childWellBackground(depth: number): string {
  if (depth <= 0) {
    return "transparent";
  }
  // Nested rows sit in a slightly deeper well so parents read as chrome.
  return `oklch(from var(--color-field-ink) l c h / ${0.035 + Math.min(depth, 3) * 0.015})`;
}

function TreeRows({
  rows,
  onToggleGroup,
}: {
  rows: VisibleRow[];
  onToggleGroup: (groupId: string) => void;
}) {
  return (
    <>
      {rows.map((row, index) => {
        const showDivider = index > 0;
        if (row.kind === "group") {
          const label = groupLabelStyle(row.depth);
          const isContinent = row.depth === 0;
          return (
            <UnstyledButton
              key={`g:${row.node.id}`}
              type="button"
              aria-expanded={row.open}
              onClick={() => onToggleGroup(row.node.id)}
              styles={{
                root: {
                  display: "flex",
                  width: "100%",
                  minHeight: isContinent ? 52 : 46,
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                  paddingBlock: isContinent ? 12 : 9,
                  paddingInlineEnd: 14,
                  paddingInlineStart: rowPad(row.depth),
                  border: "none",
                  borderRadius: 0,
                  borderTop: showDivider ? hairline : "none",
                  backgroundColor: isContinent
                    ? row.open
                      ? "oklch(from var(--color-field-ink) l c h / 0.07)"
                      : "oklch(from var(--color-field-ink) l c h / 0.04)"
                    : childWellBackground(row.depth),
                  color: "var(--color-field-ink)",
                  textAlign: "left",
                  WebkitTapHighlightColor: "transparent",
                  "&:hover": {
                    backgroundColor: isContinent
                      ? "oklch(from var(--color-field-ink) l c h / 0.09)"
                      : "oklch(from var(--color-field-ink) l c h / 0.07)",
                  },
                  "&:active": {
                    backgroundColor:
                      "oklch(from var(--color-field-ink) l c h / 0.1)",
                  },
                },
              }}
            >
              <Box
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 10,
                  minWidth: 0,
                  flex: 1,
                }}
              >
                <RowLeading
                  mark={flagMarkForSegmentRow(row.node.id, row.ancestorIds)}
                  category={row.node.category}
                />
                <Text
                  fw={label.fw}
                  size={label.size}
                  style={{
                    lineHeight: 1.25,
                    minWidth: 0,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    opacity: label.opacity,
                    letterSpacing: isContinent ? "-0.015em" : undefined,
                  }}
                >
                  {row.node.name}
                </Text>
              </Box>
              <Box
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  flexShrink: 0,
                }}
              >
                <Text
                  size="xs"
                  c="var(--color-field-ink-muted)"
                  style={{ fontVariantNumeric: "tabular-nums" }}
                >
                  {row.count}
                </Text>
                <DisclosureChevron open={row.open} />
              </Box>
            </UnstyledButton>
          );
        }

        const meta = [
          row.preset.gameSize,
          row.preset.distanceUnit,
          row.preset.placeLabel,
        ]
          .filter(Boolean)
          .join(" · ");
        const presetFlag = flagMarkForBundledPresetId(row.preset.id);
        const districtNumber = districtNumberFromSubregionId(
          bundledPresetDefinition(row.preset.id)?.subregionId,
        );

        return (
          <Box
            key={`p:${row.preset.id}`}
            style={{
              display: "flex",
              alignItems: "stretch",
              minHeight: 52,
              borderTop: showDivider ? hairline : "none",
              backgroundColor: childWellBackground(row.depth),
            }}
          >
            <UnstyledButton
              component={Link}
              to={`/create?preset=${row.preset.id}`}
              aria-label={`Host ${row.preset.name}`}
              styles={{
                root: {
                  display: "flex",
                  flex: 1,
                  minWidth: 0,
                  alignItems: "center",
                  gap: 10,
                  paddingBlock: 10,
                  paddingInlineStart: rowPad(row.depth),
                  paddingInlineEnd: 8,
                  border: "none",
                  borderRadius: 0,
                  backgroundColor: "transparent",
                  color: "inherit",
                  textAlign: "left",
                  textDecoration: "none",
                  WebkitTapHighlightColor: "transparent",
                  "&:hover": {
                    backgroundColor:
                      "oklch(from var(--color-field-ink) l c h / 0.05)",
                  },
                  "&:active": {
                    backgroundColor:
                      "oklch(from var(--color-field-ink) l c h / 0.08)",
                  },
                },
              }}
            >
              <RowLeading
                mark={presetFlag}
                districtNumber={districtNumber}
              />
              <Box style={{ minWidth: 0, flex: 1 }}>
                <Text
                  fw={510}
                  size="sm"
                  c="var(--color-field-ink)"
                  style={{
                    lineHeight: 1.25,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {row.preset.name}
                </Text>
                <Text
                  size="xs"
                  c="var(--color-field-ink-muted)"
                  mt={3}
                  style={{
                    lineHeight: 1.3,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {meta}
                </Text>
              </Box>
            </UnstyledButton>
            <Box
              style={{
                display: "flex",
                alignItems: "center",
                paddingInlineEnd: 8,
                flexShrink: 0,
              }}
            >
              <PresetFavouriteButton presetId={row.preset.id} chrome="ios" />
            </Box>
          </Box>
        );
      })}
    </>
  );
}

function collectAllGroupIds(
  nodes: readonly BundledPresetTreeNode[],
  out: string[] = [],
): string[] {
  for (const node of nodes) {
    if (node.kind !== "group") {
      continue;
    }
    out.push(node.id);
    collectAllGroupIds(node.children, out);
  }
  return out;
}

/** One frosted card per continent; nested rows sit in a deeper well. */
export function BundledPresetTreeIos({
  presets,
}: {
  presets: readonly MigratedPreset[];
}) {
  const tree = useMemo(
    () => buildBundledPresetTree(BUNDLED_GAME_PRESET_DEFINITIONS),
    [],
  );
  const presetsById = useMemo(
    () => new Map(presets.map((preset) => [preset.id, preset])),
    [presets],
  );
  const [openGroupIds, setOpenGroupIds] = useState(() => new Set<string>());

  const continentGroups = useMemo(
    () =>
      tree.filter(
        (node): node is GroupNode => node.kind === "group",
      ),
    [tree],
  );

  const allGroupIds = useMemo(() => collectAllGroupIds(tree), [tree]);

  const allExpanded =
    allGroupIds.length > 0 &&
    allGroupIds.every((groupId) => openGroupIds.has(groupId));

  const toggleGroup = (groupId: string) => {
    setOpenGroupIds((current) => {
      const next = new Set(current);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  const toggleExpandAll = () => {
    setOpenGroupIds(allExpanded ? new Set() : new Set(allGroupIds));
  };

  if (continentGroups.length === 0) {
    return null;
  }

  return (
    <Stack gap={10}>
      <UnstyledButton
        type="button"
        onClick={toggleExpandAll}
        aria-pressed={allExpanded}
        styles={{
          root: {
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            width: "100%",
            minHeight: 36,
            paddingInline: 12,
            borderRadius: 10,
            border:
              "0.33px solid oklch(from var(--color-field-ink) l c h / 0.14)",
            backgroundColor:
              "oklch(from var(--color-field-ink) l c h / 0.06)",
            color: "var(--color-field-ink)",
            fontSize: "0.8125rem",
            fontWeight: 590,
            letterSpacing: "-0.01em",
            WebkitTapHighlightColor: "transparent",
            "&:hover": {
              backgroundColor:
                "oklch(from var(--color-field-ink) l c h / 0.09)",
            },
            "&:active": {
              backgroundColor:
                "oklch(from var(--color-field-ink) l c h / 0.12)",
            },
          },
        }}
      >
        <Box
          component="svg"
          width={12}
          height={12}
          viewBox="0 0 12 12"
          aria-hidden
          style={{
            flexShrink: 0,
            color: "var(--color-field-ink-muted)",
            transform: allExpanded ? "rotate(90deg)" : "rotate(0deg)",
            transition: "transform 160ms ease",
          }}
        >
          <path
            d="M4.25 2.25 L8.25 6 L4.25 9.75"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Box>
        {allExpanded ? "Collapse all" : "Expand all"}
      </UnstyledButton>
      {continentGroups.map((continent) => {
        const rows: VisibleRow[] = [];
        collectVisibleRows(
          [continent],
          openGroupIds,
          presetsById,
          0,
          rows,
        );
        return (
          <IosInsetGroup key={continent.id}>
            <TreeRows rows={rows} onToggleGroup={toggleGroup} />
          </IosInsetGroup>
        );
      })}
    </Stack>
  );
}
