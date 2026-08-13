import { useState } from 'react';
import { downloadFilestackMedia } from '@/lib/filestack-playback';

export function useClipDownload() {
  const [isDownloading, setIsDownloading] = useState(false);

  async function download(url: string, filename: string): Promise<void> {
    if (isDownloading) {
      return;
    }
    setIsDownloading(true);
    try {
      await downloadFilestackMedia(url, filename);
    } finally {
      setIsDownloading(false);
    }
  }

  return { isDownloading, download };
}
