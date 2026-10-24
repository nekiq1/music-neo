import { useId, type CSSProperties, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { tap } from '@/lib/settings';

// ── Switch ──
export function Switch({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button" role="switch" aria-checked={checked} aria-label={label} disabled={disabled}
      onClick={() => { tap('select'); onChange(!checked); }}
      className={cn('relative h-8 w-[52px] shrink-0 rounded-full border border-[var(--line)] transition-colors duration-300 disabled:opacity-40', checked ? 'bg-accent' : 'bg-[var(--chip)]')}
    >
      <span className={cn('absolute left-0.5 top-0.5 size-7 rounded-full bg-white shadow-[0_2px_8px_rgba(0,0,0,.35)] transition-transform duration-300 ease-[var(--ease-ios)]', checked && 'translate-x-5')} />
    </button>
  );
}

// ── Segmented ──
export function Segmented<T extends string>({ value, options, onChange, label, className }: {
  value: T; options: { id: T; label: ReactNode; aria?: string }[]; onChange: (v: T) => void; label: string; className?: string;
}) {
  const i = Math.max(0, options.findIndex(o => o.id === value));
  return (
    <div role="radiogroup" aria-label={label} className={cn('glass-chip relative grid rounded-full p-1', className)} style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}>
      <span
        aria-hidden className="absolute bottom-1 left-1 top-1 rounded-full bg-[color-mix(in_srgb,var(--fg)_16%,transparent)] shadow-[inset_0_1px_0_rgba(255,255,255,.3)] transition-transform duration-500 ease-[var(--ease-ios)]"
        style={{ width: `calc((100% - 8px) / ${options.length})`, transform: `translateX(${i * 100}%)` }}
      />
      {options.map(o => (
        <button
          key={o.id} role="radio" aria-checked={o.id === value} aria-label={o.aria}
          onClick={() => { if (o.id !== value) { tap('select'); onChange(o.id); } }}
          className={cn('relative z-10 flex h-9 items-center justify-center gap-1.5 rounded-full px-2 text-[13px] font-semibold transition-colors', o.id === value ? 'text-fg' : 'text-muted')}
        >{o.label}</button>
      ))}
    </div>
  );
}

// ── Range (слайдер) ──
export function Range({ value, min = 0, max = 1, step = 0.001, onChange, onCommit, label, className, accent, disabled }: {
  value: number; min?: number; max?: number; step?: number; onChange: (v: number) => void; onCommit?: (v: number) => void; label: string; className?: string; accent?: boolean; disabled?: boolean;
}) {
  const id = useId();
  const p = max > min ? ((value - min) / (max - min)) * 100 : 0;
  return (
    <input
      id={id} type="range" aria-label={label} min={min} max={max} step={step} value={Number.isFinite(value) ? value : 0} disabled={disabled}
      className={cn('range', accent && 'range-accent', disabled && 'opacity-40', className)}
      style={{ '--p': `${p}%` } as CSSProperties}
      onChange={e => onChange(+e.target.value)}
      onPointerUp={e => onCommit?.(+(e.target as HTMLInputElement).value)}
      onKeyUp={e => onCommit?.(+(e.target as HTMLInputElement).value)}
    />
  );
}

// ── Skeleton ──
export const Skeleton = ({ className }: { className?: string }) => <div aria-hidden className={cn('skeleton rounded-2xl', className)} />;

// ── Строка настроек ──
export function SettingRow({ icon, title, desc, right, onClick }: { icon?: ReactNode; title: string; desc?: string; right?: ReactNode; onClick?: () => void }) {
  const inner = (
    <>
      {icon && <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[var(--chip)] text-fg">{icon}</span>}
      <span className="min-w-0 flex-1 text-left">
        <span className="block text-[15px] font-semibold leading-tight">{title}</span>
        {desc && <span className="mt-0.5 block text-[12.5px] leading-snug text-muted">{desc}</span>}
      </span>
      {right}
    </>
  );
  const cls = 'flex w-full items-center gap-3 py-2.5';
  return onClick ? <button type="button" className={cn(cls, 'press')} onClick={onClick}>{inner}</button> : <div className={cls}>{inner}</div>;
}

export const Group = ({ title, children, hint }: { title?: string; children: ReactNode; hint?: string }) => (
  <section className="mb-5">
    {title && <h3 className="mb-2 px-1 text-[12px] font-bold uppercase tracking-[0.08em] text-faint">{title}</h3>}
    <div className="glass-chip divide-y divide-[var(--line)] rounded-3xl px-4">{children}</div>
    {hint && <p className="mt-2 px-2 text-[12px] leading-snug text-faint">{hint}</p>}
  </section>
);
