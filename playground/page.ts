import { startAnalytics } from "@nodewrite-labs/analytics-sdk/client";

startAnalytics({
  endpoint: "/analytics/events",
  enabled: true,
  sessions: true,
  clicks: true,
});
