import { type Point } from "./types/chart";

const START = Date.UTC(2026, 0, 1);
const STEP_MS = 60 * 60 * 1000;

export function generateData(count: number): Point[] {
  const data: Point[] = [];
  let y = 100;

  for (let i = 0; i < count; i++) {
    y = Math.max(0, y + (Math.random() - 0.5) * 10);
    data.push({ x: START + i * STEP_MS, y });
  }

  return data;
}
