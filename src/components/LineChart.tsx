import { LineGraph } from "./LineGraph";
import type { Point, ChartRange } from "../types/chart";
import { CHART_RANGES, RANGE_MIN_POINTS } from "../constants/chart";

import { useId, useState } from "react";

export function LineChart({ data }: { data: Point[] }) {
  const isAvailable = (r: ChartRange) => data.length >= RANGE_MIN_POINTS[r];

  const uid = useId();
  const [preferredRange, setPreferredRange] = useState<ChartRange>("1M");
  const range = isAvailable(preferredRange) ? preferredRange : "All";

  return (
    <>
      <fieldset>
        <legend className="sr-only">Data range</legend>
        {CHART_RANGES.map((r) => (
          <label key={r}>
            {r}
            <input
              disabled={!isAvailable(r)}
              name={`range-${uid}`}
              checked={range === r}
              type="radio"
              onChange={() => setPreferredRange(r)}
            />
          </label>
        ))}
      </fieldset>
      <LineGraph data={data}></LineGraph>
    </>
  );
}
