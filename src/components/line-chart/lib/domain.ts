import { bisector, extent, nice } from "d3-array";
import type { Point } from "./types";

export const bisectX = bisector<Point, number>((d) => d.x);

export function sliceByDomain(data: Point[], xMin: number, xMax: number) {
  const start = Math.max(0, bisectX.left(data, xMin) - 1);
  const end = Math.min(data.length, bisectX.right(data, xMax) + 1);
  return data.slice(start, end);
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
