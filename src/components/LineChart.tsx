import { LineGraph } from "./LineGraph";
import { type Point } from "../types/chart";

export default function LineChart({ data }: { data: Point[] }) {
  return (
    <>
      <LineGraph data={data}></LineGraph>
    </>
  );
}
