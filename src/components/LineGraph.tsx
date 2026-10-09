import { useElementSize } from "../hooks/useElementSize";
import { cn } from "../lib/utils";
import { scaleLinear, scaleUtc } from "d3-scale";
import { bisector, min, pairs } from "d3-array";
import { NO_DATA } from "../constants/chart";
import type { Formatters, Point } from "../types/chart";
import { getYDomain } from "../utils/chart";
import { getDefaultFormatters } from "../utils/format";
import { getXTicks, measureText } from "../utils/ticks";
import { area, curveMonotoneX, line } from "d3-shape";
import { lttb } from "../utils/lttb";
import { getMorphEndpoints, lerpPoints } from "../utils/morph";
import { getSegments, yAt } from "../utils/curve";
import {
  useEffect,
  useEffectEvent,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
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

interface LineGraphProps
  extends Omit<ComponentProps<"div">, "children">, Partial<Formatters> {
  /** Points sorted by x ascending; x is a UTC timestamp in ms, step ≥ 1 day. */
  data: Point[];
  /** Visible x range [start, end] in ms. Default: the full data extent. */
  xDomain?: [number, number];
  /** BCP 47 locale for the default formatters, e.g. "de-DE". Default: the runtime locale. */
  locale?: string;
  /** Classes for the root element. Default size: `h-68.75 w-full`. */
  className?: string;
  /** One drawn point per N px, downsampled with LTTB. `null` draws every point. Default: 3. */
  pxPerPoint?: number | null;
  /** Animate range zoom and data morph. `false` behaves like reduced motion. Default: true. */
  animate?: boolean;
}

const PX_PER_POINT = 3;
const PX_PER_Y_TICK = 50;
const Y_LABEL_X = 15;
const Y_LABEL_DY = -4;
const GLOW_RADIUS = 600;
const LINE_CLIP_PAD = 2;

const MARGIN = { top: 15, bottom: 35 };

export function LineGraph({
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
        "relative h-68.75 w-full fill-muted-foreground text-xs has-focus-visible:outline-2 has-focus-visible:-outline-offset-2",
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
              data={data.length > 1 ? data : NO_DATA}
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
  const { from, to } = getMorphEndpoints(snapshot, target, height, CURVE);
  return lerpPoints(from, to, progress);
}

const CURVE = curveMonotoneX;

interface FadeGroupProps {
  show: boolean;
  fadeKey: string;
  delayed: boolean;
  children: ReactNode;
}

function FadeGroup({ show, fadeKey, delayed, children }: FadeGroupProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.g
          key={fadeKey}
          initial={{ opacity: 0 }}
          animate={{
            opacity: 1,
            transition: { duration: 0.4, delay: delayed ? 0.6 : 0 },
          }}
          exit={{ opacity: 0, transition: { duration: 0.4 } }}
        >
          {children}
        </motion.g>
      )}
    </AnimatePresence>
  );
}

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

  const [targetYMin, targetYMax] = useMemo(
    () => getYDomain(sliceByDomain(data, targetXMin, targetXMax), yTickCount),
    [data, targetXMin, targetXMax, yTickCount],
  );

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

  const curveFade = {
    initial: { opacity: 0 },
    animate: { opacity: data.length > 0 ? 1 : 0 },
    transition: TRANSITION,
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
  const areaPath = area<Point>(
    (d) => d.x,
    height + MARGIN.bottom,
    (d) => d.y,
  ).curve(CURVE);
  const areaD = useTransform(() => areaPath(points.get()) ?? "");
  const uid = useId();
  const segments = useTransform(() => getSegments(points.get(), CURVE));
  const hoverY = useTransform(
    () => yAt(segments.get(), hoverX.get()) ?? height,
  );
  const glowEdge = useTransform(hoverOpacity, [0, 1], [1, 0.2]);
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

  const [hoverMin, hoverMax] =
    data.length > 0
      ? [
          Math.max(0, targetXScale(data[0].x)),
          Math.min(width, targetXScale(data[data.length - 1].x)),
        ]
      : [0, width];

  const showHover = (e: PointerEvent<SVGRectElement>) => {
    const { left } = e.currentTarget.getBoundingClientRect();
    showHoverAt(Math.max(hoverMin, Math.min(hoverMax, e.clientX - left)));
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
      <FadeGroup
        show={data.length > 0}
        fadeKey={`${targetYMin}:${targetYMax}`}
        delayed={!skipAnimations}
      >
        {yTicks.map((tick) => (
          <line
            key={tick}
            y1={targetYScale(tick)}
            x2={width}
            y2={targetYScale(tick)}
            shapeRendering="crispEdges"
            className="stroke-border/50"
          />
        ))}
      </FadeGroup>
      <svg width={width} height={height + MARGIN.bottom}>
        <defs>
          <linearGradient id={`${uid}-area`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.3} />
            <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <motion.path d={areaD} fill={`url(#${uid}-area)`} {...curveFade} />
      </svg>
      <svg
        y={-LINE_CLIP_PAD}
        width={width}
        height={height + 2 * LINE_CLIP_PAD}
        viewBox={`0 ${-LINE_CLIP_PAD} ${width} ${height + 2 * LINE_CLIP_PAD}`}
      >
        <defs>
          <motion.radialGradient
            id={`${uid}-glow`}
            gradientUnits="userSpaceOnUse"
            cx={hoverX}
            cy={hoverY}
            r={GLOW_RADIUS}
          >
            <stop offset="0%" stopColor="var(--chart-1)" />
            <motion.stop
              offset="100%"
              stopColor="var(--chart-1)"
              stopOpacity={glowEdge}
              className="transition-[stop-opacity] duration-250"
            />
          </motion.radialGradient>
        </defs>
        <motion.path
          d={pathD}
          stroke={`url(#${uid}-glow)`}
          {...curveFade}
          className="stroke-1.5 fill-none"
        ></motion.path>
      </svg>
      <FadeGroup
        show={data.length > 0}
        fadeKey={`${targetYMin}:${targetYMax}`}
        delayed={!skipAnimations}
      >
        {yTicks.map((tick) => (
          <text key={tick} x={Y_LABEL_X} y={targetYScale(tick)} dy={Y_LABEL_DY}>
            {formatYTick(tick)}
          </text>
        ))}
      </FadeGroup>
      <g>
        <text ref={xLabelProbeRef} className="invisible" />
        <FadeGroup
          show={data.length > 0}
          fadeKey={`${targetXMin}:${targetXMax}`}
          delayed={!skipAnimations}
        >
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
        </FadeGroup>
      </g>
      {data.length > 0 && (
        <motion.g style={{ opacity: hoverOpacity }}>
          <svg width={width} height={height}>
            <motion.line
              y2={height}
              strokeDasharray="3 3"
              style={{ x: hoverX, y: hoverY }}
              className="stroke-chart-1"
            />
          </svg>
          <motion.circle
            r={5}
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
