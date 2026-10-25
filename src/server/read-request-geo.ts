export interface RequestGeo {
  country: string | null;
  city: string | null;
}

/** Reads `country` and `city` from the request object the app passed in. */
export function readRequestGeo(request: object): RequestGeo {
  const fields = request as { country?: unknown; city?: unknown };
  return {
    country: textField(fields.country),
    city: textField(fields.city),
  };
}

function textField(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}
