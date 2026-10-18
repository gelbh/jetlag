import { describe, expect, it, vi } from "vitest";
import type { LoadPriority } from "@/domain/progress/progressTree";
import {
  notifyOverpassPriorityChanged,
  overpassQueueStateForTests,
  type SlotRequest,
  withOverpassConcurrencyLimit,
} from "./requestQueue";

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

async function flush() {
  for (let index = 0; index < 5; index += 1) {
    await Promise.resolve();
  }
}

function startJob(
  log: string[],
  name: string,
  priority: SlotRequest["priority"],
  extra: Omit<SlotRequest, "priority"> = {},
) {
  const gate = deferred();
  const done = withOverpassConcurrencyLimit(
    async () => {
      log.push(name);
      await gate.promise;
    },
    { priority, ...extra },
  );
  return { gate, done };
}

describe("withOverpassConcurrencyLimit lanes", () => {
  it("never lets background work hold both slots", async () => {
    const log: string[] = [];
    const a = startJob(log, "bg-a", "background");
    const b = startJob(log, "bg-b", "background");
    await flush();
    expect(log).toEqual(["bg-a"]);
    a.gate.resolve();
    await a.done;
    await flush();
    expect(log).toEqual(["bg-a", "bg-b"]);
    b.gate.resolve();
    await b.done;
  });

  it("serves foreground before queued background", async () => {
    const log: string[] = [];
    const fg1 = startJob(log, "fg-1", "foreground");
    const fg2 = startJob(log, "fg-2", "foreground");
    const bg = startJob(log, "bg", "background");
    const fg3 = startJob(log, "fg-3", "foreground");
    await flush();
    expect(log).toEqual(["fg-1", "fg-2"]);
    fg1.gate.resolve();
    await fg1.done;
    await flush();
    expect(log).toEqual(["fg-1", "fg-2", "fg-3"]);
    fg2.gate.resolve();
    fg3.gate.resolve();
    await Promise.all([fg2.done, fg3.done]);
    await flush();
    expect(log).toContain("bg");
    bg.gate.resolve();
    await bg.done;
  });

  it("lets a foreground request run beside a background one", async () => {
    const log: string[] = [];
    const bg = startJob(log, "bg", "background");
    const fg = startJob(log, "fg", "foreground");
    await flush();
    expect(log).toEqual(["bg", "fg"]);
    bg.gate.resolve();
    fg.gate.resolve();
    await Promise.all([bg.done, fg.done]);
  });

  it("removes an aborted waiter so it never runs", async () => {
    const log: string[] = [];
    const a = startJob(log, "a", "foreground");
    const b = startJob(log, "b", "foreground");
    const controller = new AbortController();
    const c = startJob(log, "c", "foreground", { signal: controller.signal });
    await flush();
    controller.abort(new DOMException("Cancelled.", "AbortError"));
    await expect(c.done).rejects.toMatchObject({ name: "AbortError" });
    a.gate.resolve();
    b.gate.resolve();
    await Promise.all([a.done, b.done]);
    expect(log).toEqual(["a", "b"]);
    expect(overpassQueueStateForTests()).toEqual({ active: 0, waiting: 0 });
  });

  it("rejects at once when the signal is already aborted", async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(
      withOverpassConcurrencyLimit(async () => "never", { signal: controller.signal }),
    ).rejects.toBeDefined();
  });

  it("promotes a waiting background request read live", async () => {
    const log: string[] = [];
    let priority: LoadPriority = "background";
    const bgHeld = startJob(log, "bg-held", "background");
    const promoted = startJob(log, "promoted", () => priority);
    await flush();
    expect(log).toEqual(["bg-held"]);
    priority = "foreground";
    notifyOverpassPriorityChanged();
    await flush();
    expect(log).toEqual(["bg-held", "promoted"]);
    bgHeld.gate.resolve();
    promoted.gate.resolve();
    await Promise.all([bgHeld.done, promoted.done]);
  });

  it("stops counting a promoted holder against the background cap", async () => {
    const log: string[] = [];
    let priority: LoadPriority = "background";
    const promoted = startJob(log, "promoted", () => priority);
    const fg = startJob(log, "fg", "foreground");
    const bg = startJob(log, "bg", "background");
    await flush();
    expect(log).toEqual(["promoted", "fg"]);
    priority = "foreground";
    fg.gate.resolve();
    await fg.done;
    await flush();
    expect(log).toEqual(["promoted", "fg", "bg"]);
    promoted.gate.resolve();
    bg.gate.resolve();
    await Promise.all([promoted.done, bg.done]);
  });

  it("reports queue positions", async () => {
    const log: string[] = [];
    const a = startJob(log, "a", "foreground");
    const b = startJob(log, "b", "foreground");
    const positions: number[] = [];
    const c = startJob(log, "c", "foreground", {
      onQueuePosition: (position: number) => positions.push(position),
    });
    const onFront = vi.fn();
    const d = startJob(log, "d", "background", { onQueuePosition: onFront });
    await flush();
    expect(positions.at(-1)).toBe(0);
    expect(onFront).toHaveBeenLastCalledWith(1);
    a.gate.resolve();
    b.gate.resolve();
    c.gate.resolve();
    d.gate.resolve();
    await Promise.all([a.done, b.done, c.done, d.done]);
  });
});
