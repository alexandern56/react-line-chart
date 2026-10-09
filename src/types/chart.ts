import { CHART_RANGES } from "../constants/chart";
export type Point = {
  x: number;
  y: number;
};
export type ChartRange = (typeof CHART_RANGES)[number];
export type DataStatus = "loading" | "empty" | "notEnough";
