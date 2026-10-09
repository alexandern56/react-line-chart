import { useElementSize } from "../hooks/useElementSize";
import { cn } from "../lib/utils";
import { scaleLinear, scaleUtc, type ScaleTime } from "d3-scale";
import { extent, bisector, min, nice, pairs } from "d3-array";
import { type Point } from "../types/chart";
import { curveMonotoneX, line } from "d3-shape";
import { lttb } from "../utils/lttb";
import { getMorphEndpoints, lerpPoints } from "../utils/morph";
import { getSegments, yAt } from "../utils/curve";
import {
  useEffect,
  useEffectEvent,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type KeyboardEvent,
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
import { utcMonth, utcWeek, utcYear } from "d3-time";

interface LineGraphProps extends Omit<ComponentProps<"div">, "children"> {
  /** Points sorted by x ascending; x is a UTC timestamp in ms, step ≥ 1 day. */
  data: Point[];
  /** Visible x range [start, end] in ms. Default: the full data extent. */
  xDomain?: [number, number];
  /** Tooltip value. Default: `Intl.NumberFormat` with up to 1 fraction digit. */
  formatValue?: (value: number) => string;
  /** Tooltip date. Default: day, short month and year in UTC, e.g. "Sep 24, 2026". */
  formatDate?: (date: Date) => string;
  /** Y axis label, also used to measure it. Default: `Intl.NumberFormat`. */
  formatYTick?: (value: number) => string;
  /** X axis label, also used to measure it. Default: day, month or year in UTC, depending on the tick. */
  formatXTick?: (date: Date) => string;
  /** BCP 47 locale for the default formatters, e.g. "de-DE". Default: the runtime locale. */
  locale?: string;
  /** Classes for the root element. Default size: `h-68.75 w-full`. */
  className?: string;
  /** One drawn point per N px, downsampled with LTTB. `null` draws every point. Default: 3. */
  pxPerPoint?: number | null;
  /** Animate range zoom and data morph. `false` behaves like reduced motion. Default: true. */
  animate?: boolean;
}

type Formatters = Required<
  Pick<
    LineGraphProps,
    "formatValue" | "formatDate" | "formatYTick" | "formatXTick"
  >
>;

const PX_PER_POINT = 3;
const PX_PER_Y_TICK = 50;
const X_LABEL_GAP = 24;
const Y_LABEL_X = 15;
const Y_LABEL_DY = -4;

const MARGIN = { top: 15, bottom: 35 };

function getDefaultFormatters(locale?: string): Formatters {
  const day = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
  const month = new Intl.DateTimeFormat(locale, {
    month: "short",
    timeZone: "UTC",
  });
  const year = new Intl.DateTimeFormat(locale, {
    year: "numeric",
    timeZone: "UTC",
  });
  const date = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
  const value = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 });
  const tick = new Intl.NumberFormat(locale);

  return {
    formatValue: value.format,
    formatDate: date.format,
    formatYTick: tick.format,
    formatXTick: (d) => {
      if (utcMonth(d) < d) return day.format(d);
      if (utcYear(d) < d) return month.format(d);
      return year.format(d);
    },
  };
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
  labelWidth: (tick: Date) => number,
  isVisible: (tick: Date) => boolean,
  dataStep: number,
) {
  const fits = (ticks: Date[]) => {
    if (ticks.length < 2) return true;
    const gap =
      (scale(ticks[ticks.length - 1]) - scale(ticks[0])) / (ticks.length - 1);
    return gap >= Math.max(...ticks.map(labelWidth)) + X_LABEL_GAP;
  };

  const [start, end] = scale.domain();
  let lo = 1;
  const maxTicks = (end.getTime() - start.getTime()) / dataStep;
  let hi = Math.min(Math.floor(width / X_LABEL_GAP), Math.floor(maxTicks));
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (fits(scale.ticks(mid))) lo = mid;
    else hi = mid - 1;
  }
  const ticks = scale.ticks(lo).filter(isVisible);
  if (ticks.length > 0) return ticks;
  const biweekly = scale.ticks(utcWeek.every(2)!);
  return fits(biweekly) && biweekly.length <= maxTicks
    ? biweekly.filter(isVisible)
    : [];
}

