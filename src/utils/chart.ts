import type { ChartRange, Point } from "../types/chart";
import { RANGE_START, MIN_DATA_POINTS } from "../constants/chart";

export function isRangeAvailable(range: ChartRange, data: Point[]) {
  if (data.length < MIN_DATA_POINTS) return false;
  const [start] = getRangeDomain(range, data);
  return start >= data[0].x;
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
