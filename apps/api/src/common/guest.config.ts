import { EnvKey } from '@mintreels/schema';
import { isProduction } from './auth.config';

export const GUEST_COOKIE_NAME = 'guest_session';

/** Defaults — every value is overridable via env (see .env.example). */
const DEFAULT_SESSION_TTL_SECONDS = 24 * 60 * 60; // 24h
const DEFAULT_DATA_RETENTION_SECONDS = 72 * 60 * 60; // 72h
const DEFAULT_MAX_PROJECTS = 1;
const DEFAULT_MAX_RECORDINGS = 3;
const DEFAULT_REQUESTS_PER_MINUTE = 100;
const DEFAULT_UPLOADS_PER_HOUR = 5;
const DEFAULT_TRANSCRIPTIONS_PER_HOUR = 3;
const DEFAULT_AI_GENERATIONS_PER_HOUR = 5;
const DEFAULT_SESSION_CREATIONS_PER_IP_PER_HOUR = 10;

export interface GuestConfig {
  enabled: boolean;
  sessionTtlSeconds: number;
  dataRetentionSeconds: number;
  maxProjects: number;
  maxRecordings: number;
  requestsPerMinute: number;
  uploadsPerHour: number;
  transcriptionsPerHour: number;
  aiGenerationsPerHour: number;
  sessionCreationsPerIpPerHour: number;
}

function parsePositive(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt((value ?? '').trim(), 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

/** Guests are enabled by default; set GUEST_ENABLED=false to turn off. */
function parseEnabled(value: string | undefined): boolean {
  return (value?.trim().toLowerCase() ?? 'true') !== 'false';
}

export function loadGuestConfig(): GuestConfig {
  return {
    enabled: parseEnabled(process.env[EnvKey.GuestEnabled]),
    sessionTtlSeconds: parsePositive(
      process.env[EnvKey.GuestSessionTtlSeconds],
      DEFAULT_SESSION_TTL_SECONDS,
    ),
    dataRetentionSeconds: parsePositive(
      process.env[EnvKey.GuestDataRetentionSeconds],
      DEFAULT_DATA_RETENTION_SECONDS,
    ),
    maxProjects: parsePositive(process.env[EnvKey.GuestMaxProjects], DEFAULT_MAX_PROJECTS),
    maxRecordings: parsePositive(process.env[EnvKey.GuestMaxRecordings], DEFAULT_MAX_RECORDINGS),
    requestsPerMinute: parsePositive(
      process.env[EnvKey.GuestRequestsPerMinute],
      DEFAULT_REQUESTS_PER_MINUTE,
    ),
    uploadsPerHour: parsePositive(process.env[EnvKey.GuestUploadsPerHour], DEFAULT_UPLOADS_PER_HOUR),
    transcriptionsPerHour: parsePositive(
      process.env[EnvKey.GuestTranscriptionsPerHour],
      DEFAULT_TRANSCRIPTIONS_PER_HOUR,
    ),
    aiGenerationsPerHour: parsePositive(
      process.env[EnvKey.GuestAiGenerationsPerHour],
      DEFAULT_AI_GENERATIONS_PER_HOUR,
    ),
    sessionCreationsPerIpPerHour: parsePositive(
      process.env[EnvKey.GuestSessionCreationsPerIpPerHour],
      DEFAULT_SESSION_CREATIONS_PER_IP_PER_HOUR,
    ),
  };
}

export function guestCookieOptions(ttlSeconds: number): {
  httpOnly: true;
  secure: boolean;
  sameSite: 'lax';
  path: '/';
  maxAge: number;
} {
  return {
    httpOnly: true,
    secure: isProduction(),
    sameSite: 'lax',
    path: '/',
    maxAge: ttlSeconds * 1000,
  };
}
