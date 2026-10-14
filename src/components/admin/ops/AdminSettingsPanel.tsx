export function AdminSettingsPanel() {
  return (
    <div className="jl-ops-settings" data-testid="admin-settings-panel">
      <p className="jl-ops-settings-body">
        The session list refreshes every 30 seconds while this tab is visible. Use Refresh to update
        now, or load more at the bottom of the list. Monitoring uses realtime listeners while a
        session is selected.
      </p>
    </div>
  );
}
