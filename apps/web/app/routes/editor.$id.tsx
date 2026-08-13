import { useEffect } from 'react';
import { Summary } from '@/components/summary/summary';
import { Transcriptions } from '@/components/transcript/transcriptions';
import { EditorLayout } from '@/components/video/editor-layout';
import { Timeline } from '@/components/video/timeline';
import { VideoPlayer } from '@/components/video/video-player';
import { useRecordingId } from '@/lib/recording-id';
import { useEditorStore } from '@/stores/editor-store';

export function EditorPage() {
  const recordingId = useRecordingId();
  const resetVideo = useEditorStore((state) => state.resetVideo);

  useEffect(() => {
    resetVideo();
  }, [recordingId, resetVideo]);

  if (recordingId === undefined) {
    return (
      <section className="p-6">
        <h1 className="text-2xl font-semibold">Editor</h1>
        <p className="mt-2 text-sm text-neutral-600">Invalid recording id.</p>
      </section>
    );
  }

  return (
    <EditorLayout
      area1={<Transcriptions />}
      area2={<VideoPlayer />}
      area3={<Timeline />}
      area4={<Summary />}
    />
  );
}
