import { hasFlag } from "country-flag-icons";
import * as flags from "country-flag-icons/string/3x2";

const FLAG_SVGS = flags as unknown as Record<string, string>;

export interface CountryFlagProps {
  code: string;
}

/**
 * An SVG flag, not an emoji: Windows shows flag emoji as two letters. Decorative, since the
 * country's name sits next to it.
 */
export function CountryFlag({ code }: CountryFlagProps) {
  const svg = hasFlag(code) ? FLAG_SVGS[code] : undefined;
  if (!svg) return <span className="nwa-flag nwa-flag--none" aria-hidden="true" />;
  return (
    <img
      className="nwa-flag"
      src={`data:image/svg+xml;utf8,${encodeURIComponent(svg)}`}
      alt=""
      width={21}
      height={14}
    />
  );
}
