import { Drawer } from "@mantine/core";
import { useRef, type CSSProperties, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { DrawerGrabber } from "@/components/ui/entry/entryChrome";
import { bottomDrawerStyles } from "@/components/ui/entry/entryStyles";
import { usePlayerPhoneShellPortalTarget } from "@/components/ui/layout/PlayerPhoneShellPortalContext";
import { useMotionProfile } from "@/hooks/motion/useMotionProfile";
import { useSheetGesture } from "@/hooks/motion/useSheetGesture";
import { resolveDrawerSheetTransitionProps } from "@/components/ui/sheets/drawerSheetTransition";
import { JETLAG_MODAL_Z_INDEX } from "@/theme/theme";

export interface DrawerSheetProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  pinned?: ReactNode;
  dismissible?: boolean;
  ariaLabel?: string;
  sheetClassName?: string;
  maxHeightClassName?: string;
  /** Horizontal body inset; default `md`. Pass `sm`/`xs` for denser sheets. */
  padding?: "xs" | "sm" | "md" | "lg" | "xl" | number;
  /**
   * `host` (default): one scroll region for children (session log).
   * `child`: host locks height; child owns scroll (chat tabs + list).
   */
  scrollMode?: "host" | "child";
  /** Extra styles on the inner body wrapper (e.g. keyboard inset). */
  contentStyle?: CSSProperties;
  /**
   * Ask placement: keep the dim scrim but let map taps pass through.
   * Also disables outside-click dismiss so pin taps do not close the tool.
   */
  mapInteractive?: boolean;
}

/** Chrome lives on the gesture wrapper so translateY moves radius/bg with the finger. */
const sheetChromeStyle: CSSProperties = {
  backgroundColor: "var(--color-canvas)",
  borderTopLeftRadius: 24,
  borderTopRightRadius: 24,
  borderTop: "0.33px solid oklch(from var(--color-field-ink) l c h / 0.14)",
};

/** Bottom safe-area on scroll/content so body can span to the phone bottom. */
const SHEET_BODY_SAFE_BOTTOM = "max(1.25rem, env(safe-area-inset-bottom))";

const DRAWER_PADDING_INLINE: Record<
  Exclude<DrawerSheetProps["padding"], number | undefined>,
  string
> = {
  xs: "0.625rem",
  sm: "0.75rem",
  md: "1rem",
  lg: "1.25rem",
  xl: "1.5rem",
};

/** Horizontal inset for scroll/body; named tokens stay non-zero (Verify #7). */
function resolveDrawerBodyInlinePadding(
  padding: NonNullable<DrawerSheetProps["padding"]>,
): string {
  if (typeof padding === "number") {
    return `${Math.max(padding, 10)}px`;
  }
  return DRAWER_PADDING_INLINE[padding];
}

/**
 * One bottom inset for scroll/body: keyboard pad replaces safe-area (no stack).
 * ChatPanel passes paddingBottom when the visual viewport keyboard inset > 0.
 */
function resolveDrawerBodyBottomPadding(
  contentStyle: CSSProperties | undefined,
): string | number {
  const raw = contentStyle?.paddingBottom;
  if (typeof raw === "number" && raw > 0) return raw;
  if (typeof raw === "string" && Number.parseFloat(raw) > 0) return raw;
  return SHEET_BODY_SAFE_BOTTOM;
}

/** Drop paddingBottom so keyboard inset is not applied on the gesture wrapper too. */
function stripPaddingBottom(
  style: CSSProperties | undefined,
): CSSProperties | undefined {
  if (style == null || style.paddingBottom === undefined) return style;
  const { paddingBottom: _paddingBottom, ...rest } = style;
  return rest;
}

/**
 * Phone-shell sheet path: iOS bottom Drawer with grabber + safe-area.
 * Portals into PlayerPhoneShell when mounted so overlays stay in the 390 column.
 */
