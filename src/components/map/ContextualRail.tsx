import { useEffect, useRef } from "react";
import {
  HudChevronLeftIcon,
  HudChevronRightIcon,
} from "../ui/HudIcons";
import {
  type ContextualRailTab,
} from "./ContextualRailContext";
import { useContextualRailPanel } from "./useContextualRailPanel";

const TAB_META: Record<ContextualRailTab, { label: string; short: string }> = {
  settings: { label: "Settings", short: "Set" },
  chat: { label: "Chat", short: "Chat" },
  log: { label: "Log", short: "Log" },
};

export interface ContextualRailProps {
  open: boolean;
  activeTab: ContextualRailTab | null;
  onClose: () => void;
  onSelectTab: (tab: ContextualRailTab) => void;
  /** Tabs shown in the strip. Defaults to settings / chat / log. */
  tabs?: readonly ContextualRailTab[];
  dismissible?: boolean;
}

export function ContextualRail({
  open,
  activeTab,
  onClose,
  onSelectTab,
  tabs = ["settings", "chat", "log"],
  dismissible = true,
}: ContextualRailProps) {
  const railPanel = useContextualRailPanel();
  const panelRef = useRef<HTMLDivElement | null>(null);
  const activeLabel =
    activeTab != null ? TAB_META[activeTab].label : "Map panels";

  useEffect(() => {
    if (!open || !dismissible) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") {
        return;
      }
      // Nested modals (e.g. curse reference) own Escape first.
      if (document.querySelector('[aria-modal="true"]')) {
        return;
      }
      event.preventDefault();
      onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, dismissible, onClose]);

  useEffect(() => {
    if (!open || !panelRef.current) {
      return;
    }

    const focusTarget =
      panelRef.current.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      ) ?? panelRef.current;
    focusTarget.focus();
  }, [open, activeTab]);

  const setPanelNode = (node: HTMLDivElement | null) => {
    panelRef.current = node;
    railPanel?.setPanelEl(node);
  };

  return (
    <aside
      className={`contextual-rail${open ? " contextual-rail--open" : " contextual-rail--collapsed"}`}
      role="complementary"
      aria-label="Map panels"
    >
      <div className="contextual-rail__header">
        <button
          type="button"
          className="hud-chrome inline-flex min-h-11 min-w-11 items-center justify-center"
          aria-label={open ? "Collapse map panels" : "Expand map panels"}
          aria-expanded={open}
          onClick={() => {
            if (open) {
              onClose();
              return;
            }
            onSelectTab(activeTab ?? tabs[0] ?? "settings");
          }}
        >
          {open ? (
            <HudChevronRightIcon className="size-4" />
          ) : (
            <HudChevronLeftIcon className="size-4" />
          )}
        </button>
        {open ? (
          <span className="min-w-0 truncate font-display text-xs font-semibold uppercase tracking-wide text-ink">
            {activeLabel}
          </span>
        ) : null}
      </div>

      {!open ? (
        <nav
          className="contextual-rail__icon-tabs"
          aria-label="Map panel tabs"
        >
          {tabs.map((tab) => {
            const meta = TAB_META[tab];
            return (
              <button
                key={tab}
                type="button"
                className={`contextual-rail__icon-tab${
                  activeTab === tab ? " contextual-rail__icon-tab--active" : ""
                }`}
                aria-label={meta.label}
                onClick={() => onSelectTab(tab)}
              >
                {meta.short}
              </button>
            );
          })}
        </nav>
      ) : (
        <>
          <div
            className="contextual-rail__tabs"
            role="tablist"
            aria-label="Map panel sections"
          >
            {tabs.map((tab) => {
              const meta = TAB_META[tab];
              return (
                <button
                  key={tab}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === tab}
                  className={`contextual-rail__tab${
                    activeTab === tab ? " contextual-rail__tab--active" : ""
                  }`}
                  onClick={() => onSelectTab(tab)}
                >
                  {meta.label}
                </button>
              );
            })}
          </div>
          <div
            ref={setPanelNode}
            className="contextual-rail__panel"
            role="tabpanel"
            aria-label={activeLabel}
            tabIndex={-1}
          />
        </>
      )}
    </aside>
  );
}
