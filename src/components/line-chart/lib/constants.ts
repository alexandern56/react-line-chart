import { curveMonotoneX } from "d3-shape";
import type { ValueAnimationTransition } from "motion/react";
import type { Point } from "./types";

export const NO_DATA: Point[] = [];

export const CURVE = curveMonotoneX;

export const TRANSITION = {
  duration: 0.8,
  ease: [0.65, 0, 0.35, 1],
} satisfies ValueAnimationTransition;

export const Y_LABEL_X = 15;
