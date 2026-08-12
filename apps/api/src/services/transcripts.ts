import { notImplemented } from '../middleware';

export const transcriptsService = {
  async getByRecordingId(): Promise<never> {
    notImplemented('transcriptsService.getByRecordingId');
  },
  async getVttByRecordingId(): Promise<never> {
    notImplemented('transcriptsService.getVttByRecordingId');
  },
  async getSummaryByRecordingId(): Promise<never> {
    notImplemented('transcriptsService.getSummaryByRecordingId');
  },
};
