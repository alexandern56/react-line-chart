import type { ChartRange, Point } from "../types/chart";
import { RANGE_MIN_POINTS } from "../constants/chart";

export const isRangeAvailable = (r: ChartRange, data: Point[]) =>
  data.length >= RANGE_MIN_POINTS[r];
