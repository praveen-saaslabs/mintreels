import { useEffect, type ReactNode } from 'react';
import * as Space from 'react-spaces';
import { beginDragSelectSuppression } from '@/lib/drag-select-guard';

type EditorLayoutProps = {
  area1: ReactNode;
  area2: ReactNode;
  area3: ReactNode;
  area4: ReactNode;
};

function isSpacesResizeHandle(target: EventTarget | null): boolean {
  return target instanceof Element && Boolean(target.closest('.spaces-resize-handle'));
}

export function EditorLayout({ area1, area2, area3, area4 }: EditorLayoutProps) {
  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0 || !isSpacesResizeHandle(event.target)) {
        return;
      }
      event.preventDefault();
      beginDragSelectSuppression();
    };

    // Capture so we run before react-spaces handlers and clear any nascent selection.
    document.addEventListener('pointerdown', onPointerDown, true);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true);
    };
  }, []);

  return (
    <Space.Fill className="mr-editor">
      <Space.LeftResizable size="25%" minimumSize={180} maximumSize={560}>
        {area1}
      </Space.LeftResizable>
      <Space.Fill>
        <Space.Fill>{area2}</Space.Fill>
        {/* Wave (~72) + speaker lane + padding */}
        <Space.BottomResizable size="18%" minimumSize={140} maximumSize={240}>
          {area3}
        </Space.BottomResizable>
      </Space.Fill>
      <Space.RightResizable size="25%" minimumSize={180} maximumSize={560}>
        {area4}
      </Space.RightResizable>
    </Space.Fill>
  );
}

export function EditorPane({
  title,
  header,
  children,
}: {
  title?: string;
  header?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="glass-panel m-1.5 flex h-[calc(100%-0.75rem)] min-h-0 w-[calc(100%-0.75rem)] flex-col overflow-hidden">
      <header className="shrink-0 border-b border-[var(--glass-border-subtle)] pt-2 pl-3">
        {header ?? <h2 className="text-sm font-medium text-foreground">{title}</h2>}
      </header>
      <div className="min-h-0 flex-1 overflow-auto p-3">{children}</div>
    </section>
  );
}
