import { utcWeek, utcMonth, utcYear } from "d3-time";
import type { ChartRange, Point } from "../types/chart";

export const CHART_RANGES = ["1W", "2W", "1M", "6M", "1Y", "All"] as const;

export const MIN_LINE_POINTS = 2;

export const MIN_RANGE_POINTS = 4;

export const NO_DATA: Point[] = [];

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
