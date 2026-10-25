const COOKIE_NAME = "analytics_session";
const ONE_YEAR_SECONDS = 31536000;

/**
 * Reads the first-party visitor id. The value is a random UUID, not an auth token,
 * so the cookie stays readable by this script and is never HttpOnly.
 */
export function readSessionId(): string | null {
  const cookies = document.cookie ? document.cookie.split(";") : [];
  for (const cookie of cookies) {
    const separator = cookie.indexOf("=");
    if (separator === -1) continue;
    const name = cookie.slice(0, separator).trim();
    if (name !== COOKIE_NAME) continue;
    return decodeCookieValue(cookie.slice(separator + 1).trim());
  }
  return null;
}

/** Returns the existing visitor id, or creates one that lasts one year. */
export function ensureSessionId(): string {
  const existing = readSessionId();
  if (existing !== null) return existing;

  const id = crypto.randomUUID();
  document.cookie = `${COOKIE_NAME}=${id}; SameSite=Lax; Path=/; Max-Age=${ONE_YEAR_SECONDS}`;
  return id;
}

function decodeCookieValue(value: string): string | null {
  if (value.length === 0) return null;
  try {
    const decoded = decodeURIComponent(value);
    return decoded.length > 0 ? decoded : null;
  } catch {
    return null;
  }
}
