import { useLayoutEffect, useMemo, useRef, useState } from "react";
import type { ScaleTime } from "d3-scale";
import { Y_LABEL_X } from "../lib/constants";
import type { Formatters } from "../lib/types";
import { getXTicks, measureText } from "../lib/ticks";

interface AxisLabelsOptions extends Pick<Formatters, "formatXTick"> {
  xScale: ScaleTime<number, number>;
  width: number;
  dataStep: number;
}

export function useAxisLabels({
  xScale,
  width,
  dataStep,
  formatXTick,
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
    return getXTicks(
      xScale,
      (tick) => measureText(formatXTick(tick), font),
      [Y_LABEL_X, width],
      dataStep,
    );
  }, [xScale, width, font, dataStep, formatXTick]);

  return { probeRef, xTicks };
}
