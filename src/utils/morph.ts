import { curveLinear, type CurveFactory } from "d3-shape";
import type { Point } from "../types/chart";
import { getSegments, yAt } from "./curve";

function lerpPoint(a: Point, b: Point, t: number): Point {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

function flattenPoints(points: Point[], baselineY: number): Point[] {
  return points.map((p) => ({ x: p.x, y: baselineY }));
}

function extendPoints(
  points: Point[],
  length: number,
  curve: CurveFactory,
): Point[] {
  const n = points.length;
  if (n === 1) return Array.from({ length }, () => points[0]);
  const segments = n - 1;
  const extra = length - n;
  const curveSegments = getSegments(points, curve);
  const result: Point[] = [];
  for (let s = 0; s < segments; s++) {
    const a = points[s];
    const b = points[s + 1];
    const count =
      Math.floor(((s + 1) * extra) / segments) -
      Math.floor((s * extra) / segments);
    result.push(a);
    for (let j = 1; j <= count; j++) {
      const x = a.x + (b.x - a.x) * (j / (count + 1));
      result.push({ x, y: yAt(curveSegments, x) ?? a.y });
    }
  }
  result.push(points[n - 1]);
  return result;
}

export function getMorphEndpoints(
  rendered: Point[],
  target: Point[],
  baselineY: number,
  curve: CurveFactory = curveLinear,
): { from: Point[]; to: Point[] } {
  if (rendered.length === 0) {
    return { from: flattenPoints(target, baselineY), to: target };
  }
  if (target.length === 0) {
    return { from: rendered, to: flattenPoints(rendered, baselineY) };
  }
  if (rendered.length < target.length) {
    return { from: extendPoints(rendered, target.length, curve), to: target };
  }
  return { from: rendered, to: extendPoints(target, rendered.length, curve) };
}

export function lerpPoints(from: Point[], to: Point[], t: number): Point[] {
  return to.map((b, i) => lerpPoint(from[i], b, t));
}
