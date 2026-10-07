import type { ChartRange, Point } from "../types/chart";
import { RANGE_DURATION_MS, MIN_DATA_POINTS } from "../constants/chart";

export function isRangeAvailable(range: ChartRange, data: Point[]) {
  if (data.length < MIN_DATA_POINTS) return false;
  const span = data[data.length - 1].x - data[0].x;
  return span >= RANGE_DURATION_MS[range];
}

export function getRangeDomain(
  range: ChartRange,
  data: Point[],
): [number, number] {
  const first = data[0].x;
  const last = data[data.length - 1].x;
  if (range === "All") return [first, last];
  return [last - RANGE_DURATION_MS[range], last];
}
