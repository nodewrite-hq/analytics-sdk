import type { AnalyticsEventKind } from "./event-kind.js";

export interface NewAnalyticsEvent {
  kind: AnalyticsEventKind;
  path: string;
  locale: string | null;
  durationSeconds: number | null;
  country: string | null;
  city: string | null;
  sessionId: string | null;
  eventName: string | null;
}

export interface StoredAnalyticsEvent extends NewAnalyticsEvent {
  id: string;
  occurredAt: string;
}
