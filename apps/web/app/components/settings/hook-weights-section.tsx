import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import {
  useHookWeightsQuery,
  useUpdateHookWeightsMutation,
  useResetHookWeightsMutation,
} from '@/hooks/use-home-queries';
import type { HookWeightsSettings } from '@mintreels/schema';

const HOOK_DIMENSIONS = [
  { key: 'quality', label: 'Quality', description: 'Overall content quality and production value' },
  { key: 'standalone', label: 'Standalone', description: 'How well content works independently' },
  { key: 'curiosity', label: 'Curiosity', description: 'Ability to spark viewer interest' },
  { key: 'emotional', label: 'Emotional', description: 'Emotional impact and resonance' },
  { key: 'specificity', label: 'Specificity', description: 'Concrete, specific details vs. generic content' },
  { key: 'shareability', label: 'Shareability', description: 'Likelihood of being shared on social media' },
  { key: 'novelty', label: 'Novelty', description: 'Uniqueness and freshness of content' },
  { key: 'controversy', label: 'Controversy', description: 'Ability to generate discussion/debate' },
  { key: 'headline', label: 'Headline', description: 'Headline-worthy or attention-grabbing nature' },
] as const;

export function HookWeightsSection() {
  const { data: weights, isLoading, error } = useHookWeightsQuery();
  const updateMutation = useUpdateHookWeightsMutation();
  const resetMutation = useResetHookWeightsMutation();

  const [localWeights, setLocalWeights] = useState<HookWeightsSettings | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (weights) {
      setLocalWeights(weights);
      setHasChanges(false);
    }
  }, [weights]);

  const updateWeight = (key: keyof HookWeightsSettings, value: number) => {
    if (!localWeights) return;

    const newWeights = { ...localWeights, [key]: value };
    setLocalWeights(newWeights);
    setHasChanges(true);
  };

  const normalizeWeights = () => {
    if (!localWeights) return;

    const sum = Object.values(localWeights).reduce((acc, val) => acc + val, 0);
    if (sum === 0) return;

    const normalized = Object.keys(localWeights).reduce((acc, key) => ({
      ...acc,
      [key]: localWeights[key as keyof HookWeightsSettings] / sum,
    }), {} as HookWeightsSettings);

    setLocalWeights(normalized);
    setHasChanges(true);
  };

  const saveWeights = async () => {
    if (!localWeights) return;

    try {
      await updateMutation.mutateAsync(localWeights);
      setHasChanges(false);
    } catch (error) {
      console.error('Failed to save weights:', error);
    }
  };

  const resetToDefaults = async () => {
    try {
      const defaultWeights = await resetMutation.mutateAsync();
      setLocalWeights(defaultWeights);
      setHasChanges(false);
    } catch (error) {
      console.error('Failed to reset weights:', error);
    }
  };

  const currentSum = localWeights ? Object.values(localWeights).reduce((acc, val) => acc + val, 0) : 0;
  const sumValid = Math.abs(currentSum - 1.0) <= 0.01;

  if (error) {
    return (
      <section className="flex flex-col gap-3">
        <div className="text-[11px] font-semibold tracking-[0.06em] text-[var(--mr-mfg)] uppercase">
          Hook Scoring Weights
        </div>
        <div className="glass rounded border-[color-mix(in_oklch,var(--mr-bad)_40%,transparent)] p-4 text-sm text-[var(--mr-bad)]">
          <p>{error instanceof Error ? error.message : 'Failed to load hook weights'}</p>
        </div>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="text-[11px] font-semibold tracking-[0.06em] text-[var(--mr-mfg)] uppercase">
          Hook Scoring Weights
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className={cn('font-medium', sumValid ? 'text-[var(--mr-fg2)]' : 'text-[var(--mr-bad)]')}>
            Sum: {currentSum.toFixed(3)}
          </span>
          {!sumValid && (
            <button
              type="button"
              onClick={normalizeWeights}
              className="text-[var(--mr-acc)] hover:underline"
            >
              Normalize
            </button>
          )}
        </div>
      </div>

      <div className="glass overflow-hidden rounded">
        {isLoading || !localWeights
          ? Array.from({ length: 9 }).map((_, index) => (
              <div
                key={index}
                className="h-16 animate-pulse border-t border-[var(--mr-bd2)] bg-[var(--mr-muted)]/40 first:border-t-0"
              />
            ))
          : HOOK_DIMENSIONS.map((dimension) => (
              <div
                key={dimension.key}
                className="grid grid-cols-[160px_1fr_100px] items-center gap-4 border-t border-[var(--mr-bd2)] px-3.5 py-3 first:border-t-0"
              >
                <div>
                  <div className="text-[13px] font-medium">{dimension.label}</div>
                  <div className="mt-0.5 text-[11.5px] text-pretty text-[var(--mr-mfg)]">
                    {dimension.description}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={localWeights[dimension.key]}
                    onChange={(e) => updateWeight(dimension.key, Number(e.target.value))}
                    className="flex-1"
                  />
                </div>

                <div className="text-right">
                  <input
                    type="number"
                    min="0"
                    max="1"
                    step="0.01"
                    value={localWeights[dimension.key].toFixed(2)}
                    onChange={(e) => updateWeight(dimension.key, Number(e.target.value))}
                    className="w-16 rounded border border-[var(--mr-bd2)] bg-[var(--mr-bg)] px-2 py-1 text-xs text-right"
                  />
                </div>
              </div>
            ))}
      </div>

      {hasChanges && (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={saveWeights}
            disabled={!sumValid || updateMutation.isPending}
            className={cn(
              'rounded px-3 py-1.5 text-xs font-medium',
              sumValid
                ? 'bg-[var(--mr-acc)] text-[var(--mr-accfg)] hover:bg-[var(--mr-acc)]/90'
                : 'bg-[var(--mr-muted)] text-[var(--mr-mfg)] cursor-not-allowed'
            )}
          >
            {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
          </button>
          <button
            type="button"
            onClick={resetToDefaults}
            disabled={resetMutation.isPending}
            className="rounded px-3 py-1.5 text-xs font-medium text-[var(--mr-mfg)] hover:text-[var(--mr-fg)] hover:bg-[var(--mr-muted)]"
          >
            {resetMutation.isPending ? 'Resetting...' : 'Reset to Defaults'}
          </button>
        </div>
      )}
    </section>
  );
}