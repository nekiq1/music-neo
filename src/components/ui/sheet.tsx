import { Dialog, DialogBackdrop, DialogPanel } from '@headlessui/react';
import { useEffect, useRef, type ReactNode } from 'react';
import { LuX } from 'react-icons/lu';
import { cn } from '@/lib/cn';
import { bindBackButton } from '@/lib/tg';
import { Button } from './button';

interface SheetProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  full?: boolean;
  label: string;
  className?: string;
  z?: number;
}

/** Нижняя шторка на телефонах (свайп вниз закрывает), правая панель на десктопе. */
export function Sheet({ open, onClose, children, full, label, className, z = 50 }: SheetProps) {
  const panel = useRef<HTMLDivElement | null>(null);
  const drag = useRef({ y: 0, t: 0, on: false });

  useEffect(() => bindBackButton(open, onClose), [open, onClose]);

  const wide = () => matchMedia('(min-width: 900px)').matches;
  const down = (e: React.PointerEvent) => {
    if (wide()) return;
    drag.current = { y: e.clientY, t: performance.now(), on: true };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const move = (e: React.PointerEvent) => {
    const d = drag.current, el = panel.current;
    if (!d.on || !el) return;
    const dy = Math.max(0, e.clientY - d.y);
    el.dataset.dragging = '';
    el.style.setProperty('--drag', `${dy}px`);
  };
  const up = (e: React.PointerEvent) => {
    const d = drag.current, el = panel.current;
    if (!d.on || !el) return;
    d.on = false;
    const dy = Math.max(0, e.clientY - d.y), v = dy / Math.max(1, performance.now() - d.t);
    delete el.dataset.dragging;
    if (dy > 130 || (v > 0.7 && dy > 40)) onClose();
    el.style.setProperty('--drag', '0px');
  };

  return (
    <Dialog open={open} onClose={onClose} className="relative" style={{ zIndex: z }} aria-label={label}>
      <DialogBackdrop transition className="sheet-backdrop" />
      <DialogPanel transition ref={panel} className={cn('sheet-panel glass glass-sheet', full && 'sheet-full', className)}>
        <div className="touch-none" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
          <div className="sheet-grip" />
        </div>
        {children}
      </DialogPanel>
    </Dialog>
  );
}

export function SheetHeader({ title, onClose, right, drag }: { title: ReactNode; onClose: () => void; right?: ReactNode; drag?: boolean }) {
  return (
    <div className={cn('flex items-center gap-3 px-5 pb-3 pt-1', drag && 'touch-none')}>
      <h2 className="min-w-0 flex-1 truncate text-[22px] font-bold tracking-tight">{title}</h2>
      {right}
      <Button variant="chip" size="icon-sm" onClick={onClose} aria-label="Закрыть"><LuX size={18} /></Button>
    </div>
  );
}
