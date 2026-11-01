import NextLinkImport from "next/link.js";
import type { ReactNode } from "react";

// next/link is CommonJS: under NodeNext its default export arrives wrapped, as Payload's own Link handles it.
const Link = ("default" in NextLinkImport ? NextLinkImport.default : NextLinkImport) as typeof NextLinkImport.default;

interface ReportLinkProps {
  href: string;
  className?: string;
  children: ReactNode;
}

/**
 * A link to another state of the report. It loads in place, keeping the scroll position, instead
 * of reloading the admin. Not prefetched: a long page list would fetch every row's report.
 */
export function ReportLink({ href, className, children }: ReportLinkProps) {
  return (
    <Link className={className} href={href} prefetch={false} scroll={false}>
      {children}
    </Link>
  );
}
