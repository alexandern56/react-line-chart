import { useElementSize } from "./useElementSize";
import { scaleLinear, scaleUtc } from "d3-scale";
import { extent } from "d3-array";

type Point = {
  x: number;
  y: number;
};

interface LineGraphProps {
  data: Point[];
}

export default function LineGraph({ data }: LineGraphProps) {
  const { ref, width, height } = useElementSize<SVGSVGElement>();

  const [yMin = 0, yMax = 0] = extent(data, (d) => d.x);
  const [xMin = 0, xMax = 0] = extent(data, (d) => d.y);

  const yScale = scaleLinear().domain([yMin, yMax]).range([height, 0]);
  const xScale = scaleUtc().domain([xMin, xMax]).range([0, width]);

  return <svg ref={ref} className="size-full border border-red-500"></svg>;
}
