import { useState } from "react";
import { NO_DATA } from "../lib/constants";
import type { Point } from "../lib/types";
import {
  getDataStatus,
  getRangeDomain,
  isRangeAvailable,
  type ChartRange,
} from "../lib/ranges";

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
