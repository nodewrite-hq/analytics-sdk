import { Link, NavGroup, useTranslation } from "@payloadcms/ui";
import { usePathname } from "next/navigation.js";
import { analyticsLabel, type TranslateText } from "./translations.js";

/** Payload's own nav classes, so the link looks and highlights like the collection links. */
const NAV_LINK_CLASS = "nav__link";
const NAV_LINK_ID = "nav-analytics";

export interface AnalyticsNavLinkProps {
  /** The analytics view under the app's admin route; the plugin sets it. */
  href: string;
}

export function AnalyticsNavLink({ href }: AnalyticsNavLinkProps) {
  const { t } = useTranslation();
  const pathname = usePathname();
  const translate = t as TranslateText;
  const isActive = pathname === href || pathname.startsWith(`${href}/`);
  const label = (
    <>
      {isActive ? <div className="nav__link-indicator" /> : null}
      <span className="nav__link-label">{analyticsLabel(translate, "navLabel")}</span>
    </>
  );

  return (
    <NavGroup label={analyticsLabel(translate, "navGroup")}>
      {pathname === href ? (
        <div className={NAV_LINK_CLASS} id={NAV_LINK_ID}>
          {label}
        </div>
      ) : (
        <Link className={NAV_LINK_CLASS} href={href} id={NAV_LINK_ID} prefetch={false}>
          {label}
        </Link>
      )}
    </NavGroup>
  );
}
