const WIDTH = 720;
const HEIGHT = 220;
const PAD_LEFT = 40;
const PAD_RIGHT = 12;
const PAD_TOP = 12;
const PAD_BOTTOM = 28;
const GRID_LINES = 4;
const MAX_AXIS_LABELS = 8;

export interface ViewsChartPoint {
  label: string;
  views: number;
  /** The point's hover text, already worded and formatted. */
  title: string;
}

export interface ViewsChartProps {
  points: ViewsChartPoint[];
  formatNumber: (value: number) => string;
  /** Read out instead of the drawing. */
  description: string;
}

/** A line of views over time, drawn on the server in Payload's theme colors. */
export function ViewsChart({ points, formatNumber, description }: ViewsChartProps) {
  const top = niceCeiling(Math.max(0, ...points.map((point) => point.views)));
  const plotWidth = WIDTH - PAD_LEFT - PAD_RIGHT;
  const plotHeight = HEIGHT - PAD_TOP - PAD_BOTTOM;
  const step = points.length > 1 ? plotWidth / (points.length - 1) : 0;
  const x = (index: number) => PAD_LEFT + (points.length > 1 ? index * step : plotWidth / 2);
  const y = (views: number) => PAD_TOP + plotHeight - (views / top) * plotHeight;
  const line = points.map((point, index) => `${index === 0 ? "M" : "L"}${x(index)},${y(point.views)}`).join(" ");
  const area = `${line} L${x(points.length - 1)},${PAD_TOP + plotHeight} L${x(0)},${PAD_TOP + plotHeight} Z`;
  const labelEvery = Math.max(1, Math.ceil(points.length / MAX_AXIS_LABELS));

  return (
    <svg className="nwa-chart" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={description}>
      {gridValues(top).map((value) => (
        <g key={value}>
          <line className="nwa-chart__grid" x1={PAD_LEFT} x2={WIDTH - PAD_RIGHT} y1={y(value)} y2={y(value)} />
          <text className="nwa-chart__axis" x={PAD_LEFT - 8} y={y(value)} dy="0.32em" textAnchor="end">
            {formatNumber(value)}
          </text>
        </g>
      ))}
      {points.length > 0 ? <path className="nwa-chart__area" d={area} /> : null}
      {points.length > 0 ? <path className="nwa-chart__line" d={line} /> : null}
      {points.map((point, index) => (
        <g key={`${point.label}-${index}`}>
          <circle className="nwa-chart__point" cx={x(index)} cy={y(point.views)} r={points.length > 31 ? 2 : 3.5}>
            <title>{point.title}</title>
          </circle>
          {index % labelEvery === 0 ? (
            <text className="nwa-chart__axis" x={x(index)} y={HEIGHT - 8} textAnchor="middle">
              {point.label}
            </text>
          ) : null}
        </g>
      ))}
    </svg>
  );
}

/** 1, 2 or 5 times a power of ten, at least the largest value, so the grid reads in round steps. */
function niceCeiling(value: number): number {
  if (value <= GRID_LINES) return GRID_LINES;
  const magnitude = 10 ** Math.floor(Math.log10(value / GRID_LINES));
  for (const factor of [1, 2, 5, 10]) {
    const ceiling = factor * magnitude * GRID_LINES;
    if (ceiling >= value) return ceiling;
  }
  return value;
}

function gridValues(top: number): number[] {
  return Array.from({ length: GRID_LINES + 1 }, (_, index) => (top / GRID_LINES) * index);
}
