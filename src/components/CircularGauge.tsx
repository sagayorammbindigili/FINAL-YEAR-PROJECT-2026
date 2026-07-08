interface Props {
  value: number; // 0-100
  verdict?: 'fake' | 'legitimate' | 'uncertain' | 'not_job';
  size?: number;
}

export default function CircularGauge({ value, verdict = 'uncertain', size = 150 }: Props) {
  const strokeWidth = 14;
  const r = (size - strokeWidth) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;
  const filled = (value / 100) * circumference;
  const gap = circumference - filled;

  const color =
    verdict === 'fake'
      ? '#dc2626'
      : verdict === 'legitimate'
      ? '#16a34a'
      : verdict === 'not_job'
      ? '#6b7280'
      : '#f59e0b';

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* Track */}
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke="#e5e7eb"
        strokeWidth="10"
      />
      {/* Progress */}
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={`${filled} ${gap}`}
        strokeDashoffset={circumference / 4}
        transform={`rotate(-90 ${cx} ${cy})`}
        style={{ transition: 'stroke-dasharray 0.8s ease, stroke 0.3s ease' }}
      />
      {/* Label */}
      <text
        x={cx}
        y={cy - 8}
        textAnchor="middle"
        fontSize="24"
        fontWeight="800"
        fill={color}
      >
        {value}%
      </text>
      <text
        x={cx}
        y={cy + 22}
        textAnchor="middle"
        fontSize="12"
        fontWeight="700"
        fill="#374151"
      >
        <tspan x={cx} dy="0">Fake Probability</tspan>
        <tspan x={cx} dy="14">Uwezekano wa</tspan>
        <tspan x={cx} dy="14">uongo</tspan>
      </text>
    </svg>
  );
}
