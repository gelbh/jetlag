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
  CaretRight,
  Check,
  CircleNotch,
  GameController,
  MagnifyingGlass,
  PaperPlaneTilt,
  Trophy,
  UserMinus,
  UserPlus,
  UsersThree,
  X,
} from "@phosphor-icons/react";
import {
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { useNavigate } from "react-router-dom";
import {
  IosErrorCallout,
  IosFieldError,
  IosInsetGroup,
  IosSectionLabel,
  IosSuccessCallout,
  iosCompactFilledStyles,
  iosFilledStyles,
  iosGrayStyles,
  iosPlainStyles,
} from "@/components/ui/apple/iosEntryChrome";
import { IosInsetRow } from "@/components/ui/apple/IosInsetRow";
import { USERNAME_MAX_LENGTH } from "@/domain/game/playerProfile";
import crawlPolicy from "@/domain/seo/seoCrawlPolicy.json";
import { copyToClipboard } from "@/platform/copyToClipboard";
import {
  getFriendSheetProfile,
  getFriendsMockSessionCode,
  type FriendSheetProfile,
} from "@/services/profile/friendsMock";
import {
  buildSessionInviteUrl,
  resolveSessionInviteOrigin,
} from "@/services/session/sessionInviteUrl";
import type { FriendListEntry } from "@/services/profile/profileFriends";
import { useSessionStore } from "@/state/sessionStore";
import {
  FriendSwipeAction,
  FriendSwipeRegistry,
  FriendSwipeRow,
} from "./FriendSwipeRow";
import {
  useFriendsPanelModel,
  type FriendsListTab,
  type SelectableFriend,
} from "./useFriendsPanelModel";

const insetInputStyles = {
  input: {
    border: "none",
    background: "transparent",
    minHeight: "3.25rem",
    color: "var(--color-field-ink)",
    fontSize: "1.0625rem",
    fontWeight: 400,
    letterSpacing: "-0.01em",
    // Keep start padding for leftSection; only trim the trailing edge.
    paddingInlineEnd: "0.75rem",
  },
  section: {
    color: "var(--color-field-ink-muted)",
  },
} as const;

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

function FriendMonogram({
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
        borderRadius: 999,
        flexShrink: 0,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: monogramTone(username),
        color: "var(--color-field-ink)",
        fontSize: size > 40 ? "0.9375rem" : "0.75rem",
        fontWeight: 700,
        letterSpacing: "0.04em",
        lineHeight: 1,
      }}
    >
      {monogramInitials(username)}
    </Box>
  );
}

function InsetHairline({ insetStart = "4.25rem" }: { insetStart?: string }) {
  return (
    <Box
      aria-hidden
      style={{
        height: "0.33px",
        marginInlineStart: insetStart,
        backgroundColor: "oklch(from var(--color-field-ink) l c h / 0.14)",
      }}
    />
  );
}

function RowChevron() {
  return (
    <Box
      c="oklch(from var(--color-field-ink-muted) l c h / 0.85)"
      style={{ display: "inline-flex", flexShrink: 0 }}
      aria-hidden
    >
      <CaretRight size={16} weight="bold" />
    </Box>
  );
}

