import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { readRequestGeo } from "./read-request-geo.js";

describe("readRequestGeo", () => {
  it("returns null when the request has no country or city", () => {
    expect(readRequestGeo({})).toEqual({ country: null, city: null });
    expect(readRequestGeo({ country: "  ", city: "" })).toEqual({ country: null, city: null });
    expect(readRequestGeo({ country: 49, city: null })).toEqual({ country: null, city: null });
  });

  it("reads country and city from the request", () => {
    expect(readRequestGeo({ country: "DE", city: " Berlin " })).toEqual({
      country: "DE",
      city: "Berlin",
    });
  });

  it("does not read headers", () => {
    const request = {
      headers: {
        "cf-ipcountry": "DE",
        "x-vercel-ip-country": "US",
        "cloudfront-viewer-country": "FR",
        "x-forwarded-for": "203.0.113.10",
      },
    };
    expect(readRequestGeo(request)).toEqual({ country: null, city: null });

    const source = readFileSync(new URL("./read-request-geo.ts", import.meta.url), "utf8");
    expect(source).not.toMatch(/vercel|cloudflare|cloudfront|cf-ip|x-amz|x-forwarded-for|x-real-ip/i);
  });
});
