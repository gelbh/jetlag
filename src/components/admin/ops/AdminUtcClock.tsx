import { Text } from "@mantine/core";
import { useEffect, useState } from "react";

export function AdminUtcClock() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const iso = now.toISOString();
  return (
    <Text component="time" dateTime={iso} size="sm" fw={700} ff="monospace">
      {`${iso.slice(11, 19)} UTC`}
    </Text>
  );
}