function FriendRowFace({
  username,
  subtitle,
  trailing,
  onPress,
}: {
  username: string;
  subtitle?: string;
  trailing?: ReactNode;
  onPress?: () => void;
}) {
  const identity = (
    <Group gap={12} wrap="nowrap" style={{ minWidth: 0, flex: 1, overflow: "hidden" }}>
      <FriendMonogram username={username} />
      <Box style={{ minWidth: 0, flex: 1, overflow: "hidden" }}>
        <Text
          fw={510}
          c="var(--color-field-ink)"
          style={{
            fontSize: "1.0625rem",
            lineHeight: 1.25,
            letterSpacing: "-0.01em",
          }}
          truncate
        >
          {username}
        </Text>
        {subtitle ? (
          <Text
            size="xs"
            c="var(--color-field-ink-muted)"
            style={{ lineHeight: 1.3, marginTop: 2 }}
            truncate
          >
            {subtitle}
          </Text>
        ) : null}
      </Box>
    </Group>
  );

  return (
    <Group
      justify="space-between"
      align="center"
      wrap="nowrap"
      gap="sm"
      px="md"
      py={10}
      style={{ minHeight: "3.25rem", width: "100%", minWidth: 0 }}
    >
      {onPress ? (
        <UnstyledButton
          type="button"
          onClick={onPress}
          styles={{
            root: {
              display: "flex",
              flex: 1,
              minWidth: 0,
              overflow: "hidden",
              textAlign: "left",
              borderRadius: 8,
              "&:active": {
                opacity: 0.72,
              },
            },
          }}
        >
          {identity}
        </UnstyledButton>
      ) : (
        identity
      )}
      {trailing ? (
        <Box style={{ flexShrink: 0, display: "inline-flex" }}>{trailing}</Box>
      ) : null}
    </Group>
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
  const pulling = useRef(false);

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.scrollTop > 0 || refreshing) {
      return;
    }
    startY.current = event.clientY;
    pulling.current = true;
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!pulling.current) {
      return;
    }
    const dy = event.clientY - startY.current;
    if (dy <= 0) {
      setPull(0);
      return;
    }
    // Stronger rubber-band: need a longer pull before release fires.
    setPull(Math.min(112, dy * 0.32));
  };

  const onPointerUp = () => {
    if (!pulling.current) {
      return;
    }
    pulling.current = false;
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
          transform: `translateY(${Math.max(pull - 36, refreshing ? 0 : -8)}px)`,
          transition: pulling.current
            ? "none"
            : "opacity 160ms ease, transform 160ms ease",
          color: "var(--color-field-ink-muted)",
          pointerEvents: "none",
          zIndex: 2,
        }}
        aria-hidden={!refreshing && pull === 0}
      >
        <ArrowsClockwise
          size={16}
          weight="bold"
          className={refreshing ? "loading-spinner" : undefined}
        />
        <Text size="xs" fw={590}>
          {refreshing ? "Refreshing…" : pull >= 84 ? "Release to refresh" : "Pull to refresh"}
        </Text>
      </Group>
      <Box style={{ transform: `translateY(${refreshing ? 40 : Math.max(0, pull * 0.35)}px)`, transition: pulling.current ? "none" : "transform 160ms ease" }}>
        {children}
      </Box>
    </Box>
  );
}

const iosPlainHaltStyles = {
  root: {
    ...iosPlainStyles.root,
    color: "var(--color-halt)",
    "&:hover": {
      backgroundColor: "oklch(from var(--color-halt) l c h / 0.12)",
    },
  },
} as const;

function canNativeShare(): boolean {
  return typeof navigator !== "undefined" && typeof navigator.share === "function";
}

function sheetSubtitle(
  relation: SelectableFriend["relation"],
  isSearchHit: boolean,
  profile: FriendSheetProfile,
): string | null {
  if (isSearchHit) {
    if (profile.mutualFriends != null && profile.mutualFriends > 0) {
      return `${profile.mutualFriends} mutual friend${profile.mutualFriends === 1 ? "" : "s"}`;
    }
    return null;
  }
  if (relation === "friend" && profile.lastPlayedLabel) {
    return `Last played · ${profile.lastPlayedLabel}`;
  }
  if (relation === "incoming" && profile.requestedAgoLabel) {
    return `Requested ${profile.requestedAgoLabel}`;
  }
  if (relation === "outgoing" && profile.requestedAgoLabel) {
    return `Sent ${profile.requestedAgoLabel}`;
  }
  return null;
}

function RelationPill({
  label,
}: {
  label: string;
}) {
  return (
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
        letterSpacing: "0.01em",
      }}
    >
      {label}
    </Text>
  );
}

function FriendStatsStrip({ profile }: { profile: FriendSheetProfile }) {
  const cells: { label: string; value: string }[] = [];
  if (profile.gamesTogether != null) {
    cells.push({ label: "Games", value: String(profile.gamesTogether) });
  }
  if (profile.winsTogether != null) {
    cells.push({ label: "Wins", value: String(profile.winsTogether) });
  }
  if (profile.mutualFriends != null) {
    cells.push({ label: "Mutual", value: String(profile.mutualFriends) });
  }
  if (cells.length === 0) {
    return null;
  }
  return (
    <Group
      gap={0}
      wrap="nowrap"
      justify="space-evenly"
      px="sm"
      py="sm"
      style={{
        borderRadius: 12,
        backgroundColor: "oklch(from var(--color-field-ink) l c h / 0.08)",
        border: "0.33px solid oklch(from var(--color-field-ink) l c h / 0.12)",
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
            style={{ fontSize: "1.125rem", letterSpacing: "-0.02em" }}
          >
            {cell.value}
          </Text>
          <Text size="xs" c="var(--color-field-ink-muted)">
            {cell.label}
          </Text>
        </Stack>
      ))}
    </Group>
  );
}

