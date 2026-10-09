import { bisector } from "d3-array";
import { line, type CurveFactory } from "d3-shape";
import type { Point } from "../types/chart";

type Segment = [p0: Point, c1: Point, c2: Point, p1: Point];

const SOLVE_ITERATIONS = 20;

const bisectSegmentEnd = bisector<Segment, number>(([, , , p1]) => p1.x);

function cubic(a: number, b: number, c: number, d: number, t: number) {
  const mt = 1 - t;
  return (
    mt * mt * mt * a + 3 * mt * mt * t * b + 3 * mt * t * t * c + t * t * t * d
  );
}

export function getSegments(points: Point[], curve: CurveFactory): Segment[] {
  const segments: Segment[] = [];
  let start: Point = { x: 0, y: 0 };
  const context: Pick<
    CanvasRenderingContext2D,
    "moveTo" | "lineTo" | "bezierCurveTo" | "closePath"
  > = {
    moveTo(x, y) {
      start = { x, y };
    },
    lineTo(x, y) {
      const end = { x, y };
      segments.push([start, start, end, end]);
      start = end;
    },
    bezierCurveTo(c1x, c1y, c2x, c2y, x, y) {
      const end = { x, y };
      segments.push([start, { x: c1x, y: c1y }, { x: c2x, y: c2y }, end]);
      start = end;
    },
    closePath() {},
  };
  line<Point>(
    (d) => d.x,
    (d) => d.y,
  )
    .curve(curve)
    .context(context as CanvasRenderingContext2D)(points);
  return segments;
}

export function yAt(segments: Segment[], x: number) {
  if (segments.length === 0) return undefined;
  const i = Math.min(bisectSegmentEnd.left(segments, x), segments.length - 1);
  const [p0, c1, c2, p1] = segments[i];
  let lo = 0;
  let hi = 1;
  for (let k = 0; k < SOLVE_ITERATIONS; k++) {
    const t = (lo + hi) / 2;
    if (cubic(p0.x, c1.x, c2.x, p1.x, t) < x) lo = t;
    else hi = t;
  }
  return cubic(p0.y, c1.y, c2.y, p1.y, (lo + hi) / 2);
}
