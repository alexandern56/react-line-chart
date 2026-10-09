import { useElementSize } from "./line-chart/hooks/use-element-size";
import { scaleLinear, scaleUtc, type ScaleTime } from "d3-scale";
import { extent, bisector, nice } from "d3-array";
import { curveMonotoneX, line } from "d3-shape";
import { type Point } from "./line-chart/lib/types";
import { lttb } from "./line-chart/lib/lttb";
import { getMorphEndpoints, lerpPoints } from "./line-chart/lib/morph";
import { getSegments, yAt } from "./line-chart/lib/curve";
import {
  useEffect,
  useEffectEvent,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent,
} from "react";
import { createPortal } from "react-dom";
import {
  animate,
  AnimatePresence,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
  type ValueAnimationTransition,
} from "motion/react";
import { utcDay, utcMonth, utcWeek, utcYear } from "d3-time";

interface LineGraphProps {
  data: Point[];
  xDomain: [number, number];
}

const PX_PER_POINT = 3;
const PX_PER_Y_TICK = 50;
const X_LABEL_GAP = 24;
const Y_LABEL_X = 15;

const MARGIN = { top: 15, bottom: 35 };

const formatDay = new Intl.DateTimeFormat(undefined, {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});
const formatMonth = new Intl.DateTimeFormat(undefined, {
  month: "short",
  timeZone: "UTC",
});
const formatYear = new Intl.DateTimeFormat(undefined, {
  year: "numeric",
  timeZone: "UTC",
});
const formatTooltipDate = new Intl.DateTimeFormat(undefined, {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});
const formatTooltipValue = new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 1,
});

function formatXTick(date: Date) {
  if (utcMonth(date) < date) return formatDay.format(date);
  if (utcYear(date) < date) return formatMonth.format(date);
  return formatYear.format(date);
}
let measureContext: CanvasRenderingContext2D | null = null;

function measureText(text: string, font: string) {
  measureContext ??= document.createElement("canvas").getContext("2d")!;
  measureContext.font = font;
  return measureContext.measureText(text).width;
}

function getXTicks(
  scale: ScaleTime<number, number>,
  width: number,
  font: string,
  isVisible: (tick: Date) => boolean,
) {
  const fits = (ticks: Date[]) => {
    if (ticks.length < 2) return true;
    const gap =
      (scale(ticks[ticks.length - 1]) - scale(ticks[0])) / (ticks.length - 1);
    const labelWidth = Math.max(
      ...ticks.map((tick) => measureText(formatXTick(tick), font)),
    );
    return gap >= labelWidth + X_LABEL_GAP;
  };

  const [start, end] = scale.domain();
  let lo = 1;
  let hi = Math.min(Math.floor(width / X_LABEL_GAP), utcDay.count(start, end));
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (fits(scale.ticks(mid))) lo = mid;
    else hi = mid - 1;
  }
  const ticks = scale.ticks(lo).filter(isVisible);
  if (ticks.length > 0) return ticks;
  const biweekly = scale.ticks(utcWeek.every(2)!);
  return fits(biweekly) ? biweekly.filter(isVisible) : [];
}

export function LineGraphLegacy({ data, xDomain }: LineGraphProps) {
  const { ref, width, height } = useElementSize<SVGSVGElement>();
  const [overlay, setOverlay] = useState<HTMLDivElement | null>(null);

  return (
    <div className="relative size-full min-h-68.75">
      <svg
        ref={ref}
        className="absolute inset-0 size-full touch-pan-y overflow-visible"
      >
        {width > 0 && (
          <g transform={`translate(0,${MARGIN.top})`}>
            <LinePlot
              data={data}
              width={width}
              height={height - MARGIN.top - MARGIN.bottom}
              xDomain={xDomain}
              overlay={overlay}
            ></LinePlot>
          </g>
        )}
      </svg>
      <div
        ref={setOverlay}
        className="pointer-events-none absolute inset-x-0"
        style={{ top: MARGIN.top }}
      />
    </div>
  );
}

