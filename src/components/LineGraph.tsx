import { useElementSize } from "../hooks/useElementSize";
import { scaleLinear, scaleUtc } from "d3-scale";
import { extent, bisector } from "d3-array";
import { line } from "d3-shape";
import { type Point } from "../types/chart";
import { lttb } from "../utils/lttb";
import { useMemo } from "react";

interface LineGraphProps {
  data: Point[];
  xDomain: [number, number];
}

const PX_PER_POINT = 3;

export function LineGraph({ data, xDomain }: LineGraphProps) {
  const { ref, width, height } = useElementSize<SVGSVGElement>();

  return (
    <svg ref={ref} className="size-full">
      {width > 0 && (
        <LinePlot
          data={data}
          width={width}
          height={height}
          xDomain={xDomain}
        ></LinePlot>
      )}
    </svg>
  );
}

interface LinePlotProps {
  data: Point[];
  width: number;
  height: number;
  xDomain: [number, number];
}

const bisectX = bisector<Point, number>((d) => d.x);

export function LinePlot({ data, width, height, xDomain }: LinePlotProps) {
  const [xMin = 0, xMax = 0] = xDomain;
  const threshold = Math.floor(width / PX_PER_POINT);

  const visibleData = useMemo(() => {
    const start = Math.max(0, bisectX.left(data, xMin) - 1);
    const end = Math.min(data.length, bisectX.right(data, xMax) + 1);
    return data.slice(start, end);
  }, [data, xMin, xMax]);

  const displayedData = useMemo(
    () => lttb(visibleData, threshold),
    [visibleData, threshold],
  );

  const [yMin = 0, yMax = 0] = useMemo(
    () => extent(visibleData, (d) => d.y),
    [visibleData],
  );

  const yScale = scaleLinear().domain([yMin, yMax]).range([height, 0]);
  const xScale = scaleUtc().domain([xMin, xMax]).range([0, width]);

  const pathD = line<Point>(
    (d) => xScale(d.x),
    (d) => yScale(d.y),
  )(displayedData);

  return (
    <>
      {pathD && (
        <path d={pathD} className="fill-none stroke-black stroke-1"></path>
      )}
      {displayedData.map((d) => (
        <circle key={d.x} cx={xScale(d.x)} cy={yScale(d.y)} r={3}></circle>
      ))}
    </>
  );
}
