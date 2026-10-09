import { bisector } from "d3-array";
import type { ChartRange, DataStatus, Point } from "../types/chart";
import {
  MIN_LINE_POINTS,
  MIN_RANGE_POINTS,
  RANGE_START,
} from "../constants/chart";

const bisectX = bisector<Point, number>((d) => d.x);

export function getDataStatus(data: Point[] | undefined): DataStatus | null {
  if (data === undefined) return "loading";
  if (data.length === 0) return "empty";
  if (data.length < MIN_LINE_POINTS) return "notEnough";
  return null;
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
