import { useState } from "react";
import { NO_DATA } from "../constants/chart";
import type { ChartRange, Point } from "../types/chart";
import {
  getDataStatus,
  getRangeDomain,
  isRangeAvailable,
} from "../utils/chart";

export function useLineChart(
  data: Point[] | undefined,
  initialRange: ChartRange = "1M",
) {
  const [preferredRange, setRange] = useState(initialRange);
  const status = getDataStatus(data);
  const points = status === null && data ? data : NO_DATA;
  const range = isRangeAvailable(preferredRange, points)
    ? preferredRange
    : "All";

  return {
    status,
    points,
    range,
    setRange,
    xDomain: getRangeDomain(range, points),
    isRangeAvailable: (r: ChartRange) => isRangeAvailable(r, points),
  };
}
