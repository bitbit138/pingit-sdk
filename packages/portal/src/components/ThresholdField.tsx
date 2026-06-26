import type { MetricBound } from '@pingit/contracts';

export interface ThresholdFieldProps {
  label: string;
  bound: MetricBound | undefined;
  disabled?: boolean;
  onChange: (next: MetricBound | undefined) => void;
}

/** Parse a number input value; '' clears the bound side. */
function parse(raw: string): number | undefined {
  if (raw.trim() === '') return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

/** A labelled min/max number pair for one metric of a readiness profile. */
export function ThresholdField({ label, bound, disabled, onChange }: ThresholdFieldProps) {
  const emit = (min: number | undefined, max: number | undefined) => {
    if (min === undefined && max === undefined) {
      onChange(undefined);
      return;
    }
    const next: MetricBound = {};
    if (min !== undefined) next.min = min;
    if (max !== undefined) next.max = max;
    onChange(next);
  };

  return (
    <div className="threshold">
      <div className="threshold__label">{label}</div>
      <div className="threshold__inner">
        <span>min</span>
        <input
          type="number"
          step="any"
          aria-label={`${label} min`}
          disabled={disabled}
          value={bound?.min ?? ''}
          onChange={(e) => emit(parse(e.target.value), bound?.max)}
        />
      </div>
      <div className="threshold__inner">
        <span>max</span>
        <input
          type="number"
          step="any"
          aria-label={`${label} max`}
          disabled={disabled}
          value={bound?.max ?? ''}
          onChange={(e) => emit(bound?.min, parse(e.target.value))}
        />
      </div>
    </div>
  );
}
