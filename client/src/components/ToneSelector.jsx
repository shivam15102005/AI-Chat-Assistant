import {
  Check,
  ChevronDown,
} from 'lucide-react';

const tones = [
  {
    value: 'professional',
    label: 'Professional',
    description: 'Clear and formal',
  },

  {
    value: 'casual',
    label: 'Casual',
    description: 'Friendly and conversational',
  },

  {
    value: 'concise',
    label: 'Concise',
    description: 'Brief and direct',
  },
];

export default function ToneSelector({
  value,
  onChange,
  disabled,
}) {
  return (
    <label className="relative inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus-within:border-slate-400">

      <span className="hidden text-xs font-medium uppercase tracking-[0.12em] text-slate-400 sm:inline">
        Tone
      </span>

      <select
        value={value}
        onChange={(event) =>
          onChange(
            event.target.value
          )
        }
        disabled={disabled}
        className="appearance-none bg-transparent pr-5 font-medium text-slate-700 outline-none disabled:cursor-not-allowed disabled:opacity-60"
        aria-label="Response tone"
      >
        {tones.map((tone) => (
          <option
            key={tone.value}
            value={tone.value}
          >
            {tone.label} —{' '}
            {tone.description}
          </option>
        ))}
      </select>

      <ChevronDown
        size={15}
        className="pointer-events-none absolute right-2 text-slate-400"
        aria-hidden="true"
      />

      <Check
        size={14}
        className="hidden text-emerald-500"
        aria-hidden="true"
      />
    </label>
  );
}