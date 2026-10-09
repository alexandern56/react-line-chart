import { LineGraphApi } from "./LineGraphApi";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import type { Point, ChartRange } from "../types/chart";
import { CHART_RANGES } from "../constants/chart";
import { getRangeDomain, isRangeAvailable } from "../utils/chart";

import { useId, useState } from "react";

export function LineChartApi({ data }: { data: Point[] }) {
  const uid = useId();
  const [preferredRange, setPreferredRange] = useState<ChartRange>("1M");
  const range = isRangeAvailable(preferredRange, data) ? preferredRange : "All";

  const xDomain = getRangeDomain(range, data);

  return (
    <Card className="pb-0">
      <CardHeader>
        <CardTitle>Line Chart - Interactive</CardTitle>
        <CardDescription>Showing values for the selected range</CardDescription>
        <CardAction>
          <fieldset className="inline-flex h-8 items-center rounded-lg bg-muted p-[3px] text-muted-foreground">
            <legend className="sr-only">Data range</legend>
            {CHART_RANGES.map((r) => (
              <label
                key={r}
                className="inline-flex h-full items-center justify-center rounded-md border border-transparent px-2 text-sm font-medium whitespace-nowrap text-foreground/60 transition-all hover:text-foreground has-checked:bg-background has-checked:text-foreground has-checked:shadow-sm has-focus-visible:border-ring has-focus-visible:ring-[3px] has-focus-visible:ring-ring/50 has-disabled:pointer-events-none has-disabled:opacity-50 dark:text-muted-foreground dark:hover:text-foreground dark:has-checked:border-input dark:has-checked:bg-input/30 dark:has-checked:text-foreground"
              >
                <input
                  disabled={!isRangeAvailable(r, data)}
                  name={`range-${uid}`}
                  checked={range === r}
                  type="radio"
                  className="sr-only"
                  onChange={() => setPreferredRange(r)}
                />
                {r}
              </label>
            ))}
          </fieldset>
        </CardAction>
      </CardHeader>
      <CardContent className="px-0">
        <LineGraphApi data={data} xDomain={xDomain}></LineGraphApi>
      </CardContent>
    </Card>
  );
}
