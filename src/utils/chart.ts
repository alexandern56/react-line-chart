import { bisector, extent, nice } from "d3-array";
import type { ChartRange, DataStatus, Point } from "../types/chart";
import {
  MIN_LINE_POINTS,
  MIN_RANGE_POINTS,
  RANGE_START,
} from "../constants/chart";

const bisectX = bisector<Point, number>((d) => d.x);

export function sliceByDomain(data: Point[], xMin: number, xMax: number) {
  const start = Math.max(0, bisectX.left(data, xMin) - 1);
  const end = Math.min(data.length, bisectX.right(data, xMax) + 1);
  return data.slice(start, end);
}

export function getDataStatus(data: Point[] | undefined): DataStatus | null {
  if (data === undefined) return "loading";
  if (data.length === 0) return "empty";
  if (data.length < MIN_LINE_POINTS) return "notEnough";
  return null;
}

export function getYDomain(
  points: Point[],
  tickCount: number,
): [number, number] {
  const [lo = 0, hi = 0] = extent(points, (d) => d.y);
  if (lo === hi) {
    const edge = 2 * lo || 1;
    return nice(Math.min(0, edge), Math.max(0, edge), tickCount);
  }
  const pad = (hi - lo) * 0.15;
  return nice(
    lo >= 0 ? Math.max(0, lo - pad) : lo - pad,
    hi <= 0 ? Math.min(0, hi + pad) : hi + pad,
    tickCount,
  );
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
