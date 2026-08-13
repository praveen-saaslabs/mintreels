import type { ReactNode } from 'react';
import * as Space from 'react-spaces';

type EditorLayoutProps = {
  area1: ReactNode;
  area2: ReactNode;
  area3: ReactNode;
  area4: ReactNode;
};

export function EditorLayout({ area1, area2, area3, area4 }: EditorLayoutProps) {
  return (
    <Space.ViewPort>
      <Space.LeftResizable size="25%" minimumSize={180} maximumSize={560}>
        {area1}
      </Space.LeftResizable>
      <Space.Fill>
        <Space.Fill>{area2}</Space.Fill>
        {/* Wave (~72) + strip + hook thumbs need ~300px; cap so video keeps room */}
        <Space.BottomResizable size="30%" minimumSize={300} maximumSize={380}>
          {area3}
        </Space.BottomResizable>
      </Space.Fill>
      <Space.RightResizable size="25%" minimumSize={180} maximumSize={560}>
        {area4}
      </Space.RightResizable>
    </Space.ViewPort>
  );
}

export function EditorPane({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex h-full min-h-0 w-full flex-col border border-border bg-background">
      <header className="shrink-0 border-b border-border px-3 py-2">
        <h2 className="text-sm font-medium text-foreground">{title}</h2>
      </header>
      <div className="min-h-0 flex-1 overflow-auto p-3">{children}</div>
    </section>
  );
}
