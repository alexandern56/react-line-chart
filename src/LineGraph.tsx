import { useElementSize } from "./useElementSize";
import { scaleLinear, scaleUtc } from "d3-scale";
import { extent } from "d3-array";
import { line } from "d3-shape";

type Point = {
  x: number;
  y: number;
};

interface LineGraphProps {
  data: Point[];
}

export default function LineGraph({ data }: LineGraphProps) {
  const { ref, width, height } = useElementSize<SVGSVGElement>();

  const [yMin = 0, yMax = 0] = extent(data, (d) => d.y);
  const [xMin = 0, xMax = 0] = extent(data, (d) => d.x);

  const yScale = scaleLinear().domain([yMin, yMax]).range([height, 0]);
  const xScale = scaleUtc().domain([xMin, xMax]).range([0, width]);

  const pathD = line<Point>(
    (d) => xScale(d.x),
    (d) => yScale(d.y),
  )(data);

  return (
    <svg ref={ref} className="size-full">
      {pathD && (
        <path d={pathD} className="fill-none stroke-black stroke-1"></path>
      )}
    </svg>
  );
}
