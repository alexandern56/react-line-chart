import { useElementSize } from "../hooks/useElementSize";
import { scaleLinear, scaleUtc, type ScaleTime } from "d3-scale";
import { extent, bisector, nice } from "d3-array";
import { curveMonotoneX, line } from "d3-shape";
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
  AnimatePresence,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
  type ValueAnimationTransition,
} from "motion/react";
import { utcDay, utcMonth, utcYear } from "d3-time";

interface LineGraphProps {
  data: Point[];
  xDomain: [number, number];
}

const PX_PER_POINT = 3;
const PX_PER_Y_TICK = 50;
const PX_PER_X_TICK = 70;

const MARGIN = { top: 15, bottom: 35 };

const formatDay = new Intl.DateTimeFormat("en", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});
const formatMonth = new Intl.DateTimeFormat("en", {
  month: "short",
  timeZone: "UTC",
});
const formatYear = new Intl.DateTimeFormat("en", {
  year: "numeric",
  timeZone: "UTC",
});

function formatXTick(date: Date) {
  if (utcMonth(date) < date) return formatDay.format(date);
  if (utcYear(date) < date) return formatMonth.format(date);
  return formatYear.format(date);
}
function getXTicks(scale: ScaleTime<number, number>, width: number) {
  const [start, end] = scale.domain();
  const maxTicks = Math.min(
    Math.floor(width / PX_PER_X_TICK),
    utcDay.count(start, end),
  );
  for (let count = maxTicks; count > 1; count--) {
    const ticks = scale.ticks(count);
    const gap =
      (scale(ticks[ticks.length - 1]) - scale(ticks[0])) / (ticks.length - 1);
    if (ticks.length < 2 || gap >= PX_PER_X_TICK) return ticks;
  }
  return scale.ticks(1);
}

export function LineGraph({ data, xDomain }: LineGraphProps) {
  const { ref, width, height } = useElementSize<SVGSVGElement>();

  return (
    <svg ref={ref} className="size-full min-h-68.75">
      {width > 0 && (
        <g transform={`translate(0,${MARGIN.top})`}>
          <LinePlot
            data={data}
            width={width}
            height={height - MARGIN.top - MARGIN.bottom}
            xDomain={xDomain}
          ></LinePlot>
        </g>
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
).curve(curveMonotoneX);

function LinePlot({ data, width, height, xDomain }: LinePlotProps) {
  const [targetXMin, targetXMax] = xDomain;

  const [targetYMin, targetYMax] = useMemo(() => {
    const [lo = 0, hi = 0] = extent(
      sliceByDomain(data, targetXMin, targetXMax),
      (d) => d.y,
    );
    const pad = (hi - lo) * 0.15;
    return nice(Math.max(0, lo - pad), hi + pad, 10);
  }, [data, targetXMin, targetXMax]);

  const targetYScale = useMemo(
    () => scaleLinear().domain([targetYMin, targetYMax]).range([height, 0]),
    [targetYMin, targetYMax, height],
  );

  const yTicks = targetYScale.ticks(
    Math.max(2, Math.floor(height / PX_PER_Y_TICK)),
  );

  const targetXScale = useMemo(
    () => scaleUtc().domain([targetXMin, targetXMax]).range([0, width]),
    [targetXMin, targetXMax, width],
  );

  const xTicks = getXTicks(targetXScale, width).filter((tick) => {
    const x = targetXScale(tick);
    return x >= PX_PER_X_TICK / 2 && x <= width - PX_PER_X_TICK / 2;
  });

  const xMin = useMotionValue(targetXMin);
  const xMax = useMotionValue(targetXMax);
  const yMin = useMotionValue(targetYMin);
  const yMax = useMotionValue(targetYMax);
  const progress = useMotionValue(0);
  const prevDataRef = useRef<Point[]>([]);
  const snapshot = useMotionValue<Point[]>([]);

  const reduceMotion = useReducedMotion();

  const labelsFade = {
    initial: { opacity: 0 },
    animate: {
      opacity: 1,
      transition: { duration: 0.4, delay: reduceMotion ? 0 : 0.6 },
    },
    exit: { opacity: 0, transition: { duration: 0.4 } },
  };

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
        initial={{ opacity: 0 }}
        animate={{ opacity: data.length > 0 ? 1 : 0 }}
        transition={TRANSITION}
        className="fill-none stroke-black stroke-1"
      ></motion.path>
      <AnimatePresence>
        {data.length > 0 && (
          <motion.g key={`${targetYMin}:${targetYMax}`} {...labelsFade}>
            {yTicks.map((tick) => (
              <text
                key={tick}
                x={15}
                y={targetYScale(tick)}
                dominantBaseline="middle"
              >
                {tick}
              </text>
            ))}
          </motion.g>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {data.length > 0 && (
          <motion.g key={`${targetXMin}:${targetXMax}`} {...labelsFade}>
            {xTicks.map((tick) => (
              <text
                key={tick.getTime()}
                x={targetXScale(tick)}
                y={height + 20}
                textAnchor="middle"
              >
                {formatXTick(tick)}
              </text>
            ))}
          </motion.g>
        )}
      </AnimatePresence>
    </>
  );
}
