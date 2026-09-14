import {
  ActionIcon,
  Box,
  Button,
  Drawer,
  Group,
  SegmentedControl,
  Stack,
  Text,
  TextInput,
  UnstyledButton,
} from "@mantine/core";
import {
  ArrowsClockwise,
  CaretDown,
  CaretRight,
  Check,
  CircleNotch,
  Crown,
  MagnifyingGlass,
  Trophy,
  UserPlus,
  X,
} from "@phosphor-icons/react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  IosErrorCallout,
  IosInsetGroup,
  IosSectionLabel,
  IosSuccessCallout,
} from "@/components/ui/apple/iosEntryChrome";
import { iosFilledStyles } from "@/components/ui/apple/iosEntryStyles";
import { IosInsetHairline } from "@/components/ui/apple/IosInsetRow";
import {
  formatLeaderboardValue,
  LEADERBOARD_METRICS,
  LEADERBOARD_ROLES,
  LEADERBOARD_SCOPES,
  leaderboardEntryLabel,
  leaderboardMetricLabel,
  leaderboardScopeLabel,
  type LeaderboardEntry,
  type LeaderboardMetric,
  type LeaderboardScope,
} from "@/domain/game/leaderboard";
import {
  loadLeaderboardBoardPrefs,
  saveLeaderboardBoardPrefs,
  type LeaderboardBoardSelection,
} from "@/domain/game/leaderboardBoardPrefs";
import {
  leaderboardBoardSummaryLabel,
  resolveSelfFooterMode,
  splitLeadPack,
} from "@/domain/game/leaderboardView";
import { GAME_SIZE_OPTIONS, gameSizeLabel } from "@/domain/session/size/gameSize";
import { playerRoleLabel } from "@/domain/session/players/playerRole";
import { usePermanentAuthUser } from "@/hooks/billing/usePermanentAuthUser";
import { useLeaderboardSelfEntry } from "@/hooks/leaderboard/useLeaderboardSelfEntry";
import { useRowInView } from "@/hooks/leaderboard/useRowInView";
import { useUserProfile } from "@/hooks/profile/useUserProfile";
import { isFirebaseConfigured } from "@/services/core/firebase/firebase";
import { subscribeLeaderboardBoard } from "@/services/firestore/firestoreLeaderboard";
import {
  getLeaderboardPlayerSheetProfile,
  isLeaderboardMockEnabled,
  LEADERBOARD_MOCK_SELF_UID,
  subscribeMockLeaderboardBoard,
} from "@/services/profile/leaderboardMock";

const segmentedStyles = {
  root: {
    backgroundColor: "oklch(from var(--color-field-ink) l c h / 0.08)",
    border: "0.33px solid oklch(from var(--color-field-ink) l c h / 0.12)",
    borderRadius: 12,
    padding: 2,
  },
  label: {
    color: "var(--color-field-ink)",
    fontWeight: 510,
    fontSize: "0.8125rem",
    paddingInline: 8,
  },
  indicator: {
    backgroundColor: "oklch(from var(--color-field-ink) l c h / 0.16)",
    borderRadius: 10,
  },
} as const;

const insetInputStyles = {
  input: {
    border: "none",
    background: "transparent",
    minHeight: "3.25rem",
    color: "var(--color-field-ink)",
    fontSize: "1.0625rem",
    fontWeight: 400,
    letterSpacing: "-0.01em",
    paddingInlineStart: "0.85rem",
    paddingInlineEnd: "0.75rem",
  },
} as const;

const MONOGRAM_HUES = [48, 145, 250, 200, 25, 175] as const;

function monogramTone(username: string): string {
  let hash = 0;
  for (let i = 0; i < username.length; i += 1) {
    hash = (hash + username.charCodeAt(i) * 17) % MONOGRAM_HUES.length;
  }
  const hue = MONOGRAM_HUES[hash] ?? 250;
  return `oklch(0.52 0.11 ${hue})`;
}

function monogramInitials(username: string): string {
  const cleaned = username.replace(/[^a-zA-Z0-9]/g, "");
  if (cleaned.length >= 2) {
    return cleaned.slice(0, 2).toUpperCase();
  }
  if (cleaned.length === 1) {
    return cleaned.toUpperCase();
  }
  return "?";
}

function PlayerMonogram({
  username,
  size = 36,
}: {
  username: string;
  size?: number;
}) {
  return (
    <Box
      aria-hidden
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.28,
        backgroundColor: monogramTone(username),
        color: "white",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: size * 0.32,
        fontWeight: 700,
        letterSpacing: "0.02em",
        flexShrink: 0,
      }}
    >
      {monogramInitials(username)}
    </Box>
  );
}

function IosEmptyInset({
  icon,
  children,
}: {
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <IosInsetGroup>
      <Stack gap={8} align="center" px="md" py="xl">
        <Box
          c="var(--color-field-ink-muted)"
          style={{ display: "inline-flex", opacity: 0.85 }}
          aria-hidden
        >
          {icon}
        </Box>
        <Text
          role="note"
          ta="center"
          size="sm"
          c="var(--color-field-ink-muted)"
          style={{ lineHeight: 1.4, textWrap: "pretty", maxWidth: "16rem" }}
        >
          {children}
        </Text>
      </Stack>
    </IosInsetGroup>
  );
}

function pullScrollTop(event: ReactPointerEvent<HTMLDivElement>): number {
  const scrollRoot = event.currentTarget.closest(
    "[data-jl-scroll], .jl-scroll",
  ) as HTMLElement | null;
  if (scrollRoot) {
    return scrollRoot.scrollTop;
  }
  return window.scrollY || document.documentElement.scrollTop || 0;
}

