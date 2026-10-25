import type { AnalyticsEventBody } from "../core/event-body.js";

const EVENT_NAME_PATTERN = /^[a-z0-9_]+$/;

export interface ActiveAnalyticsClient {
  locale: string | null;
  sessionId: string | null;
  clicks: boolean;
  send: (body: AnalyticsEventBody) => void;
}

let active: ActiveAnalyticsClient | null = null;

/** Called by `startAnalytics`. A null client makes `recordNamedClick` a no-op. */
export function bindAnalyticsClient(client: ActiveAnalyticsClient | null): void {
  active = client;
}

export function recordNamedClick(name: string): void {
  if (active === null || !active.clicks) return;
  if (!EVENT_NAME_PATTERN.test(name)) return;

  active.send({
    type: "click",
    path: location.pathname,
    locale: active.locale,
    sessionId: active.sessionId,
    eventName: name,
  });
}
