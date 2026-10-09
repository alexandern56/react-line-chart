import { LineGraphApi } from "./LineGraphApi";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "./ui/empty";
import type { Point, ChartRange } from "../types/chart";
import { CHART_RANGES, MIN_DATA_POINTS } from "../constants/chart";
import { getRangeDomain } from "../utils/chart";

import { bisector } from "d3-array";
import { ChartLine } from "lucide-react";
import { useId, useState } from "react";

const bisectX = bisector<Point, number>((d) => d.x);
const NO_DATA: Point[] = [];

const EMPTY_STATES = {
  empty: {
    title: "No data",
    description: "There is no data to display yet.",
  },
  notEnough: {
    title: "Not enough data",
    description: "There are not enough data points to draw the chart yet.",
  },
};

function isRangeAvailable(range: ChartRange, data: Point[]) {
  if (data.length === 0) return false;
  const [start, end] = getRangeDomain(range, data);
  if (start < data[0].x) return false;
  return (
    bisectX.right(data, end) - bisectX.left(data, start) >= MIN_DATA_POINTS
  );
}

export function LineChartApi({ data }: { data: Point[] }) {
  const uid = useId();
  const [preferredRange, setPreferredRange] = useState<ChartRange>("1M");
  const range = isRangeAvailable(preferredRange, data) ? preferredRange : "All";

  const xDomain = getRangeDomain(range, data);
  const hasEnoughData = data.length >= MIN_DATA_POINTS;
  const emptyState =
    data.length === 0 ? EMPTY_STATES.empty : EMPTY_STATES.notEnough;

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
      <CardContent className="relative px-0">
        <LineGraphApi
          data={hasEnoughData ? data : NO_DATA}
          xDomain={xDomain}
        ></LineGraphApi>
        {!hasEnoughData && (
          <Empty className="pointer-events-none absolute inset-0 animate-in duration-300 fade-in">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <ChartLine />
              </EmptyMedia>
              <EmptyTitle>{emptyState.title}</EmptyTitle>
              <EmptyDescription>{emptyState.description}</EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
      </CardContent>
    </Card>
  );
}
