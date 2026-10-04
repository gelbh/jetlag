/**
 * Per-component Mantine CSS, imported once from main.tsx (entry CSS).
 *
 * Entry CSS is render-blocking, and the full `styles.layer.css` bundle ships
 * ~100 components the app never renders. We list only the components the app
 * imports plus Mantine's internal deps (e.g. UnstyledButton for Button, Input
 * for TextInput, ModalBase/Overlay for Drawer). Lazy-only components stay here
 * too: a separate lazy stylesheet saved <2 KB gz and let a new route render
 * unstyled with tests green. `mantineStyles.test.ts` fails when an imported
 * component's CSS is missing.
 *
 * Order mirrors Mantine's own `styles.layer.css`.
 */
import "@mantine/core/styles/baseline.layer.css";
import "@mantine/core/styles/default-css-variables.layer.css";
import "@mantine/core/styles/global.layer.css";
import "@mantine/core/styles/ScrollArea.layer.css";
import "@mantine/core/styles/UnstyledButton.layer.css";
import "@mantine/core/styles/VisuallyHidden.layer.css";
import "@mantine/core/styles/Paper.layer.css";
import "@mantine/core/styles/Overlay.layer.css";
import "@mantine/core/styles/Popover.layer.css";
import "@mantine/core/styles/Loader.layer.css";
import "@mantine/core/styles/ActionIcon.layer.css";
import "@mantine/core/styles/CloseButton.layer.css";
import "@mantine/core/styles/Group.layer.css";
import "@mantine/core/styles/ModalBase.layer.css";
import "@mantine/core/styles/Input.layer.css";
import "@mantine/core/styles/Combobox.layer.css";
import "@mantine/core/styles/FloatingIndicator.layer.css";
import "@mantine/core/styles/Alert.layer.css";
import "@mantine/core/styles/Text.layer.css";
import "@mantine/core/styles/Anchor.layer.css";
import "@mantine/core/styles/Badge.layer.css";
import "@mantine/core/styles/Button.layer.css";
import "@mantine/core/styles/Center.layer.css";
import "@mantine/core/styles/Container.layer.css";
import "@mantine/core/styles/Drawer.layer.css";
import "@mantine/core/styles/Notification.layer.css";
import "@mantine/core/styles/Progress.layer.css";
import "@mantine/core/styles/SegmentedControl.layer.css";
import "@mantine/core/styles/SimpleGrid.layer.css";
import "@mantine/core/styles/Stack.layer.css";
import "@mantine/core/styles/Switch.layer.css";
import "@mantine/core/styles/Title.layer.css";
import "@mantine/notifications/styles.layer.css";
