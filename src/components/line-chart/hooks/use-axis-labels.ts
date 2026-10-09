import { useLayoutEffect, useMemo, useRef, useState } from "react";
import type { ScaleTime } from "d3-scale";
import { Y_LABEL_X } from "../lib/constants";
import type { Formatters } from "../lib/types";
import { getXTicks, measureText } from "../lib/ticks";

interface AxisLabelsOptions extends Pick<
  Formatters,
  "formatXTick" | "formatYTick"
> {
  xScale: ScaleTime<number, number>;
  yTicks: number[];
  width: number;
  dataStep: number;
}

export function useAxisLabels({
  xScale,
  yTicks,
  width,
  dataStep,
  formatXTick,
  formatYTick,
}: AxisLabelsOptions) {
  const probeRef = useRef<SVGTextElement>(null);
  const [font, setFont] = useState<string | null>(null);

  useLayoutEffect(() => {
    const s = getComputedStyle(probeRef.current!);
    const font = `${s.fontStyle} ${s.fontWeight} ${s.fontSize} ${s.fontFamily}`;
    let active = true;
    document.fonts.load(font).then(() => {
      if (active) setFont(font);
    });
    return () => {
      active = false;
    };
  }, []);

  const xTicks = useMemo(() => {
    if (font === null) return [];
    const yLabelsRight =
      Y_LABEL_X +
      Math.max(...yTicks.map((tick) => measureText(formatYTick(tick), font)));
    const labelWidth = (tick: Date) => measureText(formatXTick(tick), font);
    const isVisible = (tick: Date) => {
      const x = xScale(tick);
      const halfLabel = labelWidth(tick) / 2;
      return x - halfLabel >= yLabelsRight && x + halfLabel <= width;
    };
    return getXTicks(xScale, width, labelWidth, isVisible, dataStep);
  }, [xScale, width, font, yTicks, dataStep, formatYTick, formatXTick]);

  return { probeRef, xTicks };
}
