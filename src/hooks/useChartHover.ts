import {
  useEffect,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import type { ScaleTime } from "d3-scale";
import { bisector } from "d3-array";
import { useMotionValue, useTransform, type MotionValue } from "motion/react";
import { CURVE } from "../constants/chart";
import type { Formatters, Point } from "../types/chart";
import { getSegments, yAt } from "../utils/curve";

const bisectX = bisector<Point, number>((d) => d.x);
const KEY_STEP: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1 };

interface ChartHoverOptions extends Pick<
  Formatters,
  "formatDate" | "formatValue"
> {
  data: Point[];
  points: MotionValue<Point[]>;
  xMin: MotionValue<number>;
  xMax: MotionValue<number>;
  xScale: ScaleTime<number, number>;
  width: number;
  height: number;
}

export function useChartHover({
  data,
  points,
  xMin,
  xMax,
  xScale,
  width,
  height,
  formatDate,
  formatValue,
}: ChartHoverOptions) {
  const x = useMotionValue(0);
  const opacity = useMotionValue(0);
  const [isLeftHalf, setIsLeftHalf] = useState(true);

  const segments = useTransform(() => getSegments(points.get(), CURVE));
  const y = useTransform(() => yAt(segments.get(), x.get()) ?? height);
  const glowEdge = useTransform(opacity, [0, 1], [1, 0.2]);

  const getHoveredIndex = () => {
    const time = Math.round(
      xMin.get() + (x.get() / width) * (xMax.get() - xMin.get()),
    );
    return Math.max(0, bisectX.right(data, time) - 1);
  };
  const hoveredPoint = useTransform(() => data.at(getHoveredIndex()));
  const date = useTransform(hoveredPoint, (p) =>
    p ? formatDate(new Date(p.x)) : "",
  );
  const value = useTransform(hoveredPoint, (p) => (p ? formatValue(p.y) : ""));

  const [domainStart, domainEnd] = xScale.domain();
  const [minX, maxX] =
    data.length > 0
      ? [
          Math.max(0, xScale(data[0].x)),
          Math.min(width, xScale(data[data.length - 1].x)),
        ]
      : [0, width];

  const showAt = (nextX: number) => {
    x.set(nextX);
    opacity.set(1);
    setIsLeftHalf(nextX < width / 2);
  };

  const hide = () => opacity.set(0);

  const showAtPointer = (e: PointerEvent<SVGRectElement>) => {
    const { left } = e.currentTarget.getBoundingClientRect();
    showAt(Math.max(minX, Math.min(maxX, e.clientX - left)));
  };

  const moveByKey = (e: KeyboardEvent<SVGRectElement>) => {
    if (e.key === "Escape") {
      hide();
      return;
    }
    const step = KEY_STEP[e.key];
    if (!step || data.length === 0) return;
    e.preventDefault();
    const first = bisectX.left(data, domainStart.getTime());
    const last = bisectX.right(data, domainEnd.getTime()) - 1;
    const offset = opacity.get() > 0 ? step : 0;
    const i = Math.max(first, Math.min(last, getHoveredIndex() + offset));
    showAt(xScale(data[i].x));
  };

  const domainStartTime = domainStart.getTime();
  const domainEndTime = domainEnd.getTime();
  useEffect(
    () => opacity.set(0),
    [data, domainStartTime, domainEndTime, opacity],
  );

  return {
    x,
    y,
    opacity,
    isLeftHalf,
    glowEdge,
    date,
    value,
    handlers: {
      onPointerDown: showAtPointer,
      onPointerMove: showAtPointer,
      onPointerLeave: (e: PointerEvent<SVGRectElement>) => {
        if (e.pointerType === "mouse") hide();
      },
      onPointerCancel: hide,
      onKeyDown: moveByKey,
      onBlur: hide,
    },
  };
}
