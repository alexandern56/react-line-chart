import { useEffect, useEffectEvent, useLayoutEffect, useRef } from "react";
import { scaleLinear, scaleUtc } from "d3-scale";
import { animate, useMotionValue, useTransform } from "motion/react";
import { CURVE, TRANSITION } from "../lib/constants";
import type { Point } from "../lib/types";
import { sliceByDomain } from "../lib/domain";
import { lttb } from "../lib/lttb";
import { getMorphEndpoints, lerpPoints } from "../lib/morph";

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

interface AnimatedPointsOptions {
  data: Point[];
  target: Domain;
  width: number;
  height: number;
  maxPoints: number;
  skipAnimations: boolean;
}

export function useAnimatedPoints({
  data,
  target: [targetXMin, targetXMax, targetYMin, targetYMax],
  width,
  height,
  maxPoints,
  skipAnimations,
}: AnimatedPointsOptions) {
  const xMin = useMotionValue(targetXMin);
  const xMax = useMotionValue(targetXMax);
  const yMin = useMotionValue(targetYMin);
  const yMax = useMotionValue(targetYMax);
  const progress = useMotionValue(0);
  const prevDataRef = useRef<Point[]>([]);
  const snapshot = useMotionValue<Point[]>([]);

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
    return animate(progress, 1, { ...TRANSITION, skipAnimations });
  });

  useLayoutEffect(() => {
    const animation = startMorph(data);
    return () => animation.stop();
  }, [data]);

  useEffect(() => {
    const transition = { ...TRANSITION, skipAnimations };
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

  return { points, xMin, xMax };
}