function FriendDetailDrawer({
  entry,
  isSearchHit,
  busy,
  inviteSessionCode,
  onClose,
  onAccept,
  onDecline,
  onCancel,
  onRequest,
  onRemove,
  onInviteCopied,
}: {
  entry: SelectableFriend;
  isSearchHit: boolean;
  busy: boolean;
  inviteSessionCode: string | null;
  onClose: () => void;
  onAccept: () => void;
  onDecline: () => void;
  onCancel: () => void;
  onRequest: () => void;
  onRemove: () => void;
  onInviteCopied: (message: string) => void;
}) {
  const navigate = useNavigate();
  const [inviting, setInviting] = useState(false);
  const [inviteNote, setInviteNote] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const isFriend = entry.relation === "friend" && !isSearchHit;
  const profile = getFriendSheetProfile(entry.uid);
  const subtitle = sheetSubtitle(entry.relation, isSearchHit, profile);
  const pillLabel = isSearchHit
    ? "Not connected"
    : entry.relation === "incoming"
      ? "Incoming"
      : entry.relation === "outgoing"
        ? "Outgoing"
        : "Friend";

  const inviteToSession = async () => {
    if (!inviteSessionCode || inviting) {
      return;
    }
    setInviting(true);
    setInviteNote(null);
    try {
      const origin = resolveSessionInviteOrigin(
        window.location.origin,
        crawlPolicy.siteOrigin,
      );
      const url = buildSessionInviteUrl(origin, inviteSessionCode);
      if (!url) {
        return;
      }

      if (canNativeShare()) {
        try {
          await navigator.share({
            title: "Join my Hide+Seek session",
            text: `Join ${entry.username} and me with code ${inviteSessionCode}`,
            url,
          });
          const message = `Invite shared with ${entry.username} (${inviteSessionCode}).`;
          setInviteNote(message);
          onInviteCopied(message);
          return;
        } catch (error) {
          if (error instanceof DOMException && error.name === "AbortError") {
            return;
          }
          // Fall through to clipboard.
        }
      }

      const copied = await copyToClipboard(url);
      const message = copied
        ? `Invite link copied for ${entry.username} (${inviteSessionCode}).`
        : `Invite code ${inviteSessionCode} ready for ${entry.username}.`;
      setInviteNote(message);
      onInviteCopied(message);
    } finally {
      setInviting(false);
    }
  };

  const startNewGame = () => {
    onClose();
    navigate(`/create?friend=${encodeURIComponent(entry.username)}`);
  };

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
      styles={{
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
          maxHeight: "min(70dvh, 34rem)",
          backgroundColor: "var(--color-canvas)",
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          borderTop:
            "0.33px solid oklch(from var(--color-field-ink) l c h / 0.14)",
          overflow: "auto",
        },
        body: {
          width: "100%",
          paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))",
        },
      }}
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
          <FriendMonogram username={entry.username} size={56} />
          <Text
            fw={600}
            c="var(--color-field-ink)"
            style={{ fontSize: "1.25rem", letterSpacing: "-0.02em" }}
          >
            {entry.username}
          </Text>
          <RelationPill label={pillLabel} />
          {subtitle ? (
            <Text size="sm" c="var(--color-field-ink-muted)" ta="center">
              {subtitle}
            </Text>
          ) : null}
        </Stack>

        {isFriend || (isSearchHit && profile.mutualFriends != null) ? (
          <FriendStatsStrip profile={profile} />
        ) : null}

        <IosSuccessCallout>{inviteNote}</IosSuccessCallout>

        <Stack gap={10}>
          {isSearchHit ? (
            <>
              <Text size="sm" c="var(--color-field-ink-muted)" ta="center" px={4}>
                They'll need to accept before you can invite them to a game.
              </Text>
              <Button
                fullWidth
                loading={busy}
                leftSection={<UserPlus size={18} weight="bold" />}
                onClick={onRequest}
                styles={iosFilledStyles}
              >
                Send request
              </Button>
            </>
          ) : null}

          {isFriend ? (
            <>
              {inviteSessionCode ? (
                <>
                  <Button
                    fullWidth
                    loading={inviting}
                    leftSection={<PaperPlaneTilt size={18} weight="bold" />}
                    onClick={() => void inviteToSession()}
                    styles={iosFilledStyles}
                  >
                    {`Invite to ${inviteSessionCode}`}
                  </Button>
                  <Button
                    fullWidth
                    leftSection={<GameController size={18} weight="bold" />}
                    onClick={startNewGame}
                    styles={iosGrayStyles}
                  >
                    Start new game
                  </Button>
                </>
              ) : (
                <Button
                  fullWidth
                  leftSection={<GameController size={18} weight="bold" />}
                  onClick={startNewGame}
                  styles={iosFilledStyles}
                >
                  Start new game
                </Button>
              )}

              <IosInsetGroup>
                <IosInsetRow
                  to={`/leaderboard?user=${encodeURIComponent(entry.username)}`}
                  label="View on leaderboard"
                  icon={<Trophy size={22} weight="regular" />}
                />
                <IosInsetRow
                  showSeparator
                  label={confirmRemove ? "Confirm remove" : "Remove friend"}
                  icon={<UserMinus size={22} weight="regular" />}
                  tone="halt"
                  showChevron={false}
                  onClick={() => {
                    if (!confirmRemove) {
                      setConfirmRemove(true);
                      return;
                    }
                    onRemove();
                  }}
                />
              </IosInsetGroup>
            </>
          ) : null}

          {entry.relation === "incoming" && !isSearchHit ? (
            <>
              <Button
                fullWidth
                loading={busy}
                onClick={onAccept}
                leftSection={<Check size={18} weight="bold" />}
                styles={iosFilledStyles}
              >
                Accept request
              </Button>
              <Button
                fullWidth
                loading={busy}
                onClick={onDecline}
                styles={iosPlainHaltStyles}
              >
                Decline
              </Button>
            </>
          ) : null}

          {entry.relation === "outgoing" && !isSearchHit ? (
            <>
              <Text size="sm" c="var(--color-field-ink-muted)" ta="center" px={4}>
                Waiting for them to accept.
              </Text>
              <Button
                fullWidth
                loading={busy}
                onClick={onCancel}
                leftSection={<UserMinus size={16} weight="bold" />}
                styles={iosGrayStyles}
              >
                Cancel request
              </Button>
            </>
          ) : null}
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

