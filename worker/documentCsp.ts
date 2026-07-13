const SCRIPT_NONCE_PATTERN = /'nonce-[^']+'/;

export function generateCspNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function isHtmlDocumentResponse(response: Response): boolean {
  const contentType = response.headers.get("content-type") ?? "";
  return contentType.includes("text/html");
}

export function injectScriptNonces(html: string, nonce: string): string {
  return html.replace(
    /<script(?![^>]*\snonce=)/gi,
    `<script nonce="${nonce}"`,
  );
}

export function addScriptNonceToCsp(csp: string, nonce: string): string {
  const nonceToken = `'nonce-${nonce}'`;
  if (csp.includes(nonceToken)) {
    return csp;
  }

  if (SCRIPT_NONCE_PATTERN.test(csp)) {
    return csp.replace(SCRIPT_NONCE_PATTERN, nonceToken);
  }

  return csp.replace(/(script-src [^;]+)/, `$1 ${nonceToken}`);
}

export async function applyDocumentCspNonce(
  response: Response,
): Promise<Response> {
  const nonce = generateCspNonce();
  const html = await response.text();
  const headers = new Headers(response.headers);
  const contentSecurityPolicy = headers.get("Content-Security-Policy");

  if (contentSecurityPolicy) {
    headers.set(
      "Content-Security-Policy",
      addScriptNonceToCsp(contentSecurityPolicy, nonce),
    );
  }

  return new Response(injectScriptNonces(html, nonce), {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
