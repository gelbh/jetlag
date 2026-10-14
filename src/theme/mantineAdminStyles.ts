/**
 * Per-component Mantine CSS that only admin surfaces render. Imported from the
 * admin roots (AdminWorld, AdminMapScreen) so it ships in lazy chunks instead of
 * the render-blocking entry CSS every player loads. `mantineStyles.test.ts`
 * fails when player code renders one of these components.
 *
 * Order mirrors Mantine's own `styles.layer.css`.
 */
import "@mantine/core/styles/Accordion.layer.css";
import "@mantine/core/styles/Chip.layer.css";
import "@mantine/core/styles/Divider.layer.css";
import "@mantine/core/styles/Kbd.layer.css";
import "@mantine/core/styles/List.layer.css";
import "@mantine/core/styles/Tooltip.layer.css";
import "@mantine/core/styles/Table.layer.css";
