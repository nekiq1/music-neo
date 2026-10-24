import type { ReactNode } from 'react';
import { Skeleton } from './ui/controls';

export function Section({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="rise mb-7">
      <div className="mb-3 flex items-end justify-between gap-3">
        <h2 className="text-[23px] font-bold leading-none tracking-tight">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function CardsSkeleton() {
  return (
    <div className="hscroll" aria-hidden>
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="w-[152px]"><Skeleton className="aspect-square w-full !rounded-[26px]" /><Skeleton className="mt-2.5 h-4 w-3/4" /><Skeleton className="mt-1.5 h-3.5 w-1/2" /></div>
      ))}
    </div>
  );
}

export function RowsSkeleton({ n = 7 }: { n?: number }) {
  return (
    <div aria-hidden className="space-y-2">
      {Array.from({ length: n }, (_, i) => (
        <div key={i} className="flex items-center gap-3 px-2 py-1.5"><Skeleton className="size-[54px] !rounded-[15px]" /><div className="flex-1"><Skeleton className="h-4 w-2/3" /><Skeleton className="mt-2 h-3.5 w-1/3" /></div></div>
      ))}
    </div>
  );
}

export function Empty({ icon, title, text, action }: { icon: ReactNode; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="rise mx-auto flex max-w-sm flex-col items-center px-6 py-14 text-center">
      <span className="glass mb-5 grid size-20 place-items-center rounded-[28px] text-accent [&>svg]:size-9">{icon}</span>
      <h3 className="text-xl font-bold">{title}</h3>
      {text && <p className="mt-1.5 text-[14.5px] leading-snug text-muted">{text}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/** Большой заголовок экрана в стиле iOS */
export function ScreenHeader({ title, subtitle, right }: { title: string; subtitle?: string; right?: ReactNode }) {
  return (
    <header className="flex items-end justify-between gap-3 px-5 pb-3 pt-[calc(var(--sat)+14px)]">
      <div className="min-w-0">
        {subtitle && <p className="truncate text-[13.5px] font-medium text-muted">{subtitle}</p>}
        <h1 className="truncate text-[34px] font-extrabold leading-[1.05] tracking-tight">{title}</h1>
      </div>
      {right}
    </header>
  );
}