export function DrawerSheet({
  open,
  onClose,
  children,
  pinned,
  dismissible = true,
  ariaLabel,
  sheetClassName = "",
  maxHeightClassName = "max-h-[min(72dvh,640px)]",
  padding = "md",
  scrollMode = "host",
  contentStyle,
  mapInteractive = false,
}: DrawerSheetProps) {
  const childScroll = scrollMode === "child";
  const baseStyles = bottomDrawerStyles(false);
  const portalTarget = usePlayerPhoneShellPortalTarget();
  const shellContained = portalTarget != null;
  /* Fixed → absolute when portaled into the shell (portal alone is not enough). */
  const shellPositionStyles = shellContained
    ? ({ position: "absolute" } as const)
    : undefined;

  const { decorativeAnimate } = useMotionProfile();
  const scrollRef = useRef<HTMLDivElement>(null);
  const gestureEnabled = dismissible && decorativeAnimate;
  const { sheetRef, sheetStyle, handleProps } = useSheetGesture({
    enabled: gestureEnabled,
    onDismiss: onClose,
    scrollRef,
    // Grabber sits outside the scroll body; do not block after scroll.
    gateStartOnScrollTop: false,
  });
  const transitionProps = resolveDrawerSheetTransitionProps(decorativeAnimate);
  const bodyInlinePadding = resolveDrawerBodyInlinePadding(padding);
  const bodyPadStyle: CSSProperties = {
    paddingInline: bodyInlinePadding,
    paddingBottom: resolveDrawerBodyBottomPadding(contentStyle),
  };
  const gestureContentStyle = stripPaddingBottom(contentStyle);

  return (
    <Drawer
      opened={open}
      onClose={onClose}
      position="bottom"
      size="auto"
      // Body inset is owned by scroll/content (Verify #7–#8), not Drawer chrome.
      padding={0}
      radius={0}
      withCloseButton={false}
      closeOnClickOutside={dismissible && !mapInteractive}
      closeOnEscape={dismissible}
      lockScroll
      withinPortal
      portalProps={shellContained ? { target: portalTarget } : undefined}
      keepMounted={false}
      zIndex={JETLAG_MODAL_Z_INDEX}
      title={ariaLabel}
      aria-label={ariaLabel}
      transitionProps={transitionProps}
      overlayProps={{
        backgroundOpacity: 0.4,
        blur: 3,
        // Overlay Transition owns opacity; drag drives sheet translate + dismiss only.
        style: mapInteractive ? { pointerEvents: "none" as const } : undefined,
      }}
      classNames={{
        content: cn(
          "mantine-drawer-sheet",
          sheetClassName,
          maxHeightClassName,
          "flex flex-col",
        ),
        body: cn(
          "min-h-0 flex flex-1 flex-col",
          childScroll ? "overflow-hidden" : "overflow-hidden",
        ),
        header: ariaLabel ? "sr-only" : undefined,
      }}
      styles={{
        ...baseStyles,
        overlay: shellPositionStyles,
        inner: {
          ...baseStyles.inner,
          ...shellPositionStyles,
        },
        content: {
          ...baseStyles.content,
          // Neutralize theme/Drawer chrome; gesture wrapper owns radius + fill.
          backgroundColor: "transparent",
          border: "none",
          borderRadius: 0,
          boxShadow: "none",
          backdropFilter: "none",
          WebkitBackdropFilter: "none",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        },
        body: {
          ...baseStyles.body,
          padding: 0,
          flex: 1,
          minHeight: 0,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        },
      }}
    >
      <div
        ref={sheetRef}
        data-testid="mantine-drawer-sheet"
        className="flex min-h-0 flex-1 flex-col gap-2"
        style={{
          ...sheetChromeStyle,
          // No chrome-only bottom bar; safe-area / keyboard live on scroll.
          paddingTop: "0.5rem",
          ...gestureContentStyle,
          ...sheetStyle,
        }}
      >
        <DrawerGrabber handleProps={gestureEnabled ? handleProps : undefined} />
        {pinned ? (
          <div className="shrink-0" style={{ paddingInline: bodyInlinePadding }}>
            {pinned}
          </div>
        ) : null}
        <div
          ref={scrollRef}
          className={
            childScroll
              ? "flex min-h-0 flex-1 flex-col overflow-hidden"
              : "jl-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain"
          }
          style={bodyPadStyle}
        >
          {children}
        </div>
      </div>
    </Drawer>
  );
}
