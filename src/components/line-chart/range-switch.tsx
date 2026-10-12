"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";
import { CHART_RANGES, type ChartRange } from "./lib/ranges";

interface ChartRangeSwitchProps {
  value: ChartRange;
  onChange: (range: ChartRange) => void;
  isAvailable?: (range: ChartRange) => boolean;
  className?: string;
}

export function ChartRangeSwitch({
  value,
  onChange,
  isAvailable = () => true,
  className,
}: ChartRangeSwitchProps) {
  const uid = useId();

  return (
    <fieldset
      className={cn(
        "flex h-8 items-center rounded-lg bg-muted p-0.75 text-muted-foreground",
        className,
      )}
    >
      <legend className="sr-only">Data range</legend>
      {CHART_RANGES.map((range) => (
        <label
          key={range}
          className="relative inline-flex h-full flex-1 items-center justify-center rounded-md border border-transparent px-2 text-sm font-medium whitespace-nowrap text-foreground/60 transition-all hover:text-foreground has-checked:bg-background has-checked:text-foreground has-checked:shadow-sm has-focus-visible:border-ring has-focus-visible:ring-[3px] has-focus-visible:ring-ring/50 has-disabled:pointer-events-none has-disabled:opacity-50 dark:text-muted-foreground dark:hover:text-foreground dark:has-checked:border-input dark:has-checked:bg-input/30 dark:has-checked:text-foreground"
        >
          <input
            type="radio"
            name={`range-${uid}`}
            checked={value === range}
            disabled={!isAvailable(range)}
            onChange={() => onChange(range)}
            className="sr-only"
          />
          {range}
        </label>
      ))}
    </fieldset>
  );
}
