import type { ScaleTime } from "d3-scale";
import { utcWeek } from "d3-time";

const X_LABEL_GAP = 24;

let measureContext: CanvasRenderingContext2D | null = null;

export function measureText(text: string, font: string) {
  measureContext ??= document.createElement("canvas").getContext("2d")!;
  measureContext.font = font;
  return measureContext.measureText(text).width;
}

export function getXTicks(
  scale: ScaleTime<number, number>,
  width: number,
  labelWidth: (tick: Date) => number,
  isVisible: (tick: Date) => boolean,
  dataStep: number,
) {
  const fits = (ticks: Date[]) => {
    if (ticks.length < 2) return true;
    const gap =
      (scale(ticks[ticks.length - 1]) - scale(ticks[0])) / (ticks.length - 1);
    return gap >= Math.max(...ticks.map(labelWidth)) + X_LABEL_GAP;
  };

  const [start, end] = scale.domain();
  let lo = 1;
  const maxTicks = (end.getTime() - start.getTime()) / dataStep;
  let hi = Math.min(Math.floor(width / X_LABEL_GAP), Math.floor(maxTicks));
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (fits(scale.ticks(mid))) lo = mid;
    else hi = mid - 1;
  }
  const ticks = scale.ticks(lo).filter(isVisible);
  if (ticks.length > 0) return ticks;
  const biweekly = scale.ticks(utcWeek.every(2)!);
  return fits(biweekly) && biweekly.length <= maxTicks
    ? biweekly.filter(isVisible)
    : [];
}
