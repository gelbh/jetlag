const SCRIPT_SRC_PATTERN = /script-src ([^;]+)/;
const EXISTING_NONCE_TOKEN_PATTERN = /'nonce-[^']+'/g;
const WHITESPACE_PATTERN = /\s+/g;

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

export function shouldApplyDocumentCsp(response: Response): boolean {
  if (!isHtmlDocumentResponse(response)) {
    return false;
  }

  if (response.status === 204 || response.status === 205 || response.status === 304) {
    return false;
  }

  return response.body !== null;
}

export async function injectScriptNonces(
  html: string,
  nonce: string,
): Promise<string> {
  if (typeof HTMLRewriter === "undefined") {
    return html.replace(
      /<script(?![^>]*\snonce=)/gi,
      `<script nonce="${nonce}"`,
    );
  }

  const rewriter = new HTMLRewriter().on("script", {
    element(element) {
      if (!element.hasAttribute("nonce")) {
        element.setAttribute("nonce", nonce);
      }
    },
  });

  return rewriter.transform(new Response(html)).text();
}

export function addScriptNonceToCsp(csp: string, nonce: string): string {
  const nonceToken = `'nonce-${nonce}'`;

  return csp.replace(SCRIPT_SRC_PATTERN, (match, sources: string) => {
    if (sources.includes(nonceToken)) {
      return match;
    }

    const withoutScriptNonce = sources
      .replace(EXISTING_NONCE_TOKEN_PATTERN, " ")
      .replace(WHITESPACE_PATTERN, " ")
      .trim();
    return `script-src ${withoutScriptNonce} ${nonceToken}`;
  });
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

  return new Response(await injectScriptNonces(html, nonce), {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
