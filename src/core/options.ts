export interface AnalyticsModules {
  country: boolean;
  city: boolean;
  sessions: boolean;
  clicks: boolean;
}

export interface AnalyticsServerOptions {
  enabled: boolean;
  modules: AnalyticsModules;
}

export interface AnalyticsClientConfig {
  endpoint: string;
  enabled: boolean;
  locale?: string;
  sessions: boolean;
  clicks: boolean;
}