function PullToRefresh({
  refreshing,
  onRefresh,
  children,
}: {
  refreshing: boolean;
  onRefresh: () => void;
  children: ReactNode;
}) {
  const startY = useRef(0);
  const [pull, setPull] = useState(0);
  const [isPulling, setIsPulling] = useState(false);

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (pullScrollTop(event) > 0 || refreshing) {
      return;
    }
    startY.current = event.clientY;
    setIsPulling(true);
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!isPulling) {
      return;
    }
    const dy = event.clientY - startY.current;
    if (dy <= 0) {
      setPull(0);
      return;
    }
    setPull(Math.min(112, dy * 0.32));
  };

  const onPointerUp = () => {
    if (!isPulling) {
      return;
    }
    setIsPulling(false);
    if (pull >= 84) {
      onRefresh();
    }
    setPull(0);
  };

  return (
    <Box
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      style={{ touchAction: "pan-y", position: "relative" }}
    >
      <Group
        justify="center"
        gap={8}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 36,
          opacity: pull || refreshing ? 1 : 0,
          transform: `translateY(${Math.max(0, pull * 0.2 - 8)}px)`,
          transition: isPulling ? "none" : "opacity 160ms ease, transform 160ms ease",
          pointerEvents: "none",
          color: "var(--color-field-ink-muted)",
        }}
      >
        <ArrowsClockwise size={16} weight="bold" />
        <Text size="xs" fw={590}>
          {refreshing
            ? "Refreshing…"
            : pull >= 84
              ? "Release to refresh"
              : "Pull to refresh"}
        </Text>
      </Group>
      <Box
        style={{
          transform: `translateY(${refreshing ? 40 : Math.max(0, pull * 0.35)}px)`,
          transition: isPulling ? "none" : "transform 160ms ease",
        }}
      >
        {children}
      </Box>
    </Box>
  );
}

function BoardFilterCard({
  selection,
  expanded,
  onOpen,
}: {
  selection: LeaderboardBoardSelection;
  expanded: boolean;
  onOpen: () => void;
}) {
  const facets = [
    {
      label: "Size",
      value: gameSizeLabel(selection.gameSize).label,
    },
    {
      label: "Role",
      value: playerRoleLabel(selection.role),
    },
    {
      label: "Metric",
      value: leaderboardMetricLabel(selection.metric, selection.role),
    },
  ] as const;

  return (
    <UnstyledButton
      type="button"
      onClick={onOpen}
      aria-haspopup="dialog"
      aria-expanded={expanded}
      aria-label={`Board: ${leaderboardBoardSummaryLabel(selection)}. Choose board`}
      styles={{
        root: {
          display: "block",
          width: "100%",
          borderRadius: 14,
          padding: "0.85rem 1rem 1rem",
          backgroundColor: "oklch(from var(--color-field-ink) l c h / 0.08)",
          border: "0.33px solid oklch(from var(--color-field-ink) l c h / 0.12)",
          color: "var(--color-field-ink)",
          textAlign: "left",
          "&:active": { opacity: 0.88 },
        },
      }}
    >
      <Group justify="space-between" align="center" mb={12} wrap="nowrap">
        <Text
          size="xs"
          fw={590}
          c="var(--color-field-ink-muted)"
          style={{ letterSpacing: "0.06em", textTransform: "uppercase" }}
        >
          Current board
        </Text>
        <Group gap={4} c="var(--color-flag)" wrap="nowrap">
          <Text size="sm" fw={590}>
            Edit
          </Text>
          <CaretDown size={14} weight="bold" />
        </Group>
      </Group>

      <Group gap={8} align="stretch" wrap="nowrap">
        {facets.map((facet, index) => (
          <Box
            key={facet.label}
            style={{
              flex: index === 2 ? 1.35 : 1,
              minWidth: 0,
              paddingInline: index === 0 ? 0 : 8,
              borderInlineStart:
                index === 0
                  ? undefined
                  : "0.33px solid oklch(from var(--color-field-ink) l c h / 0.14)",
            }}
          >
            <Text
              size="xs"
              c="var(--color-field-ink-muted)"
              mb={4}
              style={{ letterSpacing: "0.02em" }}
            >
              {facet.label}
            </Text>
            <Text
              fw={600}
              style={{
                fontSize: "0.9375rem",
                letterSpacing: "-0.015em",
                lineHeight: 1.25,
                overflow: "hidden",
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
              }}
            >
              {facet.value}
            </Text>
          </Box>
        ))}
      </Group>
    </UnstyledButton>
  );
}

function podiumPlinthHeight(rank: number): number {
  if (rank === 1) return 76;
  if (rank === 2) return 56;
  return 44;
}

function podiumAccent(rank: number): { fill: string; ink: string } {
  if (rank === 1) {
    return {
      fill: "oklch(from var(--color-flag) l c h / 0.28)",
      ink: "var(--color-flag)",
    };
  }
  if (rank === 2) {
    return {
      fill: "oklch(from var(--color-signal) l c h / 0.22)",
      ink: "var(--color-signal)",
    };
  }
  return {
    fill: "oklch(from var(--color-rule) l c h / 0.55)",
    ink: "var(--color-field-ink-muted)",
  };
}

