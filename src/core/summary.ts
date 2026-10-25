import type { AnalyticsEventKind } from "./event-kind.js";

export interface AnalyticsSummaryQuery {
  from: string;
  to: string;
  country: string | null;
  path: string | null;
  sessionId: string | null;
}

export interface AnalyticsSummary {
  totalViews: number;
  averageDurationSeconds: number;
  byPath: {
    path: string;
    views: number;
    averageDurationSeconds: number;
  }[];
  byCountry?: {
    country: string;
    views: number;
  }[];
  byCity?: {
    city: string;
    views: number;
  }[];
  sessions?: {
    id: string;
    startedAt: string;
    pageCount: number;
  }[];
  events?: {
    id: string;
    kind: AnalyticsEventKind;
    path: string;
    occurredAt: string;
    eventName: string | null;
  }[];
  byEventName?: {
    eventName: string;
    count: number;
  }[];
}
