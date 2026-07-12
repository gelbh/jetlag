import { getClientEnv } from "../../config/env";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

let measurementId: string | null = null;

function ensureGtagStub(): void {
  window.dataLayer = window.dataLayer ?? [];
  window.gtag =
    window.gtag ??
    function gtag(...args: unknown[]) {
      window.dataLayer!.push(args);
    };
}

function loadGtagScript(id: string): void {
  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
  document.head.appendChild(script);
}

export function initAnalytics(): void {
  if (import.meta.env.MODE === "test" || !import.meta.env.PROD) {
    return;
  }

  const id = getClientEnv().VITE_GA_MEASUREMENT_ID;
  if (!id) {
    return;
  }

  measurementId = id;

  if (window.gtag) {
    window.gtag("config", id, { send_page_view: false });
    return;
  }

  // Fallback when the production build omitted the HTML snippet.
  ensureGtagStub();
  window.gtag!("js", new Date());
  window.gtag!("config", id, { send_page_view: false });
  loadGtagScript(id);
}

export function trackPageView(path: string): void {
  if (!measurementId || !window.gtag) {
    return;
  }

  window.gtag("event", "page_view", { page_path: path });
}
