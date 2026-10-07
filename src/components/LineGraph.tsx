import { useElementSize } from "../hooks/useElementSize";
import { scaleLinear, scaleUtc } from "d3-scale";
import { extent, bisector } from "d3-array";
import { line } from "d3-shape";
import { type Point } from "../types/chart";
import { lttb } from "../utils/lttb";
import { useEffect, useMemo } from "react";
import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
  type ValueAnimationTransition,
} from "motion/react";

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
const ZOOM_TRANSITION = {
  duration: 0.8,
  ease: [0.65, 0, 0.35, 1],
} satisfies ValueAnimationTransition;

function sliceByDomain(data: Point[], xMin: number, xMax: number) {
  const start = Math.max(0, bisectX.left(data, xMin) - 1);
  const end = Math.min(data.length, bisectX.right(data, xMax) + 1);
  return data.slice(start, end);
}
function buildPath(
  data: Point[],
  xMin: number,
  xMax: number,
  yMin: number,
  yMax: number,
  width: number,
  height: number,
) {
  const visibleData = sliceByDomain(data, xMin, xMax);
  const displayedData = lttb(visibleData, Math.floor(width / PX_PER_POINT));

  const yScale = scaleLinear().domain([yMin, yMax]).range([height, 0]);
  const xScale = scaleUtc().domain([xMin, xMax]).range([0, width]);

  return (
    line<Point>(
      (d) => xScale(d.x),
      (d) => yScale(d.y),
    )(displayedData) ?? ""
  );
}
export function LinePlot({ data, width, height, xDomain }: LinePlotProps) {
  const [targetXMin = 0, targetXMax = 0] = xDomain;

  const [targetYMin = 0, targetYMax = 0] = useMemo(
    () => extent(sliceByDomain(data, targetXMin, targetXMax), (d) => d.y),
    [data, targetXMin, targetXMax],
  );

  const xMin = useMotionValue(targetXMin);
  const xMax = useMotionValue(targetXMax);
  const yMin = useMotionValue(targetYMin);
  const yMax = useMotionValue(targetYMax);

  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const transition = {
      ...ZOOM_TRANSITION,
      skipAnimations: reduceMotion === true,
    };
    const animations = [
      animate(xMin, targetXMin, transition),
      animate(xMax, targetXMax, transition),
      animate(yMin, targetYMin, transition),
      animate(yMax, targetYMax, transition),
    ];
    return () => animations.forEach((animation) => animation.stop());
  }, [
    xMin,
    xMax,
    targetXMin,
    targetXMax,
    yMin,
    yMax,
    targetYMin,
    targetYMax,
    reduceMotion,
  ]);

  const pathD = useTransform(
    [xMin, xMax, yMin, yMax],
    ([x0, x1, y0, y1]: number[]) =>
      buildPath(data, x0, x1, y0, y1, width, height),
  );

  return (
    <>
      <motion.path
        d={pathD}
        className="fill-none stroke-black stroke-1"
      ></motion.path>
      {/* {displayedData.map((d) => ( */}
      {/*   <circle key={d.x} cx={xScale(d.x)} cy={yScale(d.y)} r={3}></circle> */}
      {/* ))} */}
    </>
  );
}
