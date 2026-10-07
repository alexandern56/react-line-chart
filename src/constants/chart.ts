import type { ChartRange } from "../types/chart";

export const CHART_RANGES = ["1W", "2W", "1M", "6M", "1Y", "All"] as const;

export const MIN_DATA_POINTS = 4;

const DAY_MS = 24 * 60 * 60 * 1000;
export const RANGE_DURATION_MS: Record<ChartRange, number> = {
  "1W": 7 * DAY_MS,
  "2W": 14 * DAY_MS,
  "1M": 30 * DAY_MS,
  "6M": 180 * DAY_MS,
  "1Y": 365 * DAY_MS,
  All: 0,
};
