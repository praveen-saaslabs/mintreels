import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

const MARK_SRC = '/brand/mark.png';

type BrandLogoProps = Readonly<{
  /** `mark` = icon only; `full` = icon + MintReels wordmark (theme-aware text). */
  variant?: 'mark' | 'full';
  to?: string;
  className?: string;
  markClassName?: string;
  /** Hide the wordmark via CSS (e.g. collapsed sidebar). */
  wordmarkClassName?: string;
}>;

export function BrandLogo({
  variant = 'full',
  to = '/',
  className,
  markClassName,
  wordmarkClassName,
}: BrandLogoProps) {
  const content = (
    <>
      <img
        src={MARK_SRC}
        alt=""
        width={96}
        height={96}
        decoding="async"
        className={cn('size-7 shrink-0 object-contain', markClassName)}
        aria-hidden
      />
      {variant === 'full' ? (
        <span
          className={cn(
            'truncate font-semibold tracking-[-0.01em] text-foreground',
            wordmarkClassName,
          )}
        >
          MintReels
        </span>
      ) : null}
    </>
  );

  if (to) {
    return (
      <Link
        to={to}
        className={cn('inline-flex min-w-0 items-center gap-2 text-inherit', className)}
        aria-label="MintReels home"
      >
        {content}
      </Link>
    );
  }

  return (
    <span className={cn('inline-flex min-w-0 items-center gap-2', className)} aria-label="MintReels">
      {content}
    </span>
  );
}
