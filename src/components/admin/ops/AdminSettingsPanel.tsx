export function AdminSettingsPanel() {
  return (
    <div className="jl-ops-settings" data-testid="admin-settings-panel">
      <p className="jl-ops-settings-body">
        The session list refreshes manually. Use the Refresh button or load more at the bottom of
        the list. Monitoring uses realtime listeners while a session is selected.
      </p>
    </div>
  );
}
