import { afterEach, beforeEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import "fake-indexeddb/auto";

function ensureMatchMedia() {
  if (typeof window === "undefined" || typeof window.matchMedia === "function") {
    return;
  }
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
    }),
  });
}

function ensureResizeObserver() {
  if (typeof globalThis.ResizeObserver === "function") {
    return;
  }
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {
      return undefined;
    }
    unobserve() {
      return undefined;
    }
    disconnect() {
      return undefined;
    }
  };
}

ensureMatchMedia();
ensureResizeObserver();

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  vi.restoreAllMocks();
  ensureMatchMedia();
  ensureResizeObserver();
});

afterEach(() => {
  cleanup();
});
