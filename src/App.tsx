import { LineChart } from "./components/LineChart";
import { LineGraphBasic } from "./components/LineGraphBasic.tsx";
import { generateData } from "./generateData";

const DATA = generateData(1000);
function App() {
  return (
    <main className="flex flex-col gap-5 p-10">
      <h2>Basic</h2>
      <div id="wrapper" className="h-50 border">
        <LineGraphBasic data={DATA}></LineGraphBasic>
      </div>

      <h2>Normal</h2>
      <div className="border">
        <LineChart data={DATA}></LineChart>
      </div>
    </main>
  );
}

export default App;
