import { ChartLine } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DataStatus } from "./lib/ranges";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Spinner } from "@/components/ui/spinner";

const STATES: Record<DataStatus, { title: string; description: string }> = {
  loading: {
    title: "Loading",
    description: "Fetching the latest data.",
  },
  empty: {
    title: "No data",
    description: "There is no data to display yet.",
  },
  notEnough: {
    title: "Not enough data",
    description: "There are not enough data points to draw the chart yet.",
  },
};

interface ChartStatusProps {
  status: DataStatus | null;
  className?: string;
}

export function ChartStatus({ status, className }: ChartStatusProps) {
  if (status === null) return null;
  const { title, description } = STATES[status];

  return (
    <Empty
      className={cn(
        "pointer-events-none absolute inset-0 animate-in duration-300 fade-in",
        className,
      )}
    >
      <EmptyHeader>
        <EmptyMedia variant="icon">
          {status === "loading" ? <Spinner /> : <ChartLine />}
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}
