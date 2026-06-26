export type Condition = 'real' | 'mobile' | 'weak';

const OPTIONS: Array<{ value: Condition; label: string }> = [
  { value: 'real', label: 'This connection' },
  { value: 'mobile', label: 'Mobile (sim)' },
  { value: 'weak', label: 'Weak (sim)' },
];

export function NetworkSelector({
  value,
  onChange,
}: {
  value: Condition;
  onChange: (c: Condition) => void;
}) {
  return (
    <div className="segmented" role="tablist" aria-label="Network condition">
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          role="tab"
          aria-selected={value === o.value}
          className={`segmented__btn ${value === o.value ? 'is-active' : ''}`}
          onClick={() => onChange(o.value)}
          type="button"
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
