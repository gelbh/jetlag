import { Text } from "@mantine/core";

const sizes = { sm: "sm", md: "lg", lg: "xl" } as const;

export function SessionCode({ code, size = "sm" }: { code: string; size?: keyof typeof sizes }) {
  return (
    <Text
      component="span"
      ff="var(--adm-font)"
      fw={800}
      size={sizes[size]}
      style={{ fontStretch: "125%", letterSpacing: "0.08em" }}
    >
      {code}
    </Text>
  );
}
