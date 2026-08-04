const HOME_PRERENDER_PATH = "/prerender/home/";
const MAX_ASSET_REDIRECT_HOPS = 2;

export function isPrerenderHomePath(pathname: string): boolean {
  return pathname === "/prerender/home" || pathname === "/prerender/home/";
}

export function homePrerenderRequest(request: Request): Request {
  return new Request(new URL(HOME_PRERENDER_PATH, request.url), request);
}

export async function fetchAssetsFollowingRedirects(
  env: Env,
  request: Request,
  maxHops = MAX_ASSET_REDIRECT_HOPS,
): Promise<Response> {
  let current = request;
  let response = await env.ASSETS.fetch(current);
  let hops = 0;
  const origin = new URL(request.url).origin;

  while (hops < maxHops && response.status >= 300 && response.status < 400) {
    const location = response.headers.get("Location");
    if (!location) {
      break;
    }
    const nextUrl = new URL(location, current.url);
    if (nextUrl.origin !== origin) {
      break;
    }
    current = new Request(nextUrl, current);
    response = await env.ASSETS.fetch(current);
    hops += 1;
  }

  return response;
}
