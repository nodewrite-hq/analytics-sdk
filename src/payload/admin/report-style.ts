/**
 * Built only from Payload's theme variables, so the report follows the host's admin skin and its
 * light and dark themes without styles of its own.
 */
export const REPORT_STYLE = `
.nwa-report {
  display: grid;
  gap: calc(var(--base) * 1.2);
  padding-block: calc(var(--base) * 1.5) calc(var(--base) * 3);
}
.nwa-header {
  display: flex;
  flex-wrap: wrap;
  gap: var(--base);
  align-items: flex-end;
  justify-content: space-between;
}
.nwa-header h1 {
  margin: 0;
}
.nwa-filters {
  display: flex;
  flex-wrap: wrap;
  gap: calc(var(--base) * 0.6);
}
.nwa-filter {
  display: grid;
  gap: calc(var(--base) * 0.25);
  min-width: 12rem;
}
.nwa-filter__label {
  color: var(--theme-elevation-500);
  font-size: 0.8125rem;
}
.nwa-chips {
  display: flex;
  flex-wrap: wrap;
  gap: calc(var(--base) * 0.4);
}
.nwa-chip {
  display: inline-flex;
  gap: calc(var(--base) * 0.4);
  align-items: center;
  padding: calc(var(--base) * 0.2) calc(var(--base) * 0.6);
  border-radius: var(--style-radius-l);
  background: var(--theme-elevation-100);
}
.nwa-chip a {
  color: var(--theme-elevation-800);
}
.nwa-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr));
  gap: calc(var(--base) * 0.8);
}
.nwa-card {
  min-width: 0;
  padding: var(--base);
  border: 1px solid var(--theme-elevation-100);
  border-radius: var(--style-radius-m);
  background: var(--theme-elevation-0);
}
.nwa-card h2 {
  margin: 0 0 calc(var(--base) * 0.6);
  font-size: 1rem;
}
.nwa-stat dt {
  color: var(--theme-elevation-500);
  font-size: 0.8125rem;
}
.nwa-stat dd {
  margin: calc(var(--base) * 0.25) 0 0;
  font-size: 1.75rem;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}
.nwa-columns {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(20rem, 1fr));
  gap: calc(var(--base) * 0.8);
}
.nwa-chart {
  display: block;
  width: 100%;
  height: auto;
}
.nwa-chart__grid {
  stroke: var(--theme-elevation-100);
}
.nwa-chart__axis {
  fill: var(--theme-elevation-500);
  font-size: 11px;
}
.nwa-chart__line {
  fill: none;
  stroke: var(--theme-success-500);
  stroke-width: 2.5;
  stroke-linejoin: round;
  stroke-linecap: round;
}
.nwa-chart__area {
  fill: var(--theme-success-500);
  opacity: 0.12;
}
.nwa-chart__area,
.nwa-chart__line,
.nwa-chart__guide {
  pointer-events: none;
}
.nwa-chart__day-hit {
  fill: transparent;
  cursor: crosshair;
}
.nwa-chart__guide {
  stroke: var(--theme-elevation-250);
  stroke-dasharray: 3 3;
  opacity: 0;
}
.nwa-chart__point {
  fill: var(--theme-elevation-0);
  stroke: var(--theme-success-500);
  stroke-width: 2;
}
.nwa-chart__day:hover .nwa-chart__guide,
.nwa-chart__day:focus-within .nwa-chart__guide {
  opacity: 1;
}
.nwa-chart__day:hover .nwa-chart__point,
.nwa-chart__day:focus-within .nwa-chart__point {
  fill: var(--theme-success-500);
}
.nwa-chart__tip {
  opacity: 0;
  pointer-events: none;
}
.nwa-chart__day:hover .nwa-chart__tip,
.nwa-chart__day:focus-within .nwa-chart__tip {
  opacity: 1;
  pointer-events: auto;
}
.nwa-chart__tip-bg {
  fill: var(--theme-elevation-0);
  stroke: var(--theme-elevation-200);
}
.nwa-chart__tip-day {
  fill: var(--theme-elevation-500);
  font-size: 11px;
}
.nwa-chart__tip-count {
  fill: var(--theme-elevation-800);
  font-size: 13px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}
.nwa-table {
  width: 100%;
  border-collapse: collapse;
  font-variant-numeric: tabular-nums;
}
.nwa-table th {
  padding: calc(var(--base) * 0.3) calc(var(--base) * 0.4);
  color: var(--theme-elevation-500);
  font-size: 0.8125rem;
  font-weight: 400;
  text-align: start;
}
.nwa-table td {
  padding: calc(var(--base) * 0.4);
  border-top: 1px solid var(--theme-elevation-100);
}
.nwa-table .nwa-number {
  text-align: end;
  white-space: nowrap;
}
.nwa-bar {
  position: relative;
}
.nwa-bar::before {
  content: "";
  position: absolute;
  inset: 3px auto 3px 0;
  width: calc(var(--nwa-share) * 100%);
  border-radius: var(--style-radius-s);
  background: var(--theme-success-500);
  opacity: 0.14;
}
.nwa-bar > * {
  position: relative;
}
.nwa-name {
  display: inline-flex;
  gap: calc(var(--base) * 0.5);
  align-items: center;
  max-width: 100%;
  overflow-wrap: anywhere;
  color: var(--theme-elevation-800);
  text-decoration: none;
}
a.nwa-name:hover {
  text-decoration: underline;
}
.nwa-flag {
  flex: none;
  width: 21px;
  height: 14px;
  border-radius: 2px;
  box-shadow: 0 0 0 1px var(--theme-elevation-100);
}
.nwa-flag--none {
  display: inline-block;
  background: var(--theme-elevation-100);
}
.nwa-more {
  display: inline-block;
  margin-top: calc(var(--base) * 0.6);
  color: var(--theme-elevation-800);
}
.nwa-empty {
  margin: 0;
  color: var(--theme-elevation-500);
}
`;
