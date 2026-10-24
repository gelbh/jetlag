import { Text } from "@mantine/core";

const sizes = { sm: 14, md: 16, lg: 20 } as const;

export function SessionCode({ code, size = "sm" }: { code: string; size?: keyof typeof sizes }) {
  return (
    <Text
      component="span"
      fw={700}
      style={{
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
        fontSize: sizes[size],
        letterSpacing: "0.08em",
        color: "var(--color-ink)",
      }}
    >
      {code}
    </Text>
  );
}
