import { LineGraphBasic } from "./components/LineGraphBasic";
import { generateData } from "./generateData";

const DATA = generateData(100000);
function App() {
  return (
    <main className="p-10">
      <div id="wrapper" className="h-50 border">
        <LineGraphBasic data={DATA}></LineGraphBasic>
      </div>
    </main>
  );
}

export default App;
