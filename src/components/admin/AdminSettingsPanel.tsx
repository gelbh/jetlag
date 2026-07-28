export function AdminSettingsPanel({ titleId }: { titleId?: string }) {
  return (
    <div className="jl-ops-settings" data-testid="admin-settings-panel">
      <h2 id={titleId} className="jl-ops-settings-title">
        Panel settings
      </h2>
      <p className="jl-ops-settings-body">
        The session list refreshes manually. Use the Refresh button or load more
        at the bottom of the list. Monitoring uses realtime listeners while a
        session is selected.
      </p>
      <p className="jl-ops-settings-body">
        Desk layouts and named presets stay on this device. Arranging panels
        switches the active preset to Scratch.
      </p>
    </div>
  );
}
