import { utcMonth, utcYear } from "d3-time";
import type { Formatters } from "../types/chart";

export function getDefaultFormatters(locale?: string): Formatters {
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
