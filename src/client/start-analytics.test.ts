import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AnalyticsClientConfig } from "../core/options.js";
import { recordNamedClick } from "./record-named-click.js";
import { startAnalytics } from "./start-analytics.js";

const ENDPOINT = "https://analytics.test/events";

function clientConfig(overrides: Partial<AnalyticsClientConfig> = {}): AnalyticsClientConfig {
  return {
    endpoint: ENDPOINT,
    enabled: true,
    locale: "en",
    sessions: false,
    clicks: false,
    ...overrides,
  };
}

function clearSessionCookie(): void {
  document.cookie = "analytics_session=; Path=/; Max-Age=0";
}

async function flush(): Promise<void> {
  await new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}

interface RequestInitLike {
  body?: BodyInit | null;
  method?: string;
}

function requestBody(init: RequestInitLike | undefined): unknown {
  const body = init?.body;
  if (typeof body !== "string") return null;
  return JSON.parse(body) as unknown;
}

function clickSelector(selector: string): void {
  const element = document.querySelector(selector);
  if (!(element instanceof HTMLElement)) {
    throw new Error(`No element for ${selector}`);
  }
  element.click();
}

function mockSendBeacon(): ReturnType<typeof vi.spyOn> {
  if (typeof navigator.sendBeacon !== "function") {
    navigator.sendBeacon = () => true;
  }
  return vi.spyOn(navigator, "sendBeacon").mockImplementation(() => true);
}

