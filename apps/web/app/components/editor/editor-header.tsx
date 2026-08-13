import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export function EditorHeader({ title }: Readonly<{ title: string }>) {
  return (
    <header className="flex h-[52px] shrink-0 items-center gap-3 border-b border-[var(--glass-border-subtle)] px-4">
      <Link
        to="/"
        className="inline-flex shrink-0 items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Back
      </Link>
      <span className="text-muted-foreground/60" aria-hidden>
        |
      </span>
      <h1 className="min-w-0 truncate text-sm font-semibold tracking-[-0.01em] text-foreground">
        {title}
      </h1>
    </header>
  );
}
