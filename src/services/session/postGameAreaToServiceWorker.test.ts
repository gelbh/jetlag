import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  postGameAreaToServiceWorker,
  resetGameAreaServiceWorkerPostForTests,
  retainGameAreaForServiceWorker,
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

const flushMicrotasks = () => Promise.resolve();

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

  it("skips repeats of an equal bbox", () => {
    const controller = { postMessage: vi.fn() };
    stubServiceWorker(controller);
    postGameAreaToServiceWorker(BBOX);
    postGameAreaToServiceWorker({ ...BBOX });
    expect(controller.postMessage).toHaveBeenCalledTimes(1);
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

describe("retainGameAreaForServiceWorker", () => {
  beforeEach(() => {
    resetGameAreaServiceWorkerPostForTests();
  });

  afterEach(() => {
    resetGameAreaServiceWorkerPostForTests();
    vi.unstubAllGlobals();
  });

  it("posts null on session end once the last holder releases", async () => {
    const controller = { postMessage: vi.fn() };
    stubServiceWorker(controller);
    const outer = retainGameAreaForServiceWorker(BBOX);
    const inner = retainGameAreaForServiceWorker(BBOX);

    inner();
    await flushMicrotasks();
    expect(controller.postMessage).toHaveBeenLastCalledWith({
      type: "jetlag:game-area",
      bbox: BBOX,
    });

    outer();
    outer();
    await flushMicrotasks();
    expect(controller.postMessage).toHaveBeenLastCalledWith({
      type: "jetlag:game-area",
      bbox: null,
    });
    expect(controller.postMessage).toHaveBeenCalledTimes(2);
  });

  it("does not flash null when an effect re-runs (release then retain)", async () => {
    const controller = { postMessage: vi.fn() };
    stubServiceWorker(controller);
    const first = retainGameAreaForServiceWorker(BBOX);
    first();
    retainGameAreaForServiceWorker({ ...BBOX });
    await flushMicrotasks();
    expect(controller.postMessage).toHaveBeenCalledTimes(1);
  });
});
