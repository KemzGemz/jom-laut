'use client';

import { Icon } from './Icon';

export function Stepper({ value, min = 1, max, onChange, label }: { value: number; min?: number; max: number; onChange: (n: number) => void; label: string }) {
  return (
    <div className="stepper" role="group" aria-label={label}>
      <button type="button" className="icon-btn outlined" onClick={() => onChange(value - 1)} disabled={value <= min} aria-label={`Fewer ${label}`}>
        <Icon name="minus" size={16} />
      </button>
      <span className="stepper-value" aria-live="polite">{value}</span>
      <button type="button" className="icon-btn outlined" onClick={() => onChange(value + 1)} disabled={value >= max} aria-label={`More ${label}`}>
        <Icon name="plus" size={16} />
      </button>
    </div>
  );
}