interface LinePlotProps {
  data: Point[];
  width: number;
  height: number;
  xDomain: [number, number];
  overlay: HTMLDivElement | null;
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

const CURVE = curveMonotoneX;

const linePath = line<Point>(
  (d) => d.x,
  (d) => d.y,
).curve(CURVE);

function LinePlot({ data, width, height, xDomain, overlay }: LinePlotProps) {
  const [targetXMin, targetXMax] = xDomain;
  const yTickCount = Math.max(2, Math.floor(height / PX_PER_Y_TICK));

  const [targetYMin, targetYMax] = useMemo(() => {
    const [lo = 0, hi = 0] = extent(
      sliceByDomain(data, targetXMin, targetXMax),
      (d) => d.y,
    );
    const pad = (hi - lo) * 0.15;
    return nice(Math.max(0, lo - pad), hi + pad, yTickCount);
  }, [data, targetXMin, targetXMax, yTickCount]);

  const targetYScale = useMemo(
    () => scaleLinear().domain([targetYMin, targetYMax]).range([height, 0]),
    [targetYMin, targetYMax, height],
  );

  const yTicks = useMemo(
    () => targetYScale.ticks(yTickCount),
    [targetYScale, yTickCount],
  );

  const targetXScale = useMemo(
    () => scaleUtc().domain([targetXMin, targetXMax]).range([0, width]),
    [targetXMin, targetXMax, width],
  );

  const xLabelProbeRef = useRef<SVGTextElement>(null);
  const [xLabelFont, setXLabelFont] = useState<string | null>(null);

  useLayoutEffect(() => {
    const probe = xLabelProbeRef.current!;
    const update = () => {
      const s = getComputedStyle(probe);
      setXLabelFont(
        `${s.fontStyle} ${s.fontWeight} ${s.fontSize} ${s.fontFamily}`,
      );
    };
    update();
    document.fonts.ready.then(update);
  }, []);

  const xTicks = useMemo(() => {
    if (xLabelFont === null) return [];
    const yLabelsRight =
      Y_LABEL_X +
      Math.max(...yTicks.map((tick) => measureText(String(tick), xLabelFont)));
    const isVisible = (tick: Date) => {
      const x = targetXScale(tick);
      const halfLabel = measureText(formatXTick(tick), xLabelFont) / 2;
      return x - halfLabel >= yLabelsRight && x + halfLabel <= width;
    };
    return getXTicks(targetXScale, width, xLabelFont, isVisible);
  }, [targetXScale, width, xLabelFont, yTicks]);

  const xMin = useMotionValue(targetXMin);
  const xMax = useMotionValue(targetXMax);
  const yMin = useMotionValue(targetYMin);
  const yMax = useMotionValue(targetYMax);
  const progress = useMotionValue(0);
  const prevDataRef = useRef<Point[]>([]);
  const snapshot = useMotionValue<Point[]>([]);
  const hoverX = useMotionValue(0);
  const hoverOpacity = useMotionValue(0);
  const [isLeftHalf, setIsLeftHalf] = useState(true);

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

  const points = useTransform(() => {
    const domain: Domain = [xMin.get(), xMax.get(), yMin.get(), yMax.get()];
    return getRenderedPoints(
      data,
      domain,
      snapshot.get(),
      progress.get(),
      width,
      height,
    );
  });
  const pathD = useTransform(() => linePath(points.get()) ?? "");
  const segments = useTransform(() => getSegments(points.get(), CURVE));
  const hoverY = useTransform(
    () => yAt(segments.get(), hoverX.get()) ?? height,
  );
  const hoveredPoint = useTransform(() => {
    const time =
      xMin.get() + (hoverX.get() / width) * (xMax.get() - xMin.get());
    return data.at(Math.max(0, bisectX.right(data, time) - 1));
  });
  const hoveredDate = useTransform(hoveredPoint, (p) =>
    p ? formatTooltipDate.format(p.x) : "",
  );
  const hoveredValue = useTransform(hoveredPoint, (p) =>
    p ? formatTooltipValue.format(p.y) : "",
  );

  const showHover = (e: PointerEvent<SVGRectElement>) => {
    const { left } = e.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(width, e.clientX - left));
    hoverX.set(x);
    hoverOpacity.set(1);
    setIsLeftHalf(x < width / 2);
  };

  useEffect(
    () => hoverOpacity.set(0),
    [data, targetXMin, targetXMax, hoverOpacity],
  );

  return (
    <>
      <svg width={width} height={height}>
        <motion.path
          d={pathD}
          initial={{ opacity: 0 }}
          animate={{ opacity: data.length > 0 ? 1 : 0 }}
          transition={TRANSITION}
          className="fill-none stroke-black stroke-1"
        ></motion.path>
      </svg>
      <AnimatePresence>
        {data.length > 0 && (
          <motion.g key={`${targetYMin}:${targetYMax}`} {...labelsFade}>
            {yTicks.map((tick) => (
              <text
                key={tick}
                x={Y_LABEL_X}
                y={targetYScale(tick)}
                dominantBaseline="middle"
              >
                {tick}
              </text>
            ))}
          </motion.g>
        )}
      </AnimatePresence>
      <g>
        <text ref={xLabelProbeRef} className="invisible" />
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
      </g>
      {data.length > 0 && (
        <motion.g style={{ opacity: hoverOpacity }}>
          <svg width={width} height={height}>
            <motion.line
              y2={height}
              strokeDasharray="3 3"
              style={{ x: hoverX, y: hoverY }}
              className="stroke-black"
            />
          </svg>
          <motion.circle
            r={6}
            style={{ x: hoverX, y: hoverY }}
            className="fill-black"
          />
        </motion.g>
      )}
      <rect
        width={width}
        height={height}
        fill="transparent"
        onPointerDown={showHover}
        onPointerMove={showHover}
        onPointerLeave={(e) => {
          if (e.pointerType === "mouse") hoverOpacity.set(0);
        }}
        onPointerCancel={() => hoverOpacity.set(0)}
      />
      {overlay &&
        data.length > 0 &&
        createPortal(
          <motion.div
            style={{ x: hoverX, y: hoverY, opacity: hoverOpacity }}
            className="absolute"
          >
            <div
              className={`-translate-y-1/2 border bg-white px-2 py-1 text-xs whitespace-nowrap transition-transform duration-300 ${isLeftHalf ? "translate-x-3" : "-translate-x-[calc(100%+12px)]"}`}
            >
              <motion.div>{hoveredDate}</motion.div>
              <motion.div>{hoveredValue}</motion.div>
            </div>
          </motion.div>,
          overlay,
        )}
    </>
  );
}
