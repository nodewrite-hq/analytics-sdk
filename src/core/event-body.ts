export type AnalyticsEventBody =
  | { type: "view"; path: string; locale: string | null; sessionId: string | null }
  | { type: "duration"; id: string; durationSeconds: number }
  | {
      type: "click";
      path: string;
      locale: string | null;
      sessionId: string | null;
      eventName: string;
    };