/** Join/Presets-style iOS body for the Mantine Friends route. */
export function FriendsIosBody() {
  const model = useFriendsPanelModel();
  const sessionCode = useSessionStore((state) => state.session?.code ?? null);
  const inviteSessionCode = sessionCode ?? getFriendsMockSessionCode();
  const showSearchEmpty =
    model.hasSearched &&
    !model.searching &&
    model.requestableResults.length === 0 &&
    !model.error;

  const tabEntries =
    model.listTab === "incoming"
      ? model.incoming
      : model.listTab === "outgoing"
        ? model.outgoing
        : model.friends;

  const tabEmpty =
    model.listTab === "incoming"
      ? "No pending requests."
      : model.listTab === "outgoing"
        ? "No outgoing requests."
        : "No friends yet. Search above to send a request.";

  const tabEmptyIcon =
    model.listTab === "friends" ? (
      <UsersThree size={28} weight="regular" />
    ) : (
      <PaperPlaneTilt size={28} weight="regular" />
    );

  const tabSubtitle =
    model.listTab === "incoming"
      ? "Wants to connect"
      : model.listTab === "outgoing"
        ? "Waiting for them"
        : "Connected";

  const selectedSearchHit =
    model.selectedUid == null
      ? null
      : model.requestableResults.find((entry) => entry.uid === model.selectedUid) ??
        null;
  const selectedListed =
    model.selectedUid == null
      ? null
      : model.selectableEntries.find((entry) => entry.uid === model.selectedUid) ??
        null;
  const drawerEntry: SelectableFriend | null = selectedSearchHit
    ? { ...selectedSearchHit, relation: "friend" }
    : selectedListed;

  const segmentData: Array<{ value: FriendsListTab; label: string }> = [
    {
      value: "friends",
      label:
        model.friends.length > 0
          ? `Friends (${model.friends.length})`
          : "Friends",
    },
    {
      value: "incoming",
      label:
        model.incoming.length > 0
          ? `Incoming (${model.incoming.length})`
          : "Incoming",
    },
    {
      value: "outgoing",
      label:
        model.outgoing.length > 0
          ? `Outgoing (${model.outgoing.length})`
          : "Outgoing",
    },
  ];

  return (
    <PullToRefresh
      refreshing={model.refreshing}
      onRefresh={() => void model.pullRefresh()}
    >
      <Stack gap={22}>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            model.handleSearch();
          }}
        >
          <Stack gap={8}>
            <IosSectionLabel>Find people</IosSectionLabel>
            <Group gap={8} align="stretch" wrap="nowrap">
              <Box style={{ flex: 1, minWidth: 0 }}>
                <IosInsetGroup error={Boolean(model.queryError)}>
                  <TextInput
                    id="friends-search-username"
                    aria-label="Search username"
                    aria-invalid={Boolean(model.queryError)}
                    value={model.query}
                    onChange={(event) =>
                      model.onQueryChange(event.currentTarget.value)
                    }
                    placeholder="Username"
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck={false}
                    inputMode="search"
                    enterKeyHint="search"
                    maxLength={USERNAME_MAX_LENGTH}
                    error={undefined}
                    rightSection={
                      model.query ? (
                        <ActionIcon
                          type="button"
                          variant="subtle"
                          radius="xl"
                          size="sm"
                          aria-label="Clear search"
                          onClick={() => model.onQueryChange("")}
                          styles={{
                            root: {
                              color: "var(--color-field-ink-muted)",
                              "&:hover": {
                                backgroundColor:
                                  "oklch(from var(--color-field-ink) l c h / 0.1)",
                              },
                            },
                          }}
                        >
                          <X size={14} weight="bold" />
                        </ActionIcon>
                      ) : null
                    }
                    styles={{
                      ...insetInputStyles,
                      input: {
                        ...insetInputStyles.input,
                        paddingInlineStart: "0.85rem",
                      },
                    }}
                  />
                </IosInsetGroup>
              </Box>
              <ActionIcon
                type="submit"
                aria-label={model.searching ? "Searching" : "Search"}
                loading={model.searching}
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
                    "&:hover": {
                      backgroundColor:
                        "oklch(from var(--color-flag) calc(l + 0.03) c h)",
                    },
                  },
                }}
              >
                <MagnifyingGlass size={22} weight="bold" aria-hidden />
              </ActionIcon>
            </Group>
            <IosFieldError>{model.queryError}</IosFieldError>
            <Text size="xs" c="var(--color-field-ink-muted)" px={4}>
              Live results while you type · at least 2 characters
            </Text>
          </Stack>
        </form>

        <IosSuccessCallout>{model.successMessage}</IosSuccessCallout>
        {model.error ? <IosErrorCallout>{model.error}</IosErrorCallout> : null}

        {showSearchEmpty ? (
          <IosEmptyInset icon={<MagnifyingGlass size={28} weight="regular" />}>
            No users found for that username.
          </IosEmptyInset>
        ) : null}

        {model.requestableResults.length > 0 ? (
          <Stack gap={8}>
            <IosSectionLabel>Results</IosSectionLabel>
            <IosInsetGroup>
              {model.requestableResults.map((entry, index) => (
                <Box key={entry.uid}>
                  <FriendRowFace
                    username={entry.username}
                    subtitle="Not connected yet"
                    onPress={() => model.setSelectedUid(entry.uid)}
                    trailing={
                      <Button
                        type="button"
                        disabled={model.busyUid === entry.uid}
                        loading={model.busyUid === entry.uid}
                        aria-label={`Request ${entry.username}`}
                        leftSection={
                          model.busyUid === entry.uid ? undefined : (
                            <UserPlus size={14} weight="bold" aria-hidden />
                          )
                        }
                        onClick={() => void model.requestFriend(entry.uid)}
                        styles={iosCompactFilledStyles}
                      >
                        Request
                      </Button>
                    }
                  />
                  {index < model.requestableResults.length - 1 ? (
                    <InsetHairline />
                  ) : null}
                </Box>
              ))}
            </IosInsetGroup>
          </Stack>
        ) : null}

        <Stack gap={8}>
          <SegmentedControl
            fullWidth
            value={model.listTab}
            onChange={(value) => model.setListTab(value as FriendsListTab)}
            data={segmentData}
            aria-label="Friends lists"
            styles={segmentedStyles}
          />

          {model.loadingList ? (
            <IosInsetGroup>
              <Group gap={10} px="md" py="md" c="var(--color-field-ink-muted)">
                <CircleNotch
                  size={18}
                  weight="bold"
                  className="loading-spinner"
                  aria-hidden
                />
                <Text size="sm">Loading…</Text>
              </Group>
            </IosInsetGroup>
          ) : tabEntries.length === 0 ? (
            <IosEmptyInset icon={tabEmptyIcon}>{tabEmpty}</IosEmptyInset>
          ) : (
            <FriendSwipeRegistry>
              <IosInsetGroup>
                {tabEntries.map((entry, index) => (
                  <FriendTabRow
                    key={entry.uid}
                    entry={entry}
                    tab={model.listTab}
                    subtitle={tabSubtitle}
                    busyUid={model.busyUid}
                    showDivider={index < tabEntries.length - 1}
                    onOpen={() => model.setSelectedUid(entry.uid)}
                    onAccept={() => void model.acceptFriend(entry.uid)}
                    onDecline={() => void model.declineFriend(entry.uid)}
                    onCancel={() => void model.cancelFriend(entry.uid)}
                  />
                ))}
              </IosInsetGroup>
            </FriendSwipeRegistry>
          )}
        </Stack>

        {drawerEntry ? (
          <FriendDetailDrawer
            entry={drawerEntry}
            isSearchHit={selectedSearchHit != null}
            busy={model.busyUid === drawerEntry.uid}
            inviteSessionCode={inviteSessionCode}
            onClose={() => model.setSelectedUid(null)}
            onAccept={() => void model.acceptFriend(drawerEntry.uid)}
            onDecline={() => void model.declineFriend(drawerEntry.uid)}
            onCancel={() => void model.cancelFriend(drawerEntry.uid)}
            onRequest={() => void model.requestFriend(drawerEntry.uid)}
            onRemove={() => void model.removeFriend(drawerEntry.uid)}
            onInviteCopied={model.flashSuccess}
          />
        ) : null}
      </Stack>
    </PullToRefresh>
  );
}

