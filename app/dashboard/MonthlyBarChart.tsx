import type { MonthlyCount } from "@/lib/calendar";

type Props = {
  series: MonthlyCount[];
  currentMonth: string;
};

function monthShortLabel(month: string): string {
  const [year, monthIndex] = month.split("-").map(Number);
  const label = new Date(Date.UTC(year, monthIndex - 1, 1)).toLocaleDateString("es-CL", {
    timeZone: "UTC",
    month: "short",
    year: "2-digit",
  });
  return label.replace(".", "");
}

function barPath(x: number, y: number, width: number, height: number, radius: number): string {
  const r = Math.min(radius, width / 2, height);
  if (height <= 0) return "";
  return `M${x},${y + height} L${x},${y + r} Q${x},${y} ${x + r},${y} L${x + width - r},${y} Q${x + width},${y} ${x + width},${y + r} L${x + width},${y + height} Z`;
}

export function MonthlyBarChart({ series, currentMonth }: Props) {
  if (series.length === 0) return null;

  const barWidth = 32;
  const gap = 12;
  const plotHeight = 250;
  const topSpace = 30;
  const bottomSpace = 50;
  const leftPad = 20;
  const width = Math.max(900, leftPad * 2 + series.length * (barWidth + gap) - gap);
  const height = topSpace + plotHeight + bottomSpace;
  const maxCount = Math.max(1, ...series.map((s) => s.count));

  const busiest = series.reduce((best, s) => (s.count > best.count ? s : best), series[0]);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      style={{ display: "block", maxWidth: "100%", height: "auto", minHeight: "400px" }}
      role="img"
      aria-label="Citas por mes"
    >
      <line
        x1={leftPad}
        y1={topSpace + plotHeight}
        x2={width - leftPad}
        y2={topSpace + plotHeight}
        stroke="var(--border)"
        strokeWidth={1}
      />
      {series.map((s, i) => {
        const x = leftPad + i * (barWidth + gap);
        const barHeight = (s.count / maxCount) * plotHeight;
        const y = topSpace + plotHeight - barHeight;
        const isCurrent = s.month === currentMonth;
        const isBusiest = s.month === busiest.month && s.count > 0;
        return (
          <g key={s.month}>
            <title>
              {monthShortLabel(s.month)}: {s.count} citas
            </title>
            <path
              d={barPath(x, y, barWidth, barHeight, 4)}
              fill="var(--accent)"
              fillOpacity={isCurrent ? 1 : 0.35}
            />
            {(isCurrent || isBusiest) && s.count > 0 && (
              <text
                x={x + barWidth / 2}
                y={y - 6}
                textAnchor="middle"
                fontSize={10}
                fontWeight={600}
                fill="var(--text)"
              >
                {s.count}
              </text>
            )}
            <text
              x={x + barWidth / 2}
              y={topSpace + plotHeight + 14}
              textAnchor="end"
              fontSize={9}
              fill="var(--muted)"
              transform={`rotate(-40 ${x + barWidth / 2} ${topSpace + plotHeight + 14})`}
            >
              {monthShortLabel(s.month)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
