import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';
import { tap } from '@/lib/settings';

// shadcn-стиль: cva-варианты + tailwind-merge
export const buttonVariants = cva(
  'press inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap font-semibold select-none disabled:pointer-events-none disabled:opacity-40',
  {
    variants: {
      variant: {
        glass: 'glass text-fg',
        solid: 'bg-accent text-on-accent shadow-[0_8px_24px_-6px_color-mix(in_srgb,var(--accent)_70%,transparent),inset_0_1px_0_rgba(255,255,255,.45)]',
        ghost: 'text-muted hover:text-fg hover:bg-[var(--chip)]',
        chip: 'glass-chip text-fg',
        danger: 'bg-danger/15 text-danger border border-danger/30',
      },
      size: {
        sm: 'h-9 rounded-full px-3.5 text-[13px]',
        md: 'h-11 rounded-full px-5 text-[15px]',
        lg: 'h-14 rounded-full px-7 text-base',
        icon: 'size-11 rounded-full',
        'icon-sm': 'size-9 rounded-full',
        'icon-lg': 'size-16 rounded-full',
      },
    },
    defaultVariants: { variant: 'glass', size: 'md' },
  },
);

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  haptic?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, haptic = true, onClick, type = 'button', ...p }, ref) => (
  <button
    ref={ref}
    type={type}
    className={cn(buttonVariants({ variant, size }), className)}
    onClick={e => { if (haptic) tap('light'); onClick?.(e); }}
    {...p}
  />
));
Button.displayName = 'Button';