describe("startAnalytics", () => {
  const fetchMock = vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<{ json: () => Promise<unknown> }>>();
  let sendBeaconMock: ReturnType<typeof mockSendBeacon>;

  beforeEach(async () => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    startAnalytics(clientConfig({ enabled: false }));
    await flush();
    document.body.innerHTML = "";
    clearSessionCookie();
    history.replaceState(null, "", "/");

    fetchMock.mockReset();
    fetchMock.mockImplementation(async () => ({
      json: async () => ({ id: "view-1" }),
    }));
    vi.stubGlobal("fetch", fetchMock);

    sendBeaconMock = mockSendBeacon();
  });

  it("registers no listeners and fetches nothing when enabled is false", () => {
    const documentAdd = vi.spyOn(document, "addEventListener");
    const windowAdd = vi.spyOn(window, "addEventListener");
    const pushState = history.pushState;

    startAnalytics(
      clientConfig({
        enabled: false,
        sessions: true,
        clicks: true,
      }),
    );

    expect(documentAdd).not.toHaveBeenCalled();
    expect(windowAdd).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(sendBeaconMock).not.toHaveBeenCalled();
    expect(document.cookie).not.toContain("analytics_session");
    expect(history.pushState).toBe(pushState);
  });

  it("sends a view on load and a duration with the returned id on pagehide", async () => {
    let now = 1_700_000_000_000;
    vi.spyOn(Date, "now").mockImplementation(() => now);
    history.replaceState(null, "", "/?utm=newsletter");

    startAnalytics(clientConfig());
    await flush();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const viewCall = fetchMock.mock.calls[0];
    expect(viewCall?.[0]).toBe(ENDPOINT);
    expect(viewCall?.[1]?.method).toBe("POST");
    expect(requestBody(viewCall?.[1])).toEqual({
      type: "view",
      path: "/",
      locale: "en",
      sessionId: null,
    });

    now += 4_000;
    window.dispatchEvent(new Event("pagehide"));

    expect(sendBeaconMock).toHaveBeenCalledTimes(1);
    const beaconCall = sendBeaconMock.mock.calls[0];
    expect(beaconCall?.[0]).toBe(ENDPOINT);
    const payload = beaconCall?.[1];
    expect(payload).toBeInstanceOf(Blob);
    expect(JSON.parse(await (payload as Blob).text())).toEqual({
      type: "duration",
      id: "view-1",
      durationSeconds: 4,
    });
  });

  it("sends a second view when pushState moves to a new path", async () => {
    let now = 1_700_000_000_000;
    vi.spyOn(Date, "now").mockImplementation(() => now);
    fetchMock.mockImplementation(async (_input, init) => {
      const body = requestBody(init);
      const path = typeof body === "object" && body !== null && "path" in body ? body.path : null;
      const id = path === "/pricing" ? "view-2" : "view-1";
      return { json: async () => ({ id }) };
    });

    startAnalytics(clientConfig());
    await flush();

    now += 2_000_000;
    history.pushState({}, "", "/pricing?plan=pro");
    await flush();

    const bodies = fetchMock.mock.calls.map((call) => requestBody(call[1]));
    expect(bodies).toEqual([
      { type: "view", path: "/", locale: "en", sessionId: null },
      { type: "duration", id: "view-1", durationSeconds: 1800 },
      { type: "view", path: "/pricing", locale: "en", sessionId: null },
    ]);
  });

  it("ignores data-analytics when clicks are off and sends only that name when clicks are on", async () => {
    document.body.innerHTML = `
      <button data-analytics="cta_clicked"><span>Go</span></button>
      <button data-analytics="CTA-clicked">Bad</button>
      <p id="plain">Plain</p>
    `;

    startAnalytics(clientConfig({ clicks: false }));
    await flush();
    fetchMock.mockClear();

    clickSelector("span");
    clickSelector("#plain");
    await flush();
    expect(fetchMock).not.toHaveBeenCalled();

    startAnalytics(clientConfig({ clicks: true }));
    await flush();
    fetchMock.mockClear();

    clickSelector("span");
    clickSelector("[data-analytics='CTA-clicked']");
    clickSelector("#plain");
    await flush();

    const bodies = fetchMock.mock.calls.map((call) => requestBody(call[1]));
    expect(bodies).toEqual([
      {
        type: "click",
        path: "/",
        locale: "en",
        sessionId: null,
        eventName: "cta_clicked",
      },
    ]);
  });

  it("sends a click from recordNamedClick when clicks are on, and nothing when they are off", async () => {
    recordNamedClick("cta_clicked");
    await flush();
    expect(fetchMock).not.toHaveBeenCalled();

    startAnalytics(clientConfig({ clicks: true, sessions: false }));
    await flush();
    fetchMock.mockClear();

    recordNamedClick("cta_clicked");
    recordNamedClick("Not Valid");
    await flush();

    expect(fetchMock.mock.calls.map((call) => requestBody(call[1]))).toEqual([
      {
        type: "click",
        path: "/",
        locale: "en",
        sessionId: null,
        eventName: "cta_clicked",
      },
    ]);

    startAnalytics(clientConfig({ clicks: false }));
    await flush();
    fetchMock.mockClear();

    recordNamedClick("cta_clicked");
    await flush();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("writes analytics_session when sessions are on and leaves the cookie unset when they are off", async () => {
    const setCookie = vi.spyOn(Document.prototype, "cookie", "set");

    startAnalytics(clientConfig({ sessions: true, locale: undefined }));
    await flush();

    const writes = setCookie.mock.calls.map((call) => String(call[0]));
    const sessionWrite = writes.find((value) => value.startsWith("analytics_session="));
    expect(sessionWrite).toBeDefined();
    expect(sessionWrite).toContain("SameSite=Lax");
    expect(sessionWrite).toContain("Path=/");
    expect(sessionWrite).toContain("Max-Age=31536000");
    expect(sessionWrite).not.toContain("HttpOnly");

    const stored = document.cookie.match(/(?:^|; )analytics_session=([^;]+)/);
    expect(stored?.[1]).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );

    const view = requestBody(fetchMock.mock.calls[0]?.[1]);
    expect(view).toMatchObject({
      type: "view",
      path: "/",
      locale: null,
      sessionId: stored?.[1],
    });

    setCookie.mockRestore();
    clearSessionCookie();
    fetchMock.mockClear();

    startAnalytics(clientConfig({ sessions: false }));
    await flush();

    expect(document.cookie).not.toContain("analytics_session");
    expect(requestBody(fetchMock.mock.calls[0]?.[1])).toMatchObject({
      type: "view",
      sessionId: null,
    });
  });
});
