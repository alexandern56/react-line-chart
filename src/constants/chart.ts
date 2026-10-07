import type { ChartRange } from "../types/chart";

export const CHART_RANGES = ["1W", "2W", "1M", "6M", "1Y", "All"] as const;

export const MIN_DATA_POINTS = 4;

export const RANGE_MIN_POINTS: Record<ChartRange, number> = {
  "1W": 8,
  "2W": 15,
  "1M": 31,
  "6M": 181,
  "1Y": 366,
  All: MIN_DATA_POINTS,
};
