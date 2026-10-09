import { LineGraph } from "./LineGraph";
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
import { Spinner } from "./ui/spinner";
import type { Point, ChartRange } from "../types/chart";
import { CHART_RANGES, MIN_DATA_POINTS } from "../constants/chart";
import { getRangeDomain } from "../utils/chart";

import { bisector } from "d3-array";
import { ChartLine } from "lucide-react";
import { useId, useState } from "react";

const bisectX = bisector<Point, number>((d) => d.x);
const NO_DATA: Point[] = [];
const MIN_LINE_POINTS = 2;

type Status = "loading" | "empty" | "notEnough";

const EMPTY_STATES: Record<Status, { title: string; description: string }> = {
  loading: {
    title: "Loading",
    description: "Fetching the latest data.",
  },
  empty: {
    title: "No data",
    description: "There is no data to display yet.",
  },
  notEnough: {
    title: "Not enough data",
    description: "There are not enough data points to draw the chart yet.",
  },
};

function getStatus(data: Point[] | undefined): Status | null {
  if (data === undefined) return "loading";
  if (data.length === 0) return "empty";
  if (data.length < MIN_LINE_POINTS) return "notEnough";
  return null;
}

function isRangeAvailable(range: ChartRange, data: Point[]) {
  if (range === "All") return data.length >= MIN_LINE_POINTS;
  if (data.length === 0) return false;
  const [start, end] = getRangeDomain(range, data);
  if (start < data[0].x) return false;
  return (
    bisectX.right(data, end) - bisectX.left(data, start) >= MIN_DATA_POINTS
  );
}

export function LineChart({ data }: { data: Point[] | undefined }) {
  const uid = useId();
  const [preferredRange, setPreferredRange] = useState<ChartRange>("1M");
  const status = getStatus(data);
  const points = status ? NO_DATA : (data ?? NO_DATA);
  const range = isRangeAvailable(preferredRange, points)
    ? preferredRange
    : "All";

  const xDomain = getRangeDomain(range, points);

  return (
    <Card className="overflow-visible pb-0">
      <CardHeader>
        <CardTitle>Line Chart - Interactive</CardTitle>
        <CardDescription className="col-start-1">
          Showing values for the selected range
        </CardDescription>
        <CardAction className="col-span-full col-start-1 row-span-1 row-start-3 mt-2 justify-self-stretch @lg/card-header:col-span-1 @lg/card-header:col-start-2 @lg/card-header:row-span-2 @lg/card-header:row-start-1 @lg/card-header:mt-0 @lg/card-header:justify-self-end">
          <fieldset className="flex h-8 items-center rounded-lg bg-muted p-0.75 text-muted-foreground">
            <legend className="sr-only">Data range</legend>
            {CHART_RANGES.map((r) => (
              <label
                key={r}
                className="inline-flex h-full flex-1 items-center justify-center rounded-md border border-transparent px-1 text-sm font-medium whitespace-nowrap text-foreground/60 transition-all hover:text-foreground has-checked:bg-background has-checked:text-foreground has-checked:shadow-sm has-focus-visible:border-ring has-focus-visible:ring-[3px] has-focus-visible:ring-ring/50 has-disabled:pointer-events-none has-disabled:opacity-50 @lg/card-header:flex-none @lg/card-header:px-2 dark:text-muted-foreground dark:hover:text-foreground dark:has-checked:border-input dark:has-checked:bg-input/30 dark:has-checked:text-foreground"
              >
                <input
                  disabled={!isRangeAvailable(r, points)}
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
        <LineGraph data={points} xDomain={xDomain}></LineGraph>
        {status && (
          <Empty className="pointer-events-none absolute inset-0 animate-in duration-300 fade-in">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                {status === "loading" ? <Spinner /> : <ChartLine />}
              </EmptyMedia>
              <EmptyTitle>{EMPTY_STATES[status].title}</EmptyTitle>
              <EmptyDescription>
                {EMPTY_STATES[status].description}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
      </CardContent>
    </Card>
  );
}
