import { LineGraphLegacy } from "./LineGraphLegacy";
import type { Point, ChartRange } from "../types/chart";
import { CHART_RANGES } from "../constants/chart";
import { getRangeDomain, isRangeAvailable } from "../utils/chart";

import { useId, useState } from "react";

export function LineChartLegacy({ data }: { data: Point[] }) {
  const uid = useId();
  const [preferredRange, setPreferredRange] = useState<ChartRange>("1M");
  const range = isRangeAvailable(preferredRange, data) ? preferredRange : "All";

  const xDomain = getRangeDomain(range, data);

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
      <LineGraphLegacy data={data} xDomain={xDomain}></LineGraphLegacy>
    </>
  );
}
