import LineGraph from "./LineGraph";

const DATA = [
  { x: 1790467200000, y: 12 },
  { x: 1790553600000, y: 18 },
  { x: 1790640000000, y: 15 },
  { x: 1790726400000, y: 27 },
  { x: 1790812800000, y: 22 },
  { x: 1790899200000, y: 35 },
  { x: 1790985600000, y: 31 },
  { x: 1791072000000, y: 44 },
  { x: 1791158400000, y: 39 },
  { x: 1791244800000, y: 52 },
];
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
