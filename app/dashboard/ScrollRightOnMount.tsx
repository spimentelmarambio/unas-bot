"use client";

import { useEffect, useRef } from "react";

// The monthly bar chart renders every historical month in one wide SVG, so on
// mobile it opens scrolled to the oldest data instead of the recent months
// people actually care about. Scrolling to the end on mount fixes that
// without needing a JS-free CSS trick (RTL flip), which this app's browser
// target measures scrollWidth for unreliably.
export function ScrollRightOnMount({
  children,
  className,
  style,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, []);

  return (
    <div ref={ref} className={className} style={style}>
      {children}
    </div>
  );
}
