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

  const [yMin, yMax] = extent(data, (d) => d.x);
  const [xMin, xMax] = extent(data, (d) => d.y);

  if (
    xMin === undefined ||
    xMax === undefined ||
    yMin === undefined ||
    yMax === undefined
  ) {
    return <svg ref={ref} className="size-full" />;
  }

  const yScale = scaleLinear().domain([yMin, yMax]).range([height, 0]);
  const xScale = scaleUtc().domain([xMin, xMax]).range([0, width]);

  return <svg ref={ref} className="size-full border border-red-500"></svg>;
}
