import { LineGraph } from "./LineGraph";
import type { Point, ChartRange } from "../types/chart";
import { CHART_RANGES } from "../constants/chart";
import { isRangeAvailable } from "../utils/chart";

import { useId, useState } from "react";

export function LineChart({ data }: { data: Point[] }) {
  const uid = useId();
  const [preferredRange, setPreferredRange] = useState<ChartRange>("1M");
  const range = isRangeAvailable(preferredRange, data) ? preferredRange : "All";

  return (
    <>
      <fieldset>
        <legend className="sr-only">Data range</legend>
        {CHART_RANGES.map((r) => (
          <label key={r}>
            {r}
            <input
              disabled={!isRangeAvailable(r, data)}
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
