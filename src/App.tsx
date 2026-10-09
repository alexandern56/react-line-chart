import { LineChart } from "@/components/line-chart/line-chart";
import type { Point } from "@/components/line-chart/lib/types";

const DAY = 24 * 60 * 60 * 1000;
const START = Date.UTC(2026, 0, 1);

const DATA: Point[] = Array.from({ length: 365 }, (_, i) => ({
  x: START + i * DAY,
  y: 100 + 20 * Math.sin(i / 20) + 8 * Math.sin(i / 3),
}));

function App() {
  return (
    <main className="mx-auto max-w-5xl p-4 md:p-8">
      <LineChart data={DATA} />
    </main>
  );
}

export default App;
