import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  postGameAreaToServiceWorker,
  resetGameAreaServiceWorkerPostForTests,
} from "./postGameAreaToServiceWorker";

const BBOX = { south: 51.48, west: -0.15, north: 51.53, east: -0.08 };

function stubServiceWorker(controller: { postMessage: ReturnType<typeof vi.fn> } | null) {
  const container = new EventTarget() as EventTarget & {
    controller: typeof controller;
  };
  container.controller = controller;
  vi.stubGlobal("navigator", { serviceWorker: container });
  return container;
}

describe("postGameAreaToServiceWorker", () => {
  beforeEach(() => {
    resetGameAreaServiceWorkerPostForTests();
  });

  afterEach(() => {
    resetGameAreaServiceWorkerPostForTests();
    vi.unstubAllGlobals();
  });

  it("posts the bbox message to the active controller", () => {
    const controller = { postMessage: vi.fn() };
    stubServiceWorker(controller);
    postGameAreaToServiceWorker(BBOX);
    expect(controller.postMessage).toHaveBeenCalledWith({ type: "jetlag:game-area", bbox: BBOX });
  });

  it("posts null on session end", () => {
    const controller = { postMessage: vi.fn() };
    stubServiceWorker(controller);
    postGameAreaToServiceWorker(null);
    expect(controller.postMessage).toHaveBeenCalledWith({ type: "jetlag:game-area", bbox: null });
  });

  it("re-sends the latest bbox when a new SW takes control", () => {
    const container = stubServiceWorker(null);
    postGameAreaToServiceWorker(BBOX);

    const next = { postMessage: vi.fn() };
    container.controller = next;
    container.dispatchEvent(new Event("controllerchange"));
    expect(next.postMessage).toHaveBeenCalledWith({ type: "jetlag:game-area", bbox: BBOX });
  });

  it("is a no-op without service worker support", () => {
    vi.stubGlobal("navigator", {});
    expect(() => postGameAreaToServiceWorker(BBOX)).not.toThrow();
  });
});
