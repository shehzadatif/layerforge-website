export function isSameOriginRequest(request: Request): boolean {
  const requestUrl = new URL(request.url);

  const origin = request.headers.get("origin");

  if (origin) {
    try {
      return new URL(origin).origin === requestUrl.origin;
    } catch {
      return false;
    }
  }

  const referer = request.headers.get("referer");

  if (referer) {
    try {
      return new URL(referer).origin === requestUrl.origin;
    } catch {
      return false;
    }
  }

  /*
   * Modern browsers normally send Origin or Referer for form POST requests.
   * Reject requests when neither header is available.
   */
  return false;
}