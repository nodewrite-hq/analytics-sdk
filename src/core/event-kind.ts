export const AnalyticsEventKind = {
  VIEW: "view",
  CLICK: "click",
} as const;

export type AnalyticsEventKind = (typeof AnalyticsEventKind)[keyof typeof AnalyticsEventKind];
