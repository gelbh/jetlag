import { AppErrorPage } from "../components/ui/AppErrorPage";

export function NotFound() {
  return (
    <AppErrorPage
      title="Page not found"
      message="That path is not in this app. Head home to host or join a session."
      secondaryAction={{ label: "Back home", to: "/" }}
    />
  );
}
