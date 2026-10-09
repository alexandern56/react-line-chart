import { CHART_RANGES } from "../constants/chart";
export type Point = {
  x: number;
  y: number;
};
export type ChartRange = (typeof CHART_RANGES)[number];
export type DataStatus = "loading" | "empty" | "notEnough";

export interface Formatters {
  /** Tooltip value. Default: `Intl.NumberFormat` with up to 1 fraction digit. */
  formatValue: (value: number) => string;
  /** Tooltip date. Default: day, short month and year in UTC, e.g. "Sep 24, 2026". */
  formatDate: (date: Date) => string;
  /** Y axis label, also used to measure it. Default: `Intl.NumberFormat`. */
  formatYTick: (value: number) => string;
  /** X axis label, also used to measure it. Default: day, month or year in UTC, depending on the tick. */
  formatXTick: (date: Date) => string;
}
