import { useEffect, type ReactNode } from 'react';
import * as Space from 'react-spaces';
import { suppressSelectionOnPointerDown } from '@/lib/drag-select-guard';

type EditorLayoutProps = {
  area1: ReactNode;
  area2: ReactNode;
  area3: ReactNode;
  area4: ReactNode;
};

/** Shared splitter hit-target — overlay the seam so flush panes don't swallow drags. */
const PANE_RESIZE = {
  handleSize: 10,
  touchHandleSize: 20,
  handlePlacement: 'overlay-boundary' as const,
};

function isSpacesResizeHandle(target: EventTarget | null): boolean {
  return target instanceof Element && Boolean(target.closest('.spaces-resize-handle'));
}

export function EditorLayout({ area1, area2, area3, area4 }: EditorLayoutProps) {
  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (!isSpacesResizeHandle(event.target)) {
        return;
      }
      // Do not preventDefault — react-spaces starts resize on mousedown.
      suppressSelectionOnPointerDown(event);
    };

    document.addEventListener('pointerdown', onPointerDown, true);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true);
    };
  }, []);

  return (
    <Space.Fill className="mr-editor">
      <Space.LeftResizable size="25%" minimumSize={180} maximumSize={560} {...PANE_RESIZE}>
        {area1}
      </Space.LeftResizable>
      <Space.Fill>
        <Space.Fill>{area2}</Space.Fill>
        <Space.BottomResizable size="18%" minimumSize={140} maximumSize={420} {...PANE_RESIZE}>
          {area3}
        </Space.BottomResizable>
      </Space.Fill>
      <Space.RightResizable size="25%" minimumSize={180} maximumSize={560} {...PANE_RESIZE}>
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
    <section className="flex h-full min-h-0 w-full flex-col overflow-hidden border-l border-[var(--glass-border-subtle)]">
      <header className="shrink-0 border-b border-[var(--glass-border-subtle)] pt-2 pl-3">
        {header ?? <h2 className="text-sm font-medium text-foreground">{title}</h2>}
      </header>
      <div className="min-h-0 flex-1 overflow-auto p-3">{children}</div>
    </section>
  );
}
