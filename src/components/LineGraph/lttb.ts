import { type Point } from "./types";
export function lttb(points: Point[], threshold: number): Point[] {
  const n = points.length;
  if (threshold >= n || threshold < 3) return points.slice();

  const sampled = [points[0]];
  const bucketSize = (n - 2) / (threshold - 2);
  let a = 0;

  for (let i = 0; i < threshold - 2; i++) {
    const avgStart = Math.floor((i + 1) * bucketSize) + 1;
    const avgEnd = Math.min(Math.floor((i + 2) * bucketSize) + 1, n);
    let avgX = 0;
    let avgY = 0;
    for (let j = avgStart; j < avgEnd; j++) {
      avgX += points[j].x;
      avgY += points[j].y;
    }
    avgX /= avgEnd - avgStart;
    avgY /= avgEnd - avgStart;

    const rangeEnd = Math.floor((i + 1) * bucketSize) + 1;
    const { x: ax, y: ay } = points[a];
    let maxArea = -1;
    let next = Math.floor(i * bucketSize) + 1;

    for (let j = next; j < rangeEnd; j++) {
      const area = Math.abs(
        (ax - avgX) * (points[j].y - ay) - (ax - points[j].x) * (avgY - ay),
      );
      if (area > maxArea) {
        maxArea = area;
        next = j;
      }
    }

    sampled.push(points[next]);
    a = next;
  }

  sampled.push(points[n - 1]);
  return sampled;
}
