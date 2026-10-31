export interface AnalyticsNavLinkProps {
  /** The analytics view under the app's admin route; the plugin sets it. */
  href: string;
}

export function AnalyticsNavLink({ href }: AnalyticsNavLinkProps) {
  return <a href={href}>Analytics</a>;
}
