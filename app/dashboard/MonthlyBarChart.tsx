"use client";

import { useEffect, useRef, useState } from "react";
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

// Picks a "nice" gridline step (1/2/5 x a power of ten) so the y-axis reads
// in round numbers instead of whatever the max count happens to be.
function niceStep(roughMax: number): number {
  const rough = roughMax / 4;
  const magnitude = Math.pow(10, Math.floor(Math.log10(rough || 1)));
  const residual = rough / magnitude;
  const step = residual >= 5 ? 5 : residual >= 2 ? 2 : 1;
  return step * magnitude;
}

export function MonthlyBarChart({ series, currentMonth }: Props) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // The chart opens scrolled to the most recent months instead of the
  // oldest, since that's what people actually check most often.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, []);

  if (series.length === 0) {
    return (
      <div style={{ textAlign: "center", color: "var(--muted)", padding: "2rem", fontSize: "0.9rem" }}>
        No hay datos de citas disponibles aún.
      </div>
    );
  }

  const barWidth = 32;
  const gap = 12;
  const plotHeight = 250;
  const topSpace = 30;
  const bottomSpace = 50;
  const barsLeftPad = 12;
  const rightPad = 20;
  const axisWidth = 32;
  const barsWidth = Math.max(860, barsLeftPad + rightPad + series.length * (barWidth + gap) - gap);
  const height = topSpace + plotHeight + bottomSpace;
  const maxCount = Math.max(1, ...series.map((s) => s.count));
  const step = niceStep(maxCount);
  const gridMax = Math.ceil(maxCount / step) * step;
  const gridValues: number[] = [];
  for (let v = 0; v <= gridMax; v += step) gridValues.push(v);

  const busiest = series.reduce((best, s) => (s.count > best.count ? s : best), series[0]);
  const hovered = hoveredIndex !== null ? series[hoveredIndex] : null;

  return (
    <div style={{ display: "flex" }}>
      {/* Fixed axis column - stays in place while the bars scroll */}
      <svg
        width={axisWidth}
        height={height}
        viewBox={`0 0 ${axisWidth} ${height}`}
        style={{ display: "block", flexShrink: 0 }}
        aria-hidden="true"
      >
        {gridValues.map((v) => {
          const y = topSpace + plotHeight - (v / gridMax) * plotHeight;
          return (
            <text key={v} x={axisWidth - 6} y={y + 3} textAnchor="end" fontSize={9} fill="var(--muted)">
              {v}
            </text>
          );
        })}
      </svg>
      <div ref={scrollRef} style={{ position: "relative", overflowX: "auto", flex: 1 }}>
        <svg
          viewBox={`0 0 ${barsWidth} ${height}`}
          width={barsWidth}
          style={{ display: "block", height: "auto", minHeight: "300px" }}
          role="img"
          aria-label="Citas por mes"
        >
          {gridValues.map((v) => {
            const y = topSpace + plotHeight - (v / gridMax) * plotHeight;
            return <line key={v} x1={0} y1={y} x2={barsWidth} y2={y} stroke="var(--border)" strokeWidth={1} />;
          })}
          {series.map((s, i) => {
            const x = barsLeftPad + i * (barWidth + gap);
            const barHeight = (s.count / gridMax) * plotHeight;
            const y = topSpace + plotHeight - barHeight;
            const isCurrent = s.month === currentMonth;
            const isBusiest = s.month === busiest.month && s.count > 0;
            const isHovered = hoveredIndex === i;
            return (
              <g
                key={s.month}
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
                onClick={() => setHoveredIndex(isHovered ? null : i)}
                style={{ cursor: "pointer" }}
              >
                <rect x={x - gap / 2} y={topSpace} width={barWidth + gap} height={plotHeight} fill="transparent" />
                <path
                  d={barPath(x, y, barWidth, barHeight, 4)}
                  fill="var(--accent)"
                  fillOpacity={isCurrent || isHovered ? 1 : isBusiest ? 0.6 : 0.35}
                />
                {(isCurrent || isBusiest || isHovered) && s.count > 0 && (
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
                  fontWeight={isCurrent ? 700 : 400}
                  fill={isCurrent ? "var(--text)" : "var(--muted)"}
                  transform={`rotate(-40 ${x + barWidth / 2} ${topSpace + plotHeight + 14})`}
                >
                  {monthShortLabel(s.month)}
                </text>
              </g>
            );
          })}
        </svg>
        {hovered && (
          <div
            style={{
              position: "absolute",
              // Anchored a few px from the top (not above it) - the
              // container's overflow-x:auto forces overflow-y to clip too
              // per the CSS overflow spec, so a tooltip positioned above
              // the box would be cut off.
              top: "6px",
              left: `${barsLeftPad + hoveredIndex! * (barWidth + gap) + barWidth / 2}px`,
              transform: "translate(-50%, 0)",
              background: "var(--text)",
              color: "var(--card)",
              padding: "0.3rem 0.6rem",
              borderRadius: "6px",
              fontSize: "0.75rem",
              fontWeight: 600,
              whiteSpace: "nowrap",
              pointerEvents: "none",
            }}
          >
            {monthShortLabel(hovered.month)}: {hovered.count} citas
          </div>
        )}
      </div>
    </div>
  );
}
