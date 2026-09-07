import { Circle, Group, Line } from "react-konva";

// Standard segment order: top, upper right, lower right, bottom,
// lower left, upper left, middle, decimal point. Inputs are active high.
const strokes = [
  [8, 4, 32, 4],
  [36, 8, 36, 32],
  [36, 40, 36, 64],
  [8, 68, 32, 68],
  [4, 40, 4, 64],
  [4, 8, 4, 32],
  [8, 36, 32, 36],
];
export default function SevenSegment({
  width,
  height,
  segments,
  dark,
}: {
  width: number;
  height: number;
  segments: string;
  dark: boolean;
}) {
  const scale = Math.min((width - 52) / 52, (height - 56) / 76);
  const color = (index: number) =>
    segments[index] === "1"
      ? dark
        ? "#67e8a5"
        : "#16734b"
      : segments[index] === "0"
        ? dark
          ? "#314a43"
          : "#e2eae5"
        : "#c88739";
  return (
    <Group
      x={36 + (width - 36 - 52 * scale) / 2}
      y={(height - 25 - 76 * scale) / 2}
      scaleX={scale}
      scaleY={scale}
      listening={false}
    >
      {strokes.map((points, index) => (
        <Line
          key={index}
          points={points}
          stroke={color(index)}
          strokeWidth={6}
          lineCap="round"
        />
      ))}
      <Circle x={47} y={68} radius={3} fill={color(7)} />
    </Group>
  );
}