function LeaderboardPodium({
  entries,
  metric,
  viewerUid,
  focusedUid,
  viewerRowRef,
  registerRowRef,
  onOpen,
}: {
  entries: LeaderboardEntry[];
  metric: LeaderboardMetric;
  viewerUid: string | null;
  focusedUid: string | null;
  viewerRowRef: MutableRefObject<HTMLElement | null>;
  registerRowRef: (uid: string, node: HTMLElement | null) => void;
  onOpen: (uid: string) => void;
}) {
  if (entries.length === 0) {
    return null;
  }

  const byRank = new Map(entries.map((entry) => [entry.rank, entry]));
  const first = byRank.get(1) ?? entries[0]!;
  const second = byRank.get(2) ?? null;
  const third = byRank.get(3) ?? null;

  const visualOrder: LeaderboardEntry[] =
    second && third
      ? [second, first, third]
      : [first, second, third].filter(
          (entry): entry is LeaderboardEntry => entry != null,
        );

  return (
    <Box
      data-testid="leaderboard-podium"
      px="xs"
      pt="sm"
      pb="md"
      style={{
        borderRadius: 16,
        backgroundColor: "oklch(from var(--color-field-ink) l c h / 0.06)",
        border: "0.33px solid oklch(from var(--color-field-ink) l c h / 0.12)",
      }}
    >
      <Group
        align="flex-end"
        justify="center"
        gap={10}
        wrap="nowrap"
        px={4}
        style={{ minHeight: 210 }}
      >
        {visualOrder.map((entry) => {
          const label = leaderboardEntryLabel(entry);
          const isYou = viewerUid != null && entry.uid === viewerUid;
          const highlighted = focusedUid === entry.uid;
          const accent = podiumAccent(entry.rank);
          const monoSize = entry.rank === 1 ? 52 : 42;
          return (
            <Box
              key={entry.uid}
              ref={(node) => {
                registerRowRef(entry.uid, node);
                if (isYou) {
                  viewerRowRef.current = node;
                }
              }}
              style={{
                flex: entry.rank === 1 ? "1.15 1 0" : "1 1 0",
                minWidth: 0,
                borderRadius: 12,
                boxShadow: highlighted
                  ? "0 0 0 2px oklch(from var(--color-signal) l c h / 0.75)"
                  : undefined,
                transition: "box-shadow 180ms ease",
              }}
            >
              <UnstyledButton
                type="button"
                onClick={() => onOpen(entry.uid)}
                data-testid={`leaderboard-podium-${entry.rank}`}
                data-highlighted={highlighted ? "true" : undefined}
                styles={{
                  root: {
                    width: "100%",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 8,
                    color: "var(--color-field-ink)",
                    paddingBlock: 4,
                    backgroundColor: highlighted
                      ? "oklch(from var(--color-signal) l c h / 0.14)"
                      : "transparent",
                    borderRadius: 12,
                    "&:active": { opacity: 0.82 },
                  },
                }}
              >
                <Stack gap={6} align="center" style={{ width: "100%" }}>
                  {entry.rank === 1 ? (
                    <Box c="var(--color-flag)" style={{ lineHeight: 0 }}>
                      <Crown size={18} weight="fill" aria-hidden />
                    </Box>
                  ) : (
                    <Box h={18} aria-hidden />
                  )}
                  <PlayerMonogram username={label} size={monoSize} />
                  {isYou ? (
                    <Text
                      size="xs"
                      fw={700}
                      c="var(--color-flag)"
                      ta="center"
                      style={{
                        fontSize: "0.625rem",
                        letterSpacing: "0.06em",
                        lineHeight: 1,
                        marginTop: 2,
                      }}
                    >
                      YOU
                    </Text>
                  ) : null}
                  <Text
                    fw={600}
                    ta="center"
                    truncate
                    maw="100%"
                    px={2}
                    style={{
                      fontSize: entry.rank === 1 ? "0.9375rem" : "0.8125rem",
                      letterSpacing: "-0.015em",
                    }}
                  >
                    {label}
                  </Text>
                  <Text
                    size="xs"
                    c="var(--color-field-ink-muted)"
                    style={{ fontVariantNumeric: "tabular-nums" }}
                  >
                    {formatLeaderboardValue(metric, entry.value)}
                  </Text>
                </Stack>

                <Box
                  style={{
                    width: "100%",
                    height: podiumPlinthHeight(entry.rank),
                    borderTopLeftRadius: 10,
                    borderTopRightRadius: 10,
                    backgroundColor: accent.fill,
                    border: `0.33px solid color-mix(in oklch, ${accent.ink} 45%, transparent)`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text
                    fw={700}
                    style={{
                      fontSize: entry.rank === 1 ? "1.35rem" : "1.125rem",
                      color: accent.ink,
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {entry.rank}
                  </Text>
                </Box>
              </UnstyledButton>
            </Box>
          );
        })}
      </Group>
    </Box>
  );
}

function fullWidthDrawerStyles(maxHeight = "min(70dvh, 34rem)") {
  return {
    inner: {
      width: "100%",
      maxWidth: "100%",
      padding: 0,
    },
    content: {
      flex: "0 0 100%",
      width: "100%",
      maxWidth: "100%",
      height: "auto",
      maxHeight,
      backgroundColor: "var(--color-canvas)",
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      borderTop: "0.33px solid oklch(from var(--color-field-ink) l c h / 0.14)",
      overflow: "auto" as const,
    },
    body: {
      width: "100%",
      paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))",
    },
  };
}

function BoardOptionTile({
  selected,
  label,
  detail,
  onClick,
  flex = 1,
}: {
  selected: boolean;
  label: string;
  detail?: string;
  onClick: () => void;
  flex?: number;
}) {
  return (
    <UnstyledButton
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      styles={{
        root: {
          flex,
          minWidth: 0,
          minHeight: detail ? "4.25rem" : "2.875rem",
          padding: "0.7rem 0.75rem",
          borderRadius: 12,
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "center",
          gap: 4,
          backgroundColor: selected
            ? "oklch(from var(--color-flag) l c h / 0.22)"
            : "oklch(from var(--color-field-ink) l c h / 0.06)",
          border: selected
            ? "0.33px solid oklch(from var(--color-flag) l c h / 0.55)"
            : "0.33px solid oklch(from var(--color-field-ink) l c h / 0.12)",
          color: "var(--color-field-ink)",
          textAlign: "left",
          transition:
            "background-color 140ms ease, border-color 140ms ease, transform 80ms ease",
          "&:active": {
            transform: "scale(0.985)",
            opacity: 0.92,
          },
        },
      }}
    >
      <Text
        fw={600}
        style={{
          fontSize: "0.9375rem",
          letterSpacing: "-0.015em",
          color: selected ? "var(--color-flag)" : "var(--color-field-ink)",
        }}
      >
        {label}
      </Text>
      {detail ? (
        <Text
          size="xs"
          c="var(--color-field-ink-muted)"
          style={{ lineHeight: 1.3, textWrap: "pretty" }}
        >
          {detail}
        </Text>
      ) : null}
    </UnstyledButton>
  );
}

function BoardPickerDrawer({
  open,
  onClose,
  selection,
  onChange,
}: {
  open: boolean;
  onClose: () => void;
  selection: LeaderboardBoardSelection;
  onChange: (next: LeaderboardBoardSelection) => void;
}) {
  if (!open) {
    return null;
  }

  const summary = leaderboardBoardSummaryLabel(selection);

  return (
    <Drawer
      opened
      onClose={onClose}
      position="bottom"
      size="auto"
      padding="md"
      radius={24}
      title={null}
      withCloseButton={false}
      overlayProps={{ backgroundOpacity: 0.4, blur: 3 }}
      styles={fullWidthDrawerStyles("min(78dvh, 40rem)")}
    >
      <Stack gap="lg">
        <Box
          aria-hidden
          mx="auto"
          style={{
            width: 36,
            height: 5,
            borderRadius: 999,
            backgroundColor: "oklch(from var(--color-field-ink) l c h / 0.28)",
          }}
        />

        <Stack gap={6} align="center">
          <Text
            fw={600}
            ta="center"
            c="var(--color-field-ink)"
            style={{ fontSize: "1.25rem", letterSpacing: "-0.02em" }}
          >
            Choose board
          </Text>
          <Text
            size="sm"
            ta="center"
            c="var(--color-field-ink-muted)"
            px="sm"
            style={{ lineHeight: 1.35, textWrap: "pretty" }}
          >
            {summary}
          </Text>
        </Stack>

        <Stack gap={10}>
          <IosSectionLabel>Game size</IosSectionLabel>
          <Group
            gap={8}
            align="stretch"
            wrap="nowrap"
            role="group"
            aria-label="Game size"
          >
            {GAME_SIZE_OPTIONS.map((value) => {
              const meta = gameSizeLabel(value);
              return (
                <BoardOptionTile
                  key={value}
                  selected={selection.gameSize === value}
                  label={meta.label}
                  detail={meta.summary.split(",")[0] ?? meta.summary}
                  onClick={() => onChange({ ...selection, gameSize: value })}
                />
              );
            })}
          </Group>
        </Stack>

        <Stack gap={10}>
          <IosSectionLabel>Role</IosSectionLabel>
          <Group
            gap={8}
            align="stretch"
            wrap="nowrap"
            role="group"
            aria-label="Player role"
          >
            {LEADERBOARD_ROLES.map((value) => (
              <BoardOptionTile
                key={value}
                selected={selection.role === value}
                label={playerRoleLabel(value)}
                onClick={() => onChange({ ...selection, role: value })}
              />
            ))}
          </Group>
        </Stack>

        <Stack gap={10}>
          <IosSectionLabel>Metric</IosSectionLabel>
          <IosInsetGroup>
            <Box role="listbox" aria-label="Leaderboard metric">
              {LEADERBOARD_METRICS.map((value, index) => {
                const selected = selection.metric === value;
                const label = leaderboardMetricLabel(value, selection.role);
                return (
                  <Box key={value}>
                    <UnstyledButton
                      type="button"
                      role="option"
                      aria-selected={selected}
                      onClick={() => onChange({ ...selection, metric: value })}
                      styles={{
                        root: {
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                          width: "100%",
                          minHeight: "3.125rem",
                          paddingInline: "1rem",
                          paddingBlock: "0.7rem",
                          color: "var(--color-field-ink)",
                          backgroundColor: selected
                            ? "oklch(from var(--color-flag) l c h / 0.12)"
                            : "transparent",
                          textAlign: "left",
                          "&:active": { opacity: 0.85 },
                        },
                      }}
                    >
                      <Text
                        fw={selected ? 600 : 400}
                        style={{
                          flex: 1,
                          fontSize: "1.0625rem",
                          letterSpacing: "-0.01em",
                          color: selected
                            ? "var(--color-flag)"
                            : "var(--color-field-ink)",
                        }}
                      >
                        {label}
                      </Text>
                      {selected ? (
                        <Box
                          c="var(--color-flag)"
                          style={{ display: "inline-flex", lineHeight: 0 }}
                          aria-hidden
                        >
                          <Check size={18} weight="bold" />
                        </Box>
                      ) : (
                        <Box w={18} aria-hidden />
                      )}
                    </UnstyledButton>
                    {index < LEADERBOARD_METRICS.length - 1 ? (
                      <IosInsetHairline insetStart="1rem" />
                    ) : null}
                  </Box>
                );
              })}
            </Box>
          </IosInsetGroup>
        </Stack>

        <Button fullWidth onClick={onClose} styles={iosFilledStyles}>
          Done
        </Button>
      </Stack>
    </Drawer>
  );
}

function PlayerDetailDrawer({
  entry,
  metric,
  isYou,
  onClose,
  onAddFriend,
  onOpenFriends,
}: {
  entry: LeaderboardEntry;
  metric: LeaderboardMetric;
  isYou: boolean;
  onClose: () => void;
  onAddFriend: () => void;
  onOpenFriends: () => void;
}) {
  const profile = getLeaderboardPlayerSheetProfile(entry.uid);
  const label = leaderboardEntryLabel(entry);
  const cells: { label: string; value: string }[] = [
    { label: "Rank", value: `#${entry.rank}` },
    { label: "Score", value: formatLeaderboardValue(metric, entry.value) },
  ];
  if (profile.wins != null) {
    cells.push({ label: "Wins", value: String(profile.wins) });
  } else if (profile.gamesPlayed != null) {
    cells.push({ label: "Games", value: String(profile.gamesPlayed) });
  }

  return (
    <Drawer
      opened
      onClose={onClose}
      position="bottom"
      size="auto"
      padding="md"
      radius={24}
      title={null}
      withCloseButton={false}
      overlayProps={{ backgroundOpacity: 0.4, blur: 3 }}
      styles={fullWidthDrawerStyles()}
    >
      <Stack gap="md">
        <Box
          aria-hidden
          mx="auto"
          style={{
            width: 36,
            height: 5,
            borderRadius: 999,
            backgroundColor: "oklch(from var(--color-field-ink) l c h / 0.28)",
          }}
        />
        <Stack gap={8} align="center">
          <PlayerMonogram username={label} size={56} />
          <Text
            fw={600}
            c="var(--color-field-ink)"
            style={{ fontSize: "1.25rem", letterSpacing: "-0.02em" }}
          >
            {label}
          </Text>
          <Text
            component="span"
            size="xs"
            fw={590}
            px={10}
            py={4}
            style={{
              borderRadius: 999,
              backgroundColor: "oklch(from var(--color-field-ink) l c h / 0.1)",
              color: "var(--color-field-ink)",
            }}
          >
            {isYou ? "You" : "Player"}
          </Text>
          {profile.lastPlayedLabel ? (
            <Text size="sm" c="var(--color-field-ink-muted)">
              Last played · {profile.lastPlayedLabel}
            </Text>
          ) : null}
        </Stack>

        <Group
          gap={0}
          wrap="nowrap"
          justify="space-evenly"
          px="sm"
          py="sm"
          style={{
            borderRadius: 12,
            backgroundColor: "oklch(from var(--color-field-ink) l c h / 0.08)",
            border:
              "0.33px solid oklch(from var(--color-field-ink) l c h / 0.12)",
          }}
        >
          {cells.map((cell, index) => (
            <Stack
              key={cell.label}
              gap={2}
              align="center"
              style={{
                flex: 1,
                borderInlineStart:
                  index === 0
                    ? undefined
                    : "0.33px solid oklch(from var(--color-field-ink) l c h / 0.12)",
              }}
            >
              <Text
                fw={600}
                c="var(--color-field-ink)"
                style={{ fontSize: "1.0625rem", letterSpacing: "-0.02em" }}
              >
                {cell.value}
              </Text>
              <Text size="xs" c="var(--color-field-ink-muted)">
                {cell.label}
              </Text>
            </Stack>
          ))}
        </Group>

        <Stack gap={10}>
          {!isYou ? (
            <Button
              fullWidth
              leftSection={<UserPlus size={18} weight="bold" />}
              onClick={onAddFriend}
              styles={iosFilledStyles}
            >
              Add friend
            </Button>
          ) : (
            <Text size="sm" c="var(--color-field-ink-muted)" ta="center">
              This is your standing on the current board.
            </Text>
          )}
          <IosInsetGroup>
            <UnstyledButton
              type="button"
              onClick={onOpenFriends}
              styles={{
                root: {
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  width: "100%",
                  minHeight: "2.875rem",
                  paddingInline: "1rem",
                  paddingBlock: "0.625rem",
                  color: "var(--color-field-ink)",
                  fontWeight: 400,
                  fontSize: "1.0625rem",
                },
              }}
            >
              <Box c="var(--color-flag)" style={{ display: "inline-flex" }}>
                <Trophy size={22} weight="regular" />
              </Box>
              <Text style={{ flex: 1 }}>Open friends</Text>
              <CaretRight size={16} weight="bold" />
            </UnstyledButton>
          </IosInsetGroup>
        </Stack>

        <UnstyledButton
          type="button"
          onClick={onClose}
          styles={{
            root: {
              textAlign: "center",
              color: "var(--color-flag)",
              fontWeight: 590,
              minHeight: 44,
            },
          }}
        >
          Done
        </UnstyledButton>
      </Stack>
    </Drawer>
  );
}

function RankRow({
  entry,
  metric,
  isYou,
  highlighted,
  showDivider,
  rowRef,
  onOpen,
}: {
  entry: LeaderboardEntry;
  metric: LeaderboardMetric;
  isYou: boolean;
  highlighted?: boolean;
  showDivider: boolean;
  rowRef?: (node: HTMLElement | null) => void;
  onOpen: () => void;
}) {
  const label = leaderboardEntryLabel(entry);
  return (
    <Box component="li" ref={rowRef} data-testid={`leaderboard-row-${entry.uid}`}>
      <UnstyledButton
        type="button"
        onClick={onOpen}
        data-highlighted={highlighted ? "true" : undefined}
        styles={{
          root: {
            display: "flex",
            alignItems: "center",
            gap: 12,
            width: "100%",
            minHeight: "3.25rem",
            paddingInline: "1rem",
            paddingBlock: "0.7rem",
            backgroundColor: highlighted
              ? "oklch(from var(--color-signal) l c h / 0.22)"
              : isYou
                ? "oklch(from var(--color-flag) l c h / 0.12)"
                : "transparent",
            boxShadow: highlighted
              ? "inset 0 0 0 1.5px oklch(from var(--color-signal) l c h / 0.65)"
              : undefined,
            color: "var(--color-field-ink)",
            textAlign: "left",
            transition: "background-color 180ms ease, box-shadow 180ms ease",
            "&:active": { opacity: 0.78 },
          },
        }}
      >
        <Text
          fw={700}
          w={36}
          ta="center"
          style={{
            fontVariantNumeric: "tabular-nums",
            color:
              entry.rank <= 3
                ? "var(--color-flag)"
                : "var(--color-field-ink-muted)",
          }}
        >
          {entry.rank}
        </Text>
        <PlayerMonogram username={label} size={34} />
        <Box style={{ flex: 1, minWidth: 0 }}>
          <Group gap={6} wrap="nowrap">
            <Text
              fw={590}
              truncate
              style={{ letterSpacing: "-0.01em", fontSize: "1.0625rem" }}
            >
              {label}
            </Text>
            {isYou ? (
              <Text size="xs" fw={700} c="var(--color-flag)">
                YOU
              </Text>
            ) : null}
          </Group>
        </Box>
        <Text
          fw={590}
          style={{ fontVariantNumeric: "tabular-nums", fontSize: "0.9375rem" }}
        >
          {formatLeaderboardValue(metric, entry.value)}
        </Text>
        <Box c="var(--color-field-ink-muted)" style={{ display: "inline-flex" }}>
          <CaretRight size={14} weight="bold" />
        </Box>
      </UnstyledButton>
      {showDivider ? <IosInsetHairline insetStart="5.5rem" /> : null}
    </Box>
  );
}

const EMPTY_BOARD_MESSAGE =
  "No ranked entries yet. Finish synced rounds with leaderboard opt-in to populate this board.";

/** Join/Friends-style iOS body for the Mantine Leaderboard route. */
export function LeaderboardIosBody() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const mockEnabled = isLeaderboardMockEnabled();
  const { user, isPermanent } = usePermanentAuthUser();
  const viewerUid = mockEnabled
    ? LEADERBOARD_MOCK_SELF_UID
    : (user?.uid ?? null);

  const [selection, setSelection] = useState(loadLeaderboardBoardPrefs);
  const [boardSheetOpen, setBoardSheetOpen] = useState(false);
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [boardLoading, setBoardLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [boardError, setBoardError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [focusedUid, setFocusedUid] = useState<string | null>(null);
  const [searchNote, setSearchNote] = useState<string | null>(null);
  const [selectedUid, setSelectedUid] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const viewerRowRef = useRef<HTMLElement | null>(null);
  const rowRefs = useRef(new Map<string, HTMLElement>());
  const { profile, ready: profileReady, error: profileError } = useUserProfile(
    user?.uid,
    !mockEnabled && isFirebaseConfigured() && isPermanent,
  );
  const listEntry =
    viewerUid != null
      ? (entries.find((entry) => entry.uid === viewerUid) ?? null)
      : null;
  const {
    entry: selfEntry,
    error: selfError,
    loading: selfLoading,
  } = useLeaderboardSelfEntry(
    selection,
    viewerUid,
    mockEnabled || (!boardLoading && listEntry != null),
  );
  const rowInView = useRowInView(viewerRowRef, listEntry?.uid ?? null);
  const needsOptIn = !mockEnabled && profile != null && !profile.leaderboardOptIn;

  const registerRowRef = useCallback((uid: string, node: HTMLElement | null) => {
    if (node) {
      rowRefs.current.set(uid, node);
      return;
    }
    rowRefs.current.delete(uid);
  }, []);

  useEffect(() => {
    saveLeaderboardBoardPrefs(selection);
  }, [selection]);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- board subscription resets */
    setBoardLoading(true);
    setBoardError(null);
    /* eslint-enable react-hooks/set-state-in-effect */

    if (mockEnabled) {
      return subscribeMockLeaderboardBoard(
        selection.scope,
        selection.gameSize,
        selection.role,
        selection.metric,
        (next) => {
          setEntries(next);
          setBoardLoading(false);
          setRefreshing(false);
        },
        (error) => {
          setBoardLoading(false);
          setRefreshing(false);
          setBoardError(error.message);
        },
      );
    }

    if (!isFirebaseConfigured()) {
      setEntries([]);
      setBoardLoading(false);
      setRefreshing(false);
      return;
    }

    return subscribeLeaderboardBoard(
      selection.scope,
      selection.gameSize,
      selection.role,
      selection.metric,
      (next) => {
        setEntries(next);
        setBoardLoading(false);
        setRefreshing(false);
      },
      (error) => {
        setBoardLoading(false);
        setRefreshing(false);
        setBoardError(error.message);
      },
    );
  }, [
    mockEnabled,
    selection.scope,
    selection.gameSize,
    selection.role,
    selection.metric,
    reloadToken,
  ]);

  useEffect(() => {
    if (!successMessage) {
      return;
    }
    const timer = window.setTimeout(() => setSuccessMessage(null), 2500);
    return () => window.clearTimeout(timer);
  }, [successMessage]);

  const userParam = searchParams.get("user");
  useEffect(() => {
    if (!userParam || boardLoading || entries.length === 0) {
      return;
    }
    const match = entries.find(
      (entry) =>
        entry.displayName.toLowerCase() === userParam.toLowerCase() ||
        entry.uid === userParam,
    );
    if (!match) {
      return;
    }
    /* eslint-disable react-hooks/set-state-in-effect -- deep-link opens player sheet once */
    setSelectedUid(match.uid);
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete("user");
        return next;
      },
      { replace: true },
    );
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [userParam, boardLoading, entries, setSearchParams]);

  const searchActive = query.trim().length > 0;
  const searchMatches = useMemo(() => {
    if (!searchActive) {
      return [];
    }
    const needle = query.trim().toLowerCase();
    return entries.filter((entry) =>
      leaderboardEntryLabel(entry).toLowerCase().includes(needle),
    );
  }, [entries, query, searchActive]);

  const { lead, rest } = splitLeadPack(entries);
  const selectedEntry =
    selectedUid == null
      ? null
      : (entries.find((entry) => entry.uid === selectedUid) ?? null);

  const jumpToMatch = useCallback(
    (cycle: boolean) => {
      const needle = query.trim();
      if (needle.length < 1) {
        setSearchNote("Enter a username to jump.");
        return;
      }
      if (searchMatches.length === 0) {
        setFocusedUid(null);
        setSearchNote(`No player matching "${needle}".`);
        return;
      }

      let index = 0;
      if (cycle && focusedUid != null) {
        const current = searchMatches.findIndex(
          (entry) => entry.uid === focusedUid,
        );
        index = current >= 0 ? (current + 1) % searchMatches.length : 0;
      }

      const target = searchMatches[index]!;
      setFocusedUid(target.uid);
      const label = leaderboardEntryLabel(target);
      setSearchNote(
        searchMatches.length > 1
          ? `#${target.rank} · ${label} · ${index + 1} of ${searchMatches.length}`
          : `#${target.rank} · ${label}`,
      );

      window.requestAnimationFrame(() => {
        rowRefs.current.get(target.uid)?.scrollIntoView({
          block: "center",
          behavior: "smooth",
        });
      });
    },
    [focusedUid, query, searchMatches],
  );

  const clearSearch = () => {
    setQuery("");
    setFocusedUid(null);
    setSearchNote(null);
  };

  const footerMode = resolveSelfFooterMode({
    viewerUid,
    listEntry,
    selfEntry,
    selfError,
    selfLoading,
    rowInView,
  });
  const footerEntry = listEntry ?? selfEntry;
  const footerVisible = footerMode !== "hidden";
  const footerInteractive = footerMode === "pinned";
  const footerMuted = footerMode === "unranked" || footerMode === "error";
  const footerLabel =
    footerMode === "unranked"
      ? "Not ranked on this board"
      : footerMode === "error"
        ? "Couldn't load your rank"
        : footerEntry
          ? `#${footerEntry.rank} · YOU · ${formatLeaderboardValue(selection.metric, footerEntry.value)}`
          : "YOU";

  const pullRefresh = () => {
    setRefreshing(true);
    setReloadToken((token) => token + 1);
  };

  const openFriendFlow = () => {
    setSelectedUid(null);
    setSuccessMessage("Open Friends to send a request.");
    navigate("/friends");
  };

  return (
    <PullToRefresh refreshing={refreshing} onRefresh={pullRefresh}>
      <Stack gap={18} pb={footerVisible ? 72 : 8}>
        <Stack gap={8}>
          <IosSectionLabel>Find players</IosSectionLabel>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              jumpToMatch(true);
            }}
          >
            <Group gap={8} align="stretch" wrap="nowrap">
              <Box style={{ flex: 1, minWidth: 0 }}>
                <IosInsetGroup>
                  <TextInput
                    aria-label="Search players"
                    value={query}
                    onChange={(event) => {
                      setQuery(event.currentTarget.value);
                      setSearchNote(null);
                      setFocusedUid(null);
                    }}
                    placeholder="Username"
                    autoComplete="off"
                    spellCheck={false}
                    enterKeyHint="search"
                    rightSection={
                      query ? (
                        <ActionIcon
                          type="button"
                          variant="subtle"
                          radius="xl"
                          size="sm"
                          aria-label="Clear search"
                          onClick={clearSearch}
                          styles={{
                            root: { color: "var(--color-field-ink-muted)" },
                          }}
                        >
                          <X size={14} weight="bold" />
                        </ActionIcon>
                      ) : null
                    }
                    styles={insetInputStyles}
                  />
                </IosInsetGroup>
              </Box>
              <ActionIcon
                type="submit"
                aria-label="Jump to player"
                size={52}
                radius={12}
                styles={{
                  root: {
                    flexShrink: 0,
                    width: 52,
                    height: 52,
                    minWidth: 52,
                    minHeight: 52,
                    borderRadius: 12,
                    border: "none",
                    backgroundColor: "var(--color-flag)",
                    color: "var(--color-flag-ink)",
                  },
                }}
              >
                <MagnifyingGlass size={22} weight="bold" aria-hidden />
              </ActionIcon>
            </Group>
          </form>
          {searchNote ? (
            <Text
              size="xs"
              px={4}
              c={
                focusedUid
                  ? "var(--color-field-ink-muted)"
                  : "var(--color-halt)"
              }
              role="status"
            >
              {searchNote}
            </Text>
          ) : (
            <Text size="xs" c="var(--color-field-ink-muted)" px={4}>
              Search jumps to a player on this board. Tap again for the next match.
            </Text>
          )}
        </Stack>

        <Stack gap={8}>
          <SegmentedControl
            fullWidth
            value={selection.scope}
            onChange={(scope) =>
              setSelection({
                ...selection,
                scope: scope as LeaderboardScope,
              })
            }
            data={LEADERBOARD_SCOPES.map((value) => ({
              value,
              label: leaderboardScopeLabel(value),
            }))}
            aria-label="Leaderboard scope"
            styles={segmentedStyles}
          />

          <BoardFilterCard
            selection={selection}
            expanded={boardSheetOpen}
            onOpen={() => setBoardSheetOpen(true)}
          />
        </Stack>

        <IosSuccessCallout>{successMessage}</IosSuccessCallout>
        {!profileReady && !mockEnabled ? (
          <Text size="sm" c="var(--color-field-ink-muted)" px={4}>
            Loading profile…
          </Text>
        ) : null}
        {profileError && !mockEnabled ? (
          <IosErrorCallout>
            Could not load profile for leaderboard opt-in status.
          </IosErrorCallout>
        ) : null}
        {needsOptIn ? (
          <Text size="sm" c="var(--color-field-ink-muted)" px={4}>
            Leaderboard opt-in is off for your username. You can browse boards;
            turn opt-in on to appear on global ranks.
          </Text>
        ) : null}
        {boardError ? <IosErrorCallout>{boardError}</IosErrorCallout> : null}

        {boardLoading ? (
          <IosInsetGroup>
            <Group gap={10} px="md" py="md" c="var(--color-field-ink-muted)">
              <CircleNotch
                size={18}
                weight="bold"
                className="loading-spinner"
                aria-hidden
              />
              <Text size="sm">Loading board…</Text>
            </Group>
          </IosInsetGroup>
        ) : null}

        {!boardLoading && !boardError && entries.length === 0 ? (
          <IosEmptyInset icon={<Trophy size={28} weight="regular" />}>
            {EMPTY_BOARD_MESSAGE}
          </IosEmptyInset>
        ) : null}

        {!boardLoading && !boardError && lead.length > 0 ? (
          <Stack gap={8}>
            <IosSectionLabel>Podium</IosSectionLabel>
            <LeaderboardPodium
              entries={lead}
              metric={selection.metric}
              viewerUid={viewerUid}
              focusedUid={focusedUid}
              viewerRowRef={viewerRowRef}
              registerRowRef={registerRowRef}
              onOpen={(uid) => setSelectedUid(uid)}
            />
          </Stack>
        ) : null}

        {!boardLoading && !boardError && rest.length > 0 ? (
          <Stack gap={8}>
            <IosSectionLabel>Ranks</IosSectionLabel>
            <IosInsetGroup>
              <Box component="ol" m={0} p={0} style={{ listStyle: "none" }}>
                {rest.map((entry, index) => (
                  <RankRow
                    key={entry.uid}
                    entry={entry}
                    metric={selection.metric}
                    isYou={viewerUid != null && entry.uid === viewerUid}
                    highlighted={focusedUid === entry.uid}
                    showDivider={index < rest.length - 1}
                    rowRef={(node) => {
                      registerRowRef(entry.uid, node);
                      if (viewerUid != null && entry.uid === viewerUid) {
                        viewerRowRef.current = node;
                      }
                    }}
                    onOpen={() => setSelectedUid(entry.uid)}
                  />
                ))}
              </Box>
            </IosInsetGroup>
          </Stack>
        ) : null}

        <BoardPickerDrawer
          open={boardSheetOpen}
          onClose={() => setBoardSheetOpen(false)}
          selection={selection}
          onChange={setSelection}
        />

        {selectedEntry ? (
          <PlayerDetailDrawer
            entry={selectedEntry}
            metric={selection.metric}
            isYou={viewerUid != null && selectedEntry.uid === viewerUid}
            onClose={() => setSelectedUid(null)}
            onAddFriend={openFriendFlow}
            onOpenFriends={() => {
              setSelectedUid(null);
              navigate("/friends");
            }}
          />
        ) : null}

        {footerVisible ? (
          <UnstyledButton
            type="button"
            data-testid="leaderboard-self-footer"
            disabled={!footerInteractive}
            onClick={() => {
              if (!footerInteractive) {
                return;
              }
              viewerRowRef.current?.scrollIntoView({
                block: "center",
                behavior: "smooth",
              });
            }}
            styles={{
              root: {
                position: "fixed",
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 30,
                minHeight: 52,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))",
                paddingTop: "0.75rem",
                backgroundColor:
                  "oklch(from var(--color-canvas) l c h / 0.92)",
                borderTop:
                  "0.33px solid oklch(from var(--color-field-ink) l c h / 0.14)",
                backdropFilter: "blur(20px) saturate(1.4)",
                WebkitBackdropFilter: "blur(20px) saturate(1.4)",
                color: footerMuted
                  ? "var(--color-field-ink-muted)"
                  : "var(--color-field-ink)",
                fontWeight: 590,
                fontSize: "0.9375rem",
                cursor: footerInteractive ? "pointer" : "default",
              },
            }}
          >
            {footerLabel}
          </UnstyledButton>
        ) : null}
      </Stack>
    </PullToRefresh>
  );
}
