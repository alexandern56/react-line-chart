import { utcMonth, utcWeek, utcYear } from "d3-time";
import { bisectX } from "./domain";
import type { Point } from "./types";

export const CHART_RANGES = ["1W", "2W", "1M", "6M", "1Y", "All"] as const;

export type ChartRange = (typeof CHART_RANGES)[number];

export type DataStatus = "loading" | "empty" | "notEnough";

export const MIN_LINE_POINTS = 2;

export const MIN_RANGE_POINTS = 4;

export const RANGE_START: Record<
  Exclude<ChartRange, "All">,
  (end: Date) => Date
> = {
  "1W": (end: Date) => utcWeek.offset(end, -1),
  "2W": (end: Date) => utcWeek.offset(end, -2),
  "1M": (end: Date) => utcMonth.offset(end, -1),
  "6M": (end: Date) => utcMonth.offset(end, -6),
  "1Y": (end: Date) => utcYear.offset(end, -1),
};

export function getDataStatus(data: Point[] | undefined): DataStatus | null {
  if (data === undefined) return "loading";
  if (data.length === 0) return "empty";
  if (data.length < MIN_LINE_POINTS) return "notEnough";
  return null;
}

export function getRangeDomain(
  range: ChartRange,
  data: Point[],
): [number, number] {
  if (data.length === 0) return [0, 0];
  const first = data[0].x;
  const last = data[data.length - 1].x;
  if (range === "All") return [first, last];
  return [RANGE_START[range](new Date(last)).getTime(), last];
}

export function isRangeAvailable(range: ChartRange, data: Point[]) {
  if (range === "All") return data.length >= MIN_LINE_POINTS;
  if (data.length === 0) return false;
  const [start, end] = getRangeDomain(range, data);
  if (start < data[0].x) return false;
  return (
    bisectX.right(data, end) - bisectX.left(data, start) >= MIN_RANGE_POINTS
  );
}
