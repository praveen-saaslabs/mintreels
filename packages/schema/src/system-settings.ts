import { z } from 'zod';
import { idSchema } from './common';
import { SettingKey } from './enums';

export const settingKeySchema = z.enum([SettingKey.HookWeights]);

/**
 * Hook scoring weights configuration.
 * Each weight must be between 0 and 1, and all weights must sum to 1.0.
 */
export const hookWeightsSchema = z
  .object({
    quality: z.number().min(0).max(1),
    standalone: z.number().min(0).max(1),
    curiosity: z.number().min(0).max(1),
    emotional: z.number().min(0).max(1),
    specificity: z.number().min(0).max(1),
    shareability: z.number().min(0).max(1),
    novelty: z.number().min(0).max(1),
    controversy: z.number().min(0).max(1),
    headline: z.number().min(0).max(1),
  })
  .refine(
    (weights) => {
      const sum = Object.values(weights).reduce((a, b) => a + b, 0);
      return Math.abs(sum - 1.0) <= 0.01;
    },
    { message: 'Weights must sum to 1.0 (±0.01 tolerance)' },
  );

/**
 * System settings table row schema.
 */
export const systemSettingsRowSchema = z.object({
  id: idSchema,
  settingKey: settingKeySchema,
  settingValue: z.record(z.string(), z.any()), // JSON column - validated by specific schemas
  description: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

/**
 * Schema for inserting system settings.
 */
export const systemSettingsInsertSchema = systemSettingsRowSchema.partial({
  id: true,
  createdAt: true,
  updatedAt: true,
});

/**
 * Schema for updating system settings.
 */
export const systemSettingsUpdateSchema = systemSettingsRowSchema
  .pick({
    settingValue: true,
    description: true,
  })
  .partial();

// Type exports
export type HookWeightsSettings = z.infer<typeof hookWeightsSchema>;
export type SystemSettingsRow = z.infer<typeof systemSettingsRowSchema>;
export type SystemSettingsInsert = z.infer<typeof systemSettingsInsertSchema>;
export type SystemSettingsUpdate = z.infer<typeof systemSettingsUpdateSchema>;

// Default hook weights (matching current environment variable defaults)
export const DEFAULT_HOOK_WEIGHTS: HookWeightsSettings = {
  quality: 0.22,
  standalone: 0.15,
  curiosity: 0.12,
  emotional: 0.08,
  specificity: 0.08,
  shareability: 0.08,
  novelty: 0.04,
  controversy: 0.12,
  headline: 0.11,
};