function FriendTabRow({
  entry,
  tab,
  subtitle,
  busyUid,
  showDivider,
  onOpen,
  onAccept,
  onDecline,
  onCancel,
}: {
  entry: FriendListEntry;
  tab: FriendsListTab;
  subtitle: string;
  busyUid: string | null;
  showDivider: boolean;
  onOpen: () => void;
  onAccept: () => void;
  onDecline: () => void;
  onCancel: () => void;
}) {
  const busy = busyUid === entry.uid;

  if (tab === "incoming") {
    return (
      <Box>
        <FriendSwipeRow
          actionCount={2}
          onOpen={onOpen}
          onFullSwipe={onAccept}
          actions={
            <>
              <FriendSwipeAction
                label="Decline"
                icon={<X size={20} weight="bold" />}
                tone="halt"
                disabled={busy}
                onClick={onDecline}
              />
              <FriendSwipeAction
                label="Accept"
                icon={<Check size={20} weight="bold" />}
                tone="flag"
                disabled={busy}
                primary
                onClick={onAccept}
              />
            </>
          }
        >
          <FriendRowFace
            username={entry.username}
            subtitle={subtitle}
          />
        </FriendSwipeRow>
        {showDivider ? <InsetHairline /> : null}
      </Box>
    );
  }

  if (tab === "outgoing") {
    return (
      <Box>
        <FriendSwipeRow
          actionCount={1}
          onOpen={onOpen}
          onFullSwipe={onCancel}
          actions={
            <FriendSwipeAction
              label="Cancel"
              icon={<UserMinus size={20} weight="bold" />}
              tone="halt"
              disabled={busy}
              primary
              onClick={onCancel}
            />
          }
        >
          <FriendRowFace
            username={entry.username}
            subtitle={subtitle}
          />
        </FriendSwipeRow>
        {showDivider ? <InsetHairline /> : null}
      </Box>
    );
  }

  return (
    <Box>
      <FriendRowFace
        username={entry.username}
        subtitle={subtitle}
        onPress={onOpen}
        trailing={<RowChevron />}
      />
      {showDivider ? <InsetHairline /> : null}
    </Box>
  );
}
