import { useElementSize } from "../hooks/useElementSize";
import { scaleLinear, scaleUtc } from "d3-scale";
import { extent } from "d3-array";
import { line } from "d3-shape";
import { type Point } from "../types/chart";
import { lttb } from "../utils/lttb";
import { useMemo } from "react";

interface LineGraphBasicProps {
  data: Point[];
}

const PX_PER_POINT = 3;

export function LineGraphBasic({ data }: LineGraphBasicProps) {
  const { ref, width, height } = useElementSize<SVGSVGElement>();

  return (
    <svg ref={ref} className="size-full">
      {width > 0 && (
        <LinePlot data={data} width={width} height={height}></LinePlot>
      )}
    </svg>
  );
}

interface LinePlotProps {
  data: Point[];
  width: number;
  height: number;
}
export function LinePlot({ data, width, height }: LinePlotProps) {
  const [yMin = 0, yMax = 0] = useMemo(() => extent(data, (d) => d.y), [data]);
  const [xMin = 0, xMax = 0] = useMemo(() => extent(data, (d) => d.x), [data]);

  const yScale = scaleLinear().domain([yMin, yMax]).range([height, 0]);
  const xScale = scaleUtc().domain([xMin, xMax]).range([0, width]);

  const treshold = Math.floor(width / PX_PER_POINT);
  const displayedData = useMemo(() => lttb(data, treshold), [data, treshold]);

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
