interface Props {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  color?: string;
  unit?: string;
}

export default function SliderRow({ label, value, min, max, step = 0.01, onChange, color = '#3B82F6', unit = '' }: Props) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between items-center">
        <span className="text-xs text-[var(--text-secondary)] font-medium">{label}</span>
        <span className="text-xs font-mono text-[var(--text-primary)] tabular-nums">
          {value.toFixed(step < 0.1 ? 3 : step < 1 ? 2 : 1)}{unit}
        </span>
      </div>
      <input
        type="range"
        min={min} max={max} step={step}
        value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        style={{ accentColor: color }}
      />
    </div>
  );
}
