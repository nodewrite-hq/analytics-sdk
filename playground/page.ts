import { startAnalytics } from "@nodewrite/analytics-sdk/client";

startAnalytics({
  endpoint: "/analytics/events",
  enabled: true,
  sessions: true,
  clicks: true,
});