export function LineGraphApi({
  data,
  xDomain,
  formatValue,
  formatDate,
  formatYTick,
  formatXTick,
  locale,
  className,
  pxPerPoint = PX_PER_POINT,
  animate: isAnimated = true,
  ...props
}: LineGraphProps) {
  const { ref, width, height } = useElementSize<SVGSVGElement>();
  const [overlay, setOverlay] = useState<HTMLDivElement | null>(null);
  const [xMin, xMax] = xDomain ?? [data[0]?.x ?? 0, data.at(-1)?.x ?? 0];
  const defaults = useMemo(() => getDefaultFormatters(locale), [locale]);
  const format: Formatters = {
    formatValue: formatValue ?? defaults.formatValue,
    formatDate: formatDate ?? defaults.formatDate,
    formatYTick: formatYTick ?? defaults.formatYTick,
    formatXTick: formatXTick ?? defaults.formatXTick,
  };

  return (
    <div
      role="figure"
      {...props}
      className={cn(
        "relative h-68.75 w-full fill-muted-foreground text-xs has-focus-visible:outline-2",
        className,
      )}
    >
      <svg
        ref={ref}
        className="absolute inset-0 size-full touch-pan-y overflow-visible"
      >
        {width > 0 && (
          <g transform={`translate(0,${MARGIN.top})`}>
            <LinePlot
              data={data.length > 1 ? data : []}
              width={width}
              height={height - MARGIN.top - MARGIN.bottom}
              xDomain={[xMin, xMax]}
              overlay={overlay}
              format={format}
              pxPerPoint={pxPerPoint}
              isAnimated={isAnimated}
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
  format: Formatters;
  pxPerPoint: number | null;
  isAnimated: boolean;
}

const bisectX = bisector<Point, number>((d) => d.x);
const KEY_STEP: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1 };
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
  maxPoints: number,
): Point[] {
  const visibleData = sliceByDomain(data, xMin, xMax);
  const displayedData = lttb(visibleData, maxPoints);

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
  maxPoints: number,
): Point[] {
  const target = getScreenPoints(data, domain, width, height, maxPoints);
  if (progress >= 1) return target;
  const { from, to } = getMorphEndpoints(snapshot, target, height);
  return lerpPoints(from, to, progress);
}

const CURVE = curveMonotoneX;

const linePath = line<Point>(
  (d) => d.x,
  (d) => d.y,
).curve(CURVE);

function LinePlot({
  data,
  width,
  height,
  xDomain,
  overlay,
  format,
  pxPerPoint,
  isAnimated,
}: LinePlotProps) {
  const { formatValue, formatDate, formatYTick, formatXTick } = format;
  const [targetXMin, targetXMax] = xDomain;
  const yTickCount = Math.max(2, Math.floor(height / PX_PER_Y_TICK));
  const maxPoints =
    pxPerPoint === null ? Infinity : Math.floor(width / pxPerPoint);

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

  const dataStep = useMemo(
    () => min(pairs(data, (a, b) => b.x - a.x)) ?? Infinity,
    [data],
  );

  const xLabelProbeRef = useRef<SVGTextElement>(null);
  const [xLabelFont, setXLabelFont] = useState<string | null>(null);

  useLayoutEffect(() => {
    const s = getComputedStyle(xLabelProbeRef.current!);
    const font = `${s.fontStyle} ${s.fontWeight} ${s.fontSize} ${s.fontFamily}`;
    let active = true;
    document.fonts.load(font).then(() => {
      if (active) setXLabelFont(font);
    });
    return () => {
      active = false;
    };
  }, []);

  const xTicks = useMemo(() => {
    if (xLabelFont === null) return [];
    const yLabelsRight =
      Y_LABEL_X +
      Math.max(
        ...yTicks.map((tick) => measureText(formatYTick(tick), xLabelFont)),
      );
    const labelWidth = (tick: Date) =>
      measureText(formatXTick(tick), xLabelFont);
    const isVisible = (tick: Date) => {
      const x = targetXScale(tick);
      const halfLabel = labelWidth(tick) / 2;
      return x - halfLabel >= yLabelsRight && x + halfLabel <= width;
    };
    return getXTicks(targetXScale, width, labelWidth, isVisible, dataStep);
  }, [
    targetXScale,
    width,
    xLabelFont,
    yTicks,
    dataStep,
    formatYTick,
    formatXTick,
  ]);

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
  const skipAnimations = !isAnimated || reduceMotion === true;

  const labelsFade = {
    initial: { opacity: 0 },
    animate: {
      opacity: 1,
      transition: { duration: 0.4, delay: skipAnimations ? 0 : 0.6 },
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
        maxPoints,
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
      skipAnimations,
    });
  });

  useLayoutEffect(() => {
    const animation = startMorph(data);
    return () => animation.stop();
  }, [data]);

  useEffect(() => {
    const transition = {
      ...TRANSITION,
      skipAnimations,
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
    skipAnimations,
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
      maxPoints,
    );
  });
  const pathD = useTransform(() => linePath(points.get()) ?? "");
  const segments = useTransform(() => getSegments(points.get(), CURVE));
  const hoverY = useTransform(
    () => yAt(segments.get(), hoverX.get()) ?? height,
  );
  const getHoveredIndex = () => {
    const time = Math.round(
      xMin.get() + (hoverX.get() / width) * (xMax.get() - xMin.get()),
    );
    return Math.max(0, bisectX.right(data, time) - 1);
  };
  const hoveredPoint = useTransform(() => data.at(getHoveredIndex()));
  const hoveredDate = useTransform(hoveredPoint, (p) =>
    p ? formatDate(new Date(p.x)) : "",
  );
  const hoveredValue = useTransform(hoveredPoint, (p) =>
    p ? formatValue(p.y) : "",
  );

  const showHoverAt = (x: number) => {
    hoverX.set(x);
    hoverOpacity.set(1);
    setIsLeftHalf(x < width / 2);
  };

  const showHover = (e: PointerEvent<SVGRectElement>) => {
    const { left } = e.currentTarget.getBoundingClientRect();
    showHoverAt(Math.max(0, Math.min(width, e.clientX - left)));
  };

  const moveHover = (e: KeyboardEvent<SVGRectElement>) => {
    if (e.key === "Escape") {
      hoverOpacity.set(0);
      return;
    }
    const step = KEY_STEP[e.key];
    if (!step || data.length === 0) return;
    e.preventDefault();
    const first = bisectX.left(data, targetXMin);
    const last = bisectX.right(data, targetXMax) - 1;
    const offset = hoverOpacity.get() > 0 ? step : 0;
    const i = Math.max(first, Math.min(last, getHoveredIndex() + offset));
    showHoverAt(targetXScale(data[i].x));
  };

  useEffect(
    () => hoverOpacity.set(0),
    [data, targetXMin, targetXMax, hoverOpacity],
  );

  return (
    <>
      <AnimatePresence>
        {data.length > 0 && (
          <motion.g key={`${targetYMin}:${targetYMax}`} {...labelsFade}>
            {yTicks.map((tick) => (
              <g key={tick} transform={`translate(0,${targetYScale(tick)})`}>
                <line
                  x2={width}
                  shapeRendering="crispEdges"
                  className="stroke-border/50"
                />
                <text x={Y_LABEL_X} dy={Y_LABEL_DY}>
                  {formatYTick(tick)}
                </text>
              </g>
            ))}
          </motion.g>
        )}
      </AnimatePresence>
      <svg width={width} height={height}>
        <motion.path
          d={pathD}
          initial={{ opacity: 0 }}
          animate={{ opacity: data.length > 0 ? 1 : 0 }}
          transition={TRANSITION}
          className="fill-none stroke-chart-1 stroke-1"
        ></motion.path>
      </svg>
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
              className="stroke-border"
            />
          </svg>
          <motion.circle
            r={4}
            style={{ x: hoverX, y: hoverY }}
            className="fill-chart-1"
          />
        </motion.g>
      )}
      <rect
        width={width}
        height={height}
        fill="transparent"
        tabIndex={data.length > 0 ? 0 : undefined}
        role="application"
        className="outline-none"
        onKeyDown={moveHover}
        onBlur={() => hoverOpacity.set(0)}
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
              role="status"
              className={cn(
                "grid min-w-32 -translate-y-1/2 gap-1.5 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs whitespace-nowrap shadow-xl transition-transform duration-300",
                isLeftHalf ? "translate-x-3" : "-translate-x-[calc(100%+12px)]",
              )}
            >
              <motion.div className="border-b border-border/50 pb-1.5 font-medium">
                {hoveredDate}
              </motion.div>
              <motion.div className="font-mono font-medium text-foreground tabular-nums">
                {hoveredValue}
              </motion.div>
            </div>
          </motion.div>,
          overlay,
        )}
    </>
  );
}
