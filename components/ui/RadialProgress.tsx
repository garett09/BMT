import clsx from "clsx";

export function RadialProgress({
  value,
  max,
  size = 96,
  stroke = 8,
  className,
  label,
}: {
  value: number;
  max: number;
  size?: number;
  stroke?: number;
  className?: string;
  label?: string;
}) {
  const pct = Math.max(0, Math.min(1, max > 0 ? value / max : 0));
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const dash = circ * pct;
  return (
    <div className={clsx("relative inline-block", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size/2} cy={size/2} r={r} stroke="var(--border)" strokeWidth={stroke} fill="none" />
        <circle
          cx={size/2}
          cy={size/2}
          r={r}
          stroke="url(#grad)"
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={`${dash} ${circ - dash}`}
          strokeLinecap="round"
          transform={`rotate(-90 ${size/2} ${size/2})`}
        />
        <defs>
          <linearGradient id="grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#a855f7" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div className="text-xs text-[var(--muted)]">{label || "Progress"}</div>
        <div className="text-sm font-semibold">{Math.round(pct*100)}%</div>
      </div>
    </div>
  );
}


