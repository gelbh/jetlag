import { Box, Group, Title, UnstyledButton } from "@mantine/core";
import { Link } from "react-router-dom";
import { AppLogo } from "@/components/ui/brand/AppLogo";
import { JetlagBackChevron } from "@/components/ui/brand/JetlagBackChevron";

export interface IosEntryHeaderProps {
  title: string;
  backTo?: string;
  backLabel?: string;
}

/** Product-mark back control: curved arrow, 44pt hit target. */
function BackControl({ to, label }: { to: string; label: string }) {
  return (
    <UnstyledButton
      component={Link}
      to={to}
      aria-label={label}
      styles={{
        root: {
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 44,
          height: 44,
          marginInlineStart: -6,
          padding: 0,
          lineHeight: 0,
          backgroundColor: "transparent",
          border: "none",
          borderRadius: 10,
          transition: "opacity 80ms ease, transform 80ms ease",
          WebkitTapHighlightColor: "transparent",
          "&:hover": {
            backgroundColor: "transparent",
            opacity: 0.85,
          },
          "&:active": {
            opacity: 0.55,
            transform: "scale(0.92)",
          },
        },
      }}
    >
      <JetlagBackChevron size={22} />
    </UnstyledButton>
  );
}

/**
 * Shared Apple-native nav bar for Join / Create Mantine screens.
 * Safe-area inset + 52pt toolbar; back / mark / title vertically centered.
 */
export function IosEntryHeader({
  title,
  backTo = "/",
  backLabel = "Back",
}: IosEntryHeaderProps) {
  return (
    <Box
      component="header"
      aria-label="Screen header"
      className="shrink-0"
      style={{
        width: "100%",
        paddingTop: "max(0.5rem, env(safe-area-inset-top, 0px))",
        backgroundColor: "oklch(from var(--color-canvas) l c h / 0.72)",
        borderBottom:
          "0.33px solid oklch(from var(--color-field-ink) l c h / 0.12)",
        backdropFilter: "blur(20px) saturate(1.4)",
        WebkitBackdropFilter: "blur(20px) saturate(1.4)",
      }}
    >
      <Box
        px={14}
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) auto minmax(0, 1fr)",
          alignItems: "center",
          height: 52,
        }}
      >
        <Box
          style={{
            justifySelf: "start",
            alignSelf: "center",
            display: "flex",
            alignItems: "center",
            height: 44,
            minWidth: 0,
          }}
        >
          <BackControl to={backTo} label={backLabel} />
        </Box>
        <Group
          gap={9}
          align="center"
          wrap="nowrap"
          justify="center"
          style={{ height: 44, alignSelf: "center" }}
        >
          <AppLogo variant="mark" size="sm" width={28} height={28} />
          <Title
            order={1}
            c="var(--color-field-ink)"
            fw={600}
            style={{
              fontSize: "1.1875rem",
              lineHeight: 1,
              letterSpacing: "-0.02em",
              margin: 0,
            }}
          >
            {title}
          </Title>
        </Group>
        <span aria-hidden="true" />
      </Box>
    </Box>
  );
}
