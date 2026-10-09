import { useState } from "react";
import { LineChart } from "./components/LineChart";
import { LineChartApi } from "./components/LineChartApi";
import { LineGraphBasic } from "./components/LineGraphBasic.tsx";
import { generateData } from "./generateData";

const DATA = generateData(1000);
function App() {
  const [data, setData] = useState(DATA);

  return (
    <main className="flex flex-col gap-5 p-10">
      <h2>Basic</h2>
      <div id="wrapper" className="h-50 border">
        <LineGraphBasic data={DATA}></LineGraphBasic>
      </div>

      <h2>Normal</h2>
      <button
        type="button"
        className="self-start border px-2"
        onClick={() =>
          setData(generateData(300 + Math.floor(Math.random() * 700)))
        }
      >
        New data
      </button>

      <button
        type="button"
        className="self-start border px-2"
        onClick={() => setData([])}
      >
        Empty data
      </button>

      <button
        type="button"
        className="self-start border px-2"
        onClick={() => setData(generateData(1))}
      >
        1 data point
      </button>
      <div className="border">
        <LineChart data={data}></LineChart>
      </div>

      <h2>Api</h2>
      <div className="border">
        <LineChartApi data={data}></LineChartApi>
      </div>
    </main>
  );
}

export default App;
