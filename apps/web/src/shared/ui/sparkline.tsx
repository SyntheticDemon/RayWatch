type SparklineProps = {
  values: number[];
  width?: number;
  height?: number;
  label?: string;
};

export function Sparkline({ values, width = 120, height = 28, label }: SparklineProps) {
  if (values.length < 2) return null;
  const max = Math.max(...values, 0.001);
  const points = values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * width;
      const y = height - (value / max) * (height - 2) - 1;
      return `${x},${y}`;
    })
    .join(" ");
  return (
    <svg
      className="sparkline"
      width={width}
      height={height}
      role="img"
      aria-label={label ?? "Trend sparkline"}
    >
      <polyline points={points} fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}
