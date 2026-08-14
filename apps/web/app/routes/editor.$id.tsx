import type { ReactNode } from 'react';
import { useParams } from 'react-router-dom';
import { EditorHeader } from '@/components/editor/editor-header';
import { NewProjectUploadModal } from '@/components/editor/new-project-upload-modal';
import { ProcessingStatusChip } from '@/components/editor/processing-status-chip';
import { Summary } from '@/components/summary/summary';
import { Transcriptions } from '@/components/transcript/transcriptions';
import { EditorLayout } from '@/components/video/editor-layout';
import { Timeline } from '@/components/video/timeline';
import { VideoPlayer } from '@/components/video/video-player';
import { Button } from '@/components/ui/button';
import { useProjectsQuery } from '@/hooks/use-home-queries';
import { useProjectEditor } from '@/hooks/use-project-editor';
import { parsePositiveIntId, RecordingIdProvider } from '@/lib/recording-id';

function EditorChrome({
  title,
  projectId,
  recordingId,
  children,
}: Readonly<{
  title: string;
  projectId?: number | undefined;
  recordingId?: number | undefined;
  children: ReactNode;
}>) {
  return (
    <div className="mr-ambient flex h-svh flex-col">
      <EditorHeader title={title} projectId={projectId} recordingId={recordingId} />
      <div className="relative min-h-0 flex-1">{children}</div>
    </div>
  );
}

function EditorStatusPanel({
  title,
  description,
  onRetry,
}: Readonly<{
  title: string;
  description: string;
  onRetry?: () => void;
}>) {
  return (
    <section className="flex h-full items-center justify-center p-6">
      <div className="glass w-full max-w-md space-y-4 rounded p-6">
        <div className="space-y-1.5">
          <h1 className="text-xl font-semibold tracking-[-0.02em]">{title}</h1>
          <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
        </div>
        {onRetry ? (
          <div className="flex justify-end">
            <Button type="button" variant="outline" onClick={onRetry}>
              Retry
            </Button>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function resolveProjectName(
  projectId: number,
  projects: Array<{ id: number; name: string }> | undefined,
  recordingTitle: string,
): string {
  const fromList = projects?.find((project) => project.id === projectId)?.name?.trim();
  if (fromList) {
    return fromList;
  }
  const fromRecording = recordingTitle.trim();
  if (fromRecording) {
    return fromRecording;
  }
  return 'Project';
}

function ProjectEditor({ projectId }: Readonly<{ projectId: number }>) {
  const { data: projects } = useProjectsQuery();
  const {
    phase,
    recordingId,
    recordingTitle,
    processing,
    videoSrc,
    thumbnailUrl,
    audioUrl,
    summaryText,
    pending,
    errorMessage,
    isRetrying,
    retryIngest,
    refetch,
  } = useProjectEditor(projectId);
  const projectName = resolveProjectName(projectId, projects, recordingTitle);

  if (phase === 'resolving') {
    return (
      <EditorChrome title={projectName} projectId={projectId}>
        <EditorStatusPanel
          title="Loading project"
          description="Resolving the recording and checking ingest status…"
        />
      </EditorChrome>
    );
  }

  if (phase === 'missing') {
    return (
      <EditorChrome title={projectName} projectId={projectId}>
        <EditorStatusPanel
          title="Recording not found"
          description={errorMessage ?? 'This project has no recording yet.'}
          onRetry={refetch}
        />
      </EditorChrome>
    );
  }

  if (phase === 'error') {
    return (
      <EditorChrome title={projectName} projectId={projectId}>
        <EditorStatusPanel
          title="Could not load editor"
          description={errorMessage ?? 'Something went wrong while loading this project.'}
          onRetry={refetch}
        />
      </EditorChrome>
    );
  }

  if (recordingId === undefined) {
    return (
      <EditorChrome title={projectName} projectId={projectId}>
        <EditorStatusPanel
          title="Opening editor"
          description="Loading transcript, summary, and hooks…"
        />
      </EditorChrome>
    );
  }

  return (
    <RecordingIdProvider value={recordingId}>
      <EditorChrome title={projectName} projectId={projectId} recordingId={recordingId}>
        <EditorLayout
          area1={<Transcriptions pending={pending.transcript} />}
          area2={
            <div className="relative h-full min-h-0 w-full">
              <ProcessingStatusChip
                phase={phase}
                processing={processing}
                errorMessage={errorMessage}
                retrying={isRetrying}
                onRetry={() => {
                  void retryIngest();
                }}
              />
              <VideoPlayer src={videoSrc} pending={pending.video} poster={thumbnailUrl} />
            </div>
          }
          area3={<Timeline audioUrl={audioUrl} pending={pending.waveform} />}
          area4={
            <Summary
              text={summaryText}
              pendingHooks={pending.hooks}
              pendingSummary={pending.summary}
            />
          }
        />
      </EditorChrome>
    </RecordingIdProvider>
  );
}

export function EditorPage() {
  const { id } = useParams();
  const isNewProject = id === 'new';
  const projectId = parsePositiveIntId(id);

  if (isNewProject) {
    return (
      <div className="mr-ambient min-h-svh">
        <NewProjectUploadModal />
      </div>
    );
  }

  if (projectId === undefined) {
    return (
      <EditorChrome title="Project">
        <EditorStatusPanel
          title="Invalid project"
          description="The editor URL must use a numeric project id."
        />
      </EditorChrome>
    );
  }

  return <ProjectEditor projectId={projectId} />;
}
