import { useElementSize } from "../hooks/useElementSize";
import { scaleLinear, scaleUtc } from "d3-scale";
import { extent, bisector } from "d3-array";
import { line } from "d3-shape";
import { type Point } from "../types/chart";
import { lttb } from "../utils/lttb";
import { getMorphEndpoints, lerpPoints } from "../utils/morph";
import {
  useEffect,
  useEffectEvent,
  useLayoutEffect,
  useMemo,
  useRef,
} from "react";
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
const TRANSITION = {
  duration: 0.8,
  ease: [0.65, 0, 0.35, 1],
} satisfies ValueAnimationTransition;

function sliceByDomain(data: Point[], xMin: number, xMax: number) {
  const start = Math.max(0, bisectX.left(data, xMin) - 1);
  const end = Math.min(data.length, bisectX.right(data, xMax) + 1);
  return data.slice(start, end);
}
type Domain = [xMin: number, xMax: number, yMin: number, yMax: number];

function getScreenPoints(
  data: Point[],
  [xMin, xMax, yMin, yMax]: Domain,
  width: number,
  height: number,
): Point[] {
  const visibleData = sliceByDomain(data, xMin, xMax);
  const displayedData = lttb(visibleData, Math.floor(width / PX_PER_POINT));

  const yScale = scaleLinear().domain([yMin, yMax]).range([height, 0]);
  const xScale = scaleUtc().domain([xMin, xMax]).range([0, width]);

  return displayedData.map((d) => ({ x: xScale(d.x), y: yScale(d.y) }));
}

function getRenderedPoints(
  data: Point[],
  domain: Domain,
  snapshot: Point[],
  progress: number,
  width: number,
  height: number,
): Point[] {
  const target = getScreenPoints(data, domain, width, height);
  if (progress >= 1) return target;
  const { from, to } = getMorphEndpoints(snapshot, target, height);
  return lerpPoints(from, to, progress);
}

const linePath = line<Point>(
  (d) => d.x,
  (d) => d.y,
);

function LinePlot({ data, width, height, xDomain }: LinePlotProps) {
  const [targetXMin, targetXMax] = xDomain;

  const [targetYMin = 0, targetYMax = 0] = useMemo(
    () => extent(sliceByDomain(data, targetXMin, targetXMax), (d) => d.y),
    [data, targetXMin, targetXMax],
  );

  const xMin = useMotionValue(targetXMin);
  const xMax = useMotionValue(targetXMax);
  const yMin = useMotionValue(targetYMin);
  const yMax = useMotionValue(targetYMax);
  const progress = useMotionValue(0);
  const snapshot = useMotionValue<Point[]>([]);
  const prevDataRef = useRef<Point[]>([]);

  const reduceMotion = useReducedMotion();

  const startMorph = useEffectEvent((nextData: Point[]) => {
    const domain: Domain = [xMin.get(), xMax.get(), yMin.get(), yMax.get()];
    snapshot.set(
      getRenderedPoints(
        prevDataRef.current,
        domain,
        snapshot.get(),
        progress.get(),
        width,
        height,
      ),
    );
    prevDataRef.current = nextData;

    xMin.jump(targetXMin);
    xMax.jump(targetXMax);
    yMin.jump(targetYMin);
    yMax.jump(targetYMax);

    progress.jump(0);
    return animate(progress, 1, {
      ...TRANSITION,
      skipAnimations: reduceMotion === true,
    });
  });

  useLayoutEffect(() => {
    const animation = startMorph(data);
    return () => animation.stop();
  }, [data]);

  useEffect(() => {
    const transition = {
      ...TRANSITION,
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

  const pathD = useTransform(() => {
    const domain: Domain = [xMin.get(), xMax.get(), yMin.get(), yMax.get()];
    const points = getRenderedPoints(
      data,
      domain,
      snapshot.get(),
      progress.get(),
      width,
      height,
    );
    return linePath(points) ?? "";
  });

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
