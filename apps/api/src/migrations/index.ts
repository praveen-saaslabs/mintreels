import { Init1700000000000 } from './0001-init';
import { AuthUsers1700000000001 } from './0002-auth-users';
import { ProjectOwner1700000000002 } from './0003-project-owner';
import { ProcessingPipeline1700000000003 } from './0004-processing-pipeline';
import { ClipThumbnail1700000000004 } from './0005-clip-thumbnail';
import { HookAnalysis1700000000005 } from './0006-hook-analysis';
import { SoftDelete1700000000005 } from './0006-soft-delete';
import { RecordingThumbnail1700000000006 } from './0007-recording-thumbnail';
import { ClipAspectBurn1700000000007 } from './0008-clip-aspect-burn';
import { ClipFitMode1700000000008 } from './0009-clip-fit-mode';
import { HookHeadlineScores1700000000007 } from './0008-hook-headline-scores';
import { RecordingExport1700000000009 } from './0010-recording-export';
import { GuestSessions1700000000010 } from './0011-guest-sessions';
import { ClipSocialCopy1700000000010 } from './0011-clip-social-copy';
import { ClipVoiceover1700000000011 } from './0012-clip-voiceover';
import { RemoveEmailVerification1700000000013 } from './0013-remove-email-verification';

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
  ClipAspectBurn1700000000007,
  ClipFitMode1700000000008,
  HookHeadlineScores1700000000007,
  RecordingExport1700000000009,
  GuestSessions1700000000010,
  ClipSocialCopy1700000000010,
  ClipVoiceover1700000000011,
  RemoveEmailVerification1700000000013,
];
