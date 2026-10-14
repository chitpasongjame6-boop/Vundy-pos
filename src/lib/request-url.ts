/** Keep redirects on the browser's Host, not the container's bind address/port. */
export function getBrowserRequestUrl(request: { url: string; headers: Headers }): URL | null {
  const url = new URL(request.url);
  const host = request.headers.get("host");
  if (!host) return url;

  // A Host is an authority, not a URL. Never accept userinfo, paths or host lists.
  if (/[\s\\/?#@,]/.test(host)) return null;
  try {
    const authority = new URL(`${url.protocol}//${host}`);
    if (authority.username || authority.password || authority.pathname !== "/") return null;
    url.hostname = authority.hostname;
    url.port = authority.port;
    return url;
  } catch {
    return null;
  }
}

export function getLocalBrowserRedirect(url: URL): URL | null {
  if (url.hostname !== "0.0.0.0" && url.hostname !== "[::]") return null;
  const destination = new URL(url);
  destination.hostname = "localhost";
  return destination;
}
