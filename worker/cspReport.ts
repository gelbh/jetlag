export const CSP_REPORT_PATH = "/api/csp-report";

const CSP_REPORT_LOG_BYTES = 8_000;

export async function handleCspReportRequest(
  request: Request,
): Promise<Response> {
  // Some browsers and intermediaries appear to probe this endpoint with non-POST
  // methods (or preflight-like requests). Don't emit noisy 405s in the console.
  if (request.method !== "POST") {
    return new Response(null, { status: 204 });
  }

  const contentLengthHeader = request.headers.get("Content-Length");
  if (contentLengthHeader) {
    const contentLength = Number(contentLengthHeader);
    if (Number.isFinite(contentLength) && contentLength > CSP_REPORT_LOG_BYTES) {
      return new Response("Payload too large", { status: 413 });
    }
  }

  let loggedBody = "";
  const reader = request.body?.getReader();
  if (reader) {
    const decoder = new TextDecoder();
    let loggedBytes = 0;

    while (true) {
      const result = await reader.read();
      if (result.done) {
        break;
      }
      if (!result.value) {
        continue;
      }

      const remainingBytes = CSP_REPORT_LOG_BYTES - loggedBytes;
      if (remainingBytes <= 0) {
        break;
      }

      const chunk = result.value.subarray(0, remainingBytes);
      loggedBody += decoder.decode(chunk, { stream: true });
      loggedBytes += chunk.byteLength;
    }
  }

  // Intentionally coarse: we just need the payload in Workers logs to identify the culprit.
  console.log("[csp-report]", loggedBody);

  return new Response(null, { status: 204 });
}
