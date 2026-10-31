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

/** Country and city for one request, as the host reports them. */
export interface RequestGeo {
  country: string | null;
  city: string | null;
}

/**
 * Reads the visitor's country and city from the request headers. The app supplies it, because
 * each host names its geo headers differently.
 */
export type ReadGeoFromHeaders = (headers: Headers) => RequestGeo;

export interface AnalyticsClientConfig {
  endpoint: string;
  enabled: boolean;
  locale?: string;
  sessions: boolean;
  clicks: boolean;
}
