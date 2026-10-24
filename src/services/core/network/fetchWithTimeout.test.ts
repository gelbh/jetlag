import { describe, expect, it } from "vitest";
import { createLoadTask } from "../progress/loadTask";
import { readTextWithProgress } from "./fetchWithTimeout";

const STAGE = { kind: "download" as const, label: "Downloading", historyKey: "test:download" };

function streamedResponse(chunks: string[], headers: Record<string, string>): Response {
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk));
      }
      controller.close();
    },
  });
  return new Response(body, { headers });
}

/** Node whose byte counts are recorded as they arrive. */
function recordingNode() {
  const node = createLoadTask({ label: "Loading" }).stage(STAGE);
  const counts: Array<[number, number]> = [];
  const setCount = node.setCount.bind(node);
  node.setCount = (done, total) => {
    counts.push([done, total]);
    setCount(done, total);
  };
  return { node, counts };
}

describe("readTextWithProgress", () => {
  it("counts bytes against an identity Content-Length", async () => {
    const { node, counts } = recordingNode();
    const response = streamedResponse(['{"a":', "1}"], { "Content-Length": "7" });

    await expect(readTextWithProgress(response, node)).resolves.toBe('{"a":1}');
    expect(counts).toEqual([
      [5, 7],
      [7, 7],
    ]);
  });

  it("keeps the stage timed when the body is content-encoded", async () => {
    const { node, counts } = recordingNode();
    const response = streamedResponse(["abc", "def"], {
      "Content-Length": "4",
      "Content-Encoding": "gzip",
    });

    await expect(readTextWithProgress(response, node)).resolves.toBe("abcdef");
    expect(counts).toEqual([]);
    expect(node.isRunning).toBe(true);
  });

  it("keeps the stage timed without a Content-Length", async () => {
    const { node, counts } = recordingNode();
    const response = streamedResponse(["abc"], {});

    await expect(readTextWithProgress(response, node)).resolves.toBe("abc");
    expect(counts).toEqual([]);
  });

  it("stops counting once the body outgrows the header", async () => {
    const { node, counts } = recordingNode();
    const response = streamedResponse(["abc", "defgh"], { "Content-Length": "4" });

    await expect(readTextWithProgress(response, node)).resolves.toBe("abcdefgh");
    expect(counts).toEqual([[3, 4]]);
  });

  it("decodes multi-byte characters split across chunks", async () => {
    const bytes = new TextEncoder().encode("Baile Átha Cliath");
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(bytes.slice(0, 7));
        controller.enqueue(bytes.slice(7));
        controller.close();
      },
    });
    const { node } = recordingNode();

    await expect(readTextWithProgress(new Response(body), node)).resolves.toBe("Baile Átha Cliath");
  });
});
