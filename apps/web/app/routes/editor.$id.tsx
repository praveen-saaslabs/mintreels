import { useParams } from 'react-router-dom';
import { NewProjectUploadModal } from '@/components/editor/new-project-upload-modal';
import { ProcessingStatusChip } from '@/components/editor/processing-status-chip';
import { Summary } from '@/components/summary/summary';
import { Transcriptions } from '@/components/transcript/transcriptions';
import { EditorLayout } from '@/components/video/editor-layout';
import { Timeline } from '@/components/video/timeline';
import { VideoPlayer } from '@/components/video/video-player';
import { Button } from '@/components/ui/button';
import { useProjectEditor } from '@/hooks/use-project-editor';
import { parsePositiveIntId, RecordingIdProvider } from '@/lib/recording-id';

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
    <section className="mr-ambient flex min-h-svh items-center justify-center p-6">
      <div className="glass w-full max-w-md space-y-4 rounded-2xl p-6">
        <div className="space-y-1.5">
          <h1 className="text-xl font-semibold tracking-[-0.02em]">{title}</h1>
          <p className="text-sm text-muted-foreground">{description}</p>
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

function ProjectEditor({ projectId }: Readonly<{ projectId: number }>) {
  const { phase, recordingId, processing, videoSrc, summaryText, errorMessage, refetch } =
    useProjectEditor(projectId);

  if (phase === 'resolving') {
    return (
      <EditorStatusPanel
        title="Loading project"
        description="Resolving the recording and checking ingest status…"
      />
    );
  }

  if (phase === 'missing') {
    return (
      <EditorStatusPanel
        title="Recording not found"
        description={errorMessage ?? 'This project has no recording yet.'}
        onRetry={refetch}
      />
    );
  }

  if (phase === 'error') {
    return (
      <EditorStatusPanel
        title="Could not load editor"
        description={errorMessage ?? 'Something went wrong while loading this project.'}
        onRetry={refetch}
      />
    );
  }

  if (recordingId === undefined) {
    return (
      <EditorStatusPanel
        title="Opening editor"
        description="Loading transcript, summary, and hooks…"
      />
    );
  }

  return (
    <RecordingIdProvider value={recordingId}>
      <div className="relative h-svh w-full">
        <EditorLayout
          area1={<Transcriptions />}
          area2={
            <div className="relative h-full min-h-0 w-full">
              <ProcessingStatusChip
                phase={phase}
                processing={processing}
                errorMessage={errorMessage}
                onRetry={refetch}
              />
              <VideoPlayer src={videoSrc} />
            </div>
          }
          area3={<Timeline audioUrl="" />}
          area4={<Summary text={summaryText} />}
        />
      </div>
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
      <EditorStatusPanel
        title="Invalid project"
        description="The editor URL must use a numeric project id."
      />
    );
  }

  return <ProjectEditor projectId={projectId} />;
}
