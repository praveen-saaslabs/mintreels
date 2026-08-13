import { Init1700000000000 } from './0001-init';
import { AuthUsers1700000000001 } from './0002-auth-users';
import { ProjectOwner1700000000002 } from './0003-project-owner';
import { ProcessingPipeline1700000000003 } from './0004-processing-pipeline';

// Keep this list ordered. New migrations get appended here.
export const migrations = [
  Init1700000000000,
  AuthUsers1700000000001,
  ProjectOwner1700000000002,
  ProcessingPipeline1700000000003,
];
