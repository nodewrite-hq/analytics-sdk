import { ReactSelect, type ReactSelectOption } from "@payloadcms/ui";
import { useRouter } from "next/navigation.js";
import { useEffect, useRef } from "react";

/** Waits this long after the last key before narrowing the list, so typing stays smooth. */
const SEARCH_DELAY_MS = 300;

/** A type alias, not an interface, so it fits Payload's index-signature `Option`. */
export type AnalyticsFilterOption = {
  value: string;
  label: string;
};

export interface AnalyticsFilter {
  /** The id ties the visible label to its dropdown. */
  id: string;
  label: string;
  options: AnalyticsFilterOption[];
  value: string;
  /** The report URL for each option's value, built on the server. */
  hrefs: Record<string, string>;
}

export interface AnalyticsFiltersProps {
  filters: AnalyticsFilter[];
}

/** Payload's own dropdowns. Choosing an option loads that report URL. */
export function AnalyticsFilters({ filters }: AnalyticsFiltersProps) {
  const router = useRouter();

  return (
    <div className="nwa-filters">
      {filters.map((filter) => (
        <div className="nwa-filter" key={filter.id}>
          <label className="nwa-filter__label" htmlFor={filter.id}>
            {filter.label}
          </label>
          <ReactSelect
            inputId={filter.id}
            isClearable={false}
            isSearchable={filter.options.length > 8}
            options={filter.options}
            value={filter.options.find((option) => option.value === filter.value)}
            onChange={(selected) => {
              const href = filter.hrefs[optionValue(selected)];
              if (href) router.push(href, { scroll: false });
            }}
          />
        </div>
      ))}
    </div>
  );
}

function optionValue(selected: ReactSelectOption | ReactSelectOption[]): string {
  const option = Array.isArray(selected) ? selected[0] : selected;
  return typeof option?.value === "string" ? option.value : "";
}

export interface AnalyticsPageSearchProps {
  id: string;
  label: string;
  /** The search in the URL now, if any. */
  value: string | null;
  /** The report URL without a search, on the list's first page. */
  baseHref: string;
  /** The query parameter the search goes in. */
  param: string;
}

/** Narrows the full page list as the editor types, in place and without a reload. */
export function AnalyticsPageSearch({ id, label, value, baseHref, param }: AnalyticsPageSearchProps) {
  const router = useRouter();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const search = (text: string) => {
    const url = new URL(baseHref, window.location.origin);
    const trimmed = text.trim();
    if (trimmed.length > 0) url.searchParams.set(param, trimmed);
    router.replace(`${url.pathname}${url.search}`, { scroll: false });
  };

  return (
    <form
      className="nwa-search"
      role="search"
      onSubmit={(event) => {
        event.preventDefault();
        if (timer.current) clearTimeout(timer.current);
        search(new FormData(event.currentTarget).get(param)?.toString() ?? "");
      }}
    >
      <label className="nwa-filter__label" htmlFor={id}>
        {label}
      </label>
      <input
        className="nwa-search__input"
        defaultValue={value ?? ""}
        id={id}
        name={param}
        type="search"
        onChange={(event) => {
          const text = event.currentTarget.value;
          if (timer.current) clearTimeout(timer.current);
          timer.current = setTimeout(() => search(text), SEARCH_DELAY_MS);
        }}
      />
    </form>
  );
}
