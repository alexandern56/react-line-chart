import { LineGraph } from "./LineGraph";
import { ChartRangeSwitch } from "./ChartRangeSwitch";
import { ChartStatus } from "./ChartStatus";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { useLineChart } from "../hooks/useLineChart";
import type { Point } from "../types/chart";

export function LineChart({ data }: { data: Point[] | undefined }) {
  const chart = useLineChart(data, "1M");

  return (
    <Card className="overflow-visible pb-0">
      <CardHeader>
        <CardTitle>Line Chart - Interactive</CardTitle>
        <CardDescription className="col-start-1">
          Showing values for the selected range
        </CardDescription>
        <CardAction className="col-span-full col-start-1 row-span-1 row-start-3 mt-2 justify-self-stretch @lg/card-header:col-span-1 @lg/card-header:col-start-2 @lg/card-header:row-span-2 @lg/card-header:row-start-1 @lg/card-header:mt-0 @lg/card-header:justify-self-end">
          <ChartRangeSwitch
            value={chart.range}
            onChange={chart.setRange}
            isAvailable={chart.isRangeAvailable}
          />
        </CardAction>
      </CardHeader>
      <CardContent className="relative px-0">
        <LineGraph data={chart.points} xDomain={chart.xDomain} />
        <ChartStatus status={chart.status} />
      </CardContent>
    </Card>
  );
}
