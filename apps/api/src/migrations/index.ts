import { Init1700000000000 } from './0001-init';
import { AuthUsers1700000000001 } from './0002-auth-users';
import { ProjectOwner1700000000002 } from './0003-project-owner';
import { ProcessingPipeline1700000000003 } from './0004-processing-pipeline';
import { ClipThumbnail1700000000004 } from './0005-clip-thumbnail';
import { HookAnalysis1700000000005 } from './0006-hook-analysis';
import { SoftDelete1700000000005 } from './0006-soft-delete';
import { RecordingThumbnail1700000000006 } from './0007-recording-thumbnail';
import { HookHeadlineScores1700000000007 } from './0008-hook-headline-scores';

// Keep this list ordered. New migrations get appended here.
export const migrations = [
  Init1700000000000,
  AuthUsers1700000000001,
  ProjectOwner1700000000002,
  ProcessingPipeline1700000000003,
  ClipThumbnail1700000000004,
  HookAnalysis1700000000005,
  SoftDelete1700000000005,
  RecordingThumbnail1700000000006,
  HookHeadlineScores1700000000007,
];
