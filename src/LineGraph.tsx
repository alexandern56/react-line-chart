import { useElementSize } from "./useElementSize";
import { scaleLinear, scaleUtc } from "d3-scale";

type Point = {
  x: number;
  y: number;
};

interface LineGraphProps {
  data: Point[];
}

export default function LineGraph({ data }: LineGraphProps) {
  const { ref, width, height } = useElementSize<SVGSVGElement>();
  const x = data.map((d) => d.x);
  const y = data.map((d) => d.y);

  const yMin = Math.min(...y);
  const yMax = Math.max(...y);

  const xMin = Math.min(...x);
  const xMax = Math.max(...x);

  const yScale = scaleLinear().domain([yMin, yMax]).range([height, 0]);
  const xScale = scaleUtc().domain([xMin, xMax]).range([0, width]);

  console.log(width, height);

  return <svg ref={ref} className="size-full border border-red-500"></svg>;
}
