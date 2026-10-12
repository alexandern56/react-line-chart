import type { ScaleTime } from "d3-scale";
import {
  unixDay,
  utcDay,
  utcMonth,
  utcWeek,
  utcYear,
  type TimeInterval,
} from "d3-time";

const DAY = 24 * 60 * 60 * 1000;

export const X_LABEL_GAP = 24;

const STEPS: [TimeInterval, number][] = [
  [utcDay, DAY],
  [unixDay.every(2)!, 2 * DAY],
  [unixDay.every(3)!, 3 * DAY],
  [utcWeek, 7 * DAY],
  [utcWeek.every(2)!, 14 * DAY],
  [utcMonth, 31 * DAY],
  [utcMonth.every(2)!, 62 * DAY],
  [utcMonth.every(3)!, 92 * DAY],
  [utcMonth.every(6)!, 184 * DAY],
  ...[1, 2, 5, 10, 20, 50, 100].map((years): [TimeInterval, number] => [
    utcYear.every(years)!,
    years * 366 * DAY,
  ]),
];

let measureContext: CanvasRenderingContext2D | null = null;

export function measureText(text: string, font: string) {
  measureContext ??= document.createElement("canvas").getContext("2d")!;
  measureContext.font = font;
  return measureContext.measureText(text).width;
}

export function getXTicks(
  scale: ScaleTime<number, number>,
  labelWidth: (tick: Date) => number,
  [left, right]: [number, number],
  dataStep: number,
): Date[] {
  const [start, end] = scale.domain();
  const maxLabels = (right - left) / X_LABEL_GAP;

  return STEPS.filter(
    ([, step]) =>
      step >= dataStep && (end.getTime() - start.getTime()) / step <= maxLabels,
  )
    .map(([interval]) =>
      fitLabels(scale.ticks(interval), scale, labelWidth, left, right),
    )
    .reduce((best, ticks) => (ticks.length > best.length ? ticks : best), []);
}

function fitLabels(
  ticks: Date[],
  scale: ScaleTime<number, number>,
  labelWidth: (tick: Date) => number,
  left: number,
  right: number,
): Date[] {
  const labels = ticks
    .map((tick) => {
      const x = scale(tick);
      const half = labelWidth(tick) / 2;
      return { tick, start: x - half, end: x + half };
    })
    .filter(({ start, end }) => start >= left && end <= right);
  return labels.every(
    (label, i) => i === 0 || label.start - labels[i - 1].end >= X_LABEL_GAP,
  )
    ? labels.map(({ tick }) => tick)
    : [];
}
