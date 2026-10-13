"use client";

import { useElementSize } from "./hooks/use-element-size";
import { useAnimatedPoints } from "./hooks/use-animated-points";
import { useAxisLabels } from "./hooks/use-axis-labels";
import { useChartHover } from "./hooks/use-chart-hover";
import { cn } from "@/lib/utils";
import { scaleLinear, scaleUtc } from "d3-scale";
import { min, pairs } from "d3-array";
import { area, line } from "d3-shape";
import { CURVE, NO_DATA, TRANSITION, Y_LABEL_X } from "./lib/constants";
import type { Formatters, Point } from "./lib/types";
import { getYDomain, sliceByDomain } from "./lib/domain";
import { getDefaultFormatters } from "./lib/format";
import {
  useId,
  useMemo,
  useState,
  type ComponentProps,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  useTransform,
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

  const reduceMotion = useReducedMotion();
  const skipAnimations = !isAnimated || reduceMotion === true;

  const { probeRef, xTicks } = useAxisLabels({
    xScale: targetXScale,
    width,
    dataStep,
    formatXTick,
  });

  const { points, xMin, xMax } = useAnimatedPoints({
    data,
    target: [targetXMin, targetXMax, targetYMin, targetYMax],
    width,
    height,
    maxPoints,
    skipAnimations,
  });

  const hover = useChartHover({
    data,
    points,
    xMin,
    xMax,
    xScale: targetXScale,
    width,
    height,
    formatDate,
    formatValue,
  });

  const pathD = useTransform(() => linePath(points.get()) ?? "");
  const areaPath = area<Point>(
    (d) => d.x,
    height + MARGIN.bottom,
    (d) => d.y,
  ).curve(CURVE);
  const areaD = useTransform(() => areaPath(points.get()) ?? "");
  const uid = useId();

  const curveFade = {
    initial: { opacity: 0 },
    animate: { opacity: data.length > 0 ? 1 : 0 },
    transition: TRANSITION,
  };

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
            cx={hover.x}
            cy={hover.y}
            r={GLOW_RADIUS}
          >
            <stop offset="0%" stopColor="var(--chart-1)" />
            <motion.stop
              offset="100%"
              stopColor="var(--chart-1)"
              stopOpacity={hover.glowEdge}
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
        <text ref={probeRef} className="invisible" />
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
        <motion.g style={{ opacity: hover.opacity }}>
          <svg width={width} height={height}>
            <motion.line
              y2={height}
              strokeDasharray="3 3"
              style={{ x: hover.x, y: hover.y }}
              className="stroke-chart-1"
            />
          </svg>
          <motion.circle
            r={5}
            style={{ x: hover.x, y: hover.y }}
            className="fill-chart-1"
          />
        </motion.g>
      )}
      <rect
        y={-MARGIN.top}
        width={width}
        height={height + MARGIN.top + MARGIN.bottom}
        fill="transparent"
        tabIndex={data.length > 0 ? 0 : undefined}
        role="application"
        className="outline-none"
        {...hover.handlers}
      />
      {overlay &&
        data.length > 0 &&
        createPortal(
          <motion.div
            style={{ x: hover.x, y: hover.y, opacity: hover.opacity }}
            className="absolute"
          >
            <div
              role="status"
              className={cn(
                "grid min-w-32 -translate-y-1/2 gap-1.5 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs whitespace-nowrap shadow-xl transition-transform duration-300",
                hover.isLeftHalf
                  ? "translate-x-3"
                  : "-translate-x-[calc(100%+12px)]",
              )}
            >
              <motion.div className="border-b border-border/50 pb-1.5 font-medium">
                {hover.date}
              </motion.div>
              <motion.div className="font-mono font-medium text-foreground tabular-nums">
                {hover.value}
              </motion.div>
            </div>
          </motion.div>,
          overlay,
        )}
    </>
  );
}
