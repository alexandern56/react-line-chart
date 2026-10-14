# Line Chart

Animated time-series line chart for React and [shadcn/ui](https://ui.shadcn.com), with LTTB downsampling for large datasets. The shadcn CLI copies the source into your project.

**[Live demo ↗](https://react-line-chart-downsampling.vercel.app)**

## Why

I once had to build a metrics page made mostly of line charts. None of the libraries I tried let me match the design one to one and give the UX I wanted.

So I had to learn from scratch how to build a line chart that renders large datasets, feels light and smooth, and stays fully customizable. That's what led me to SVG and D3.

It doesn't try to cover every need, but maybe someone will find it useful. Either way, the code is yours: add or remove whatever you need.

The chart covers three core things:

1. Smooth morphing when the dataset changes
2. Zooming in and out when the range changes
3. Data downsampling with LTTB

## Getting started

### Installation

```bash
# Card with range switch and states
npx shadcn@latest add alexandern56/react-line-chart/line-chart

# Graph only
npx shadcn@latest add alexandern56/react-line-chart/line-graph
```

Files are added to `components/line-chart/`.

### Usage

```tsx
import { LineChart } from "@/components/line-chart/line-chart";
import type { Point } from "@/components/line-chart/lib/types";

export function Revenue({ data }: { data: Point[] | undefined }) {
  return <LineChart data={data} />;
}
```

### Data

`{ x: number; y: number }[]`, where `x` is a UTC timestamp in ms. Points are sorted by `x`, one per day or coarser.

| `data`      | Shows           |
| ----------- | --------------- |
| `undefined` | Loading         |
| `[]`        | No data         |
| 1 point     | Not enough data |

### Ranges

`1W`, `2W`, `1M`, `6M`, `1Y`, `All`. A range is enabled when the data covers it and has at least 4 points inside; otherwise the chart falls back to `All`. Presets live in `lib/ranges.ts`.

## Custom layout

`LineChart` is a composition of small pieces. Use them directly to build your own header:

```tsx
import { LineGraph } from "@/components/line-chart/line-graph";
import { ChartRangeSwitch } from "@/components/line-chart/range-switch";
import { ChartStatus } from "@/components/line-chart/chart-status";
import { useLineChart } from "@/components/line-chart/hooks/use-line-chart";
import type { Point } from "@/components/line-chart/lib/types";

export function Price({ data }: { data: Point[] | undefined }) {
  const chart = useLineChart(data, "6M");

  return (
    <section>
      <header className="flex items-center justify-between">
        <h2>Price</h2>
        <ChartRangeSwitch
          value={chart.range}
          onChange={chart.setRange}
          isAvailable={chart.isRangeAvailable}
        />
      </header>
      <div className="relative">
        <LineGraph data={chart.points} xDomain={chart.xDomain} />
        <ChartStatus status={chart.status} />
      </div>
    </section>
  );
}
```

`ChartStatus` covers its parent, so the parent needs `relative`.

## `LineGraph` props

| Prop          | Type                        | Default                |
| ------------- | --------------------------- | ---------------------- |
| `data`        | `Point[]`                   | required               |
| `xDomain`     | `[number, number]`          | full data extent       |
| `locale`      | `string`                    | runtime locale         |
| `formatValue` | `(value: number) => string` | up to 1 fraction digit |
| `formatDate`  | `(date: Date) => string`    | `Sep 24, 2026`         |
| `formatYTick` | `(value: number) => string` | `Intl.NumberFormat`    |
| `formatXTick` | `(date: Date) => string`    | day, month or year     |
| `pxPerPoint`  | `number \| null`            | `3`                    |
| `animate`     | `boolean`                   | `true`                 |
| `className`   | `string`                    | size `h-68.75 w-full`  |

Other `div` props, such as `aria-label`, are passed to the root.

### Formatters

Tooltip formatters (`formatValue`, `formatDate`) show full precision; axis formatters (`formatYTick`, `formatXTick`) stay short. `formatXTick` is also used to measure the x-axis labels, so they never overlap whatever the format.

```tsx
const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});
const usdTick = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

<LineGraph data={data} formatValue={usd.format} formatYTick={usdTick.format} />;
```

### Downsampling

The chart draws about one point per `pxPerPoint` pixels of its width. The points are picked with LTTB from the visible range, so zooming into a shorter range shows more detail. `null` draws every point, which is slower to animate on large datasets.

## Styling

The line, marker and area use `--chart-1`. Text, grid and tooltip use the shadcn tokens `muted-foreground`, `border`, `background` and `foreground`; values use `font-mono`. Change the variables in your CSS or edit the classes in the copied files.

On hover the line glows around the pointer and dims toward the edges. Change the glow radius with `GLOW_RADIUS` in `line-graph.tsx` (600 px by default).

## Accessibility

- Focus the chart with Tab, move between points with ← and →, hide the tooltip with Esc
- The tooltip is announced as a live region
- Animations respect `prefers-reduced-motion`

## Development

```bash
pnpm install
pnpm dev
```

Registry items are defined in `registry.json`.
