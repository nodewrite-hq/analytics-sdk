import { ReactSelect, type ReactSelectOption } from "@payloadcms/ui";
import { useRouter } from "next/navigation.js";

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
              if (href) router.push(href);
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
