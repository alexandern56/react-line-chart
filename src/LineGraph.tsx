type Point = {
  x: number;
  y: number;
};

interface LineGraphProps {
  data: Point[];
}

export default function LineGraph({ data }: LineGraphProps) {
  console.log(data);
  return <svg className="size-full border border-red-500"></svg>;
}
