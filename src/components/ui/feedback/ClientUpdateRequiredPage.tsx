import { AppErrorPage } from "./AppErrorPage";

export function ClientUpdateRequiredPage({
  minVersion,
}: {
  minVersion: string;
}) {
  return (
    <AppErrorPage
      title="Update required"
      message={`This app needs version ${minVersion} or newer. Refresh to load the latest build.`}
      assertive
      primaryAction={{
        label: "Refresh",
        onClick: () => window.location.reload(),
      }}
    />
  );
}
