import { LineGraph } from "./components/LineGraph";
import { generateData } from "./generateData";

const DATA = generateData(100000);
function App() {
  return (
    <main className="p-10">
      <div id="wrapper" className="h-50 border">
        <LineGraph data={DATA}></LineGraph>
      </div>
    </main>
  );
}

export default App;
