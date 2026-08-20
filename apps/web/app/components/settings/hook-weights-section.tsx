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
  {
    key: 'specificity',
    label: 'Specificity',
    description: 'Concrete, specific details vs. generic content',
  },
  {
    key: 'shareability',
    label: 'Shareability',
    description: 'Likelihood of being shared on social media',
  },
  { key: 'novelty', label: 'Novelty', description: 'Uniqueness and freshness of content' },
  {
    key: 'controversy',
    label: 'Controversy',
    description: 'Ability to generate discussion/debate',
  },
  {
    key: 'headline',
    label: 'Headline',
    description: 'Headline-worthy or attention-grabbing nature',
  },
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

    const normalized = Object.keys(localWeights).reduce(
      (acc, key) => ({
        ...acc,
        [key]: localWeights[key as keyof HookWeightsSettings] / sum,
      }),
      {} as HookWeightsSettings,
    );

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

  const currentSum = localWeights
    ? Object.values(localWeights).reduce((acc, val) => acc + val, 0)
    : 0;
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
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[11px] font-semibold tracking-[0.06em] text-[var(--mr-mfg)] uppercase">
            Hook Scoring Weights
          </div>
          <div className="mt-1 text-xs text-[var(--mr-mfg)]">
            Adjust how AI scores content hooks across 9 dimensions
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span
            className={cn(
              'font-mono font-medium',
              sumValid ? 'text-[var(--mr-fg2)]' : 'text-[var(--mr-bad)]',
            )}
          >
            {currentSum.toFixed(3)}
          </span>
          {!sumValid && (
            <button
              type="button"
              onClick={normalizeWeights}
              className="rounded bg-[var(--mr-acc)]/10 px-2 py-1 text-[var(--mr-acc)] hover:bg-[var(--mr-acc)]/20"
            >
              Normalize
            </button>
          )}
        </div>
      </div>

      <div className="glass rounded-lg p-4">
        {isLoading || !localWeights ? (
          <div className="grid grid-cols-3 gap-3">
            {Array.from({ length: 9 }).map((_, index) => (
              <div key={index} className="h-20 animate-pulse rounded bg-[var(--mr-muted)]/30" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {HOOK_DIMENSIONS.map((dimension) => (
              <div
                key={dimension.key}
                className="group relative overflow-hidden rounded border border-[var(--mr-bd2)] bg-[var(--mr-bg)] p-3 transition-colors hover:border-[var(--mr-acc)]/30"
              >
                <div className="mb-2 flex items-center justify-between">
                  <div className="text-xs font-medium">{dimension.label}</div>
                  <div className="rounded bg-[var(--mr-muted)] px-1.5 py-0.5 font-mono text-xs text-[var(--mr-fg2)]">
                    {(localWeights[dimension.key] * 100).toFixed(0)}%
                  </div>
                </div>

                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={localWeights[dimension.key]}
                  onChange={(e) => updateWeight(dimension.key, Number(e.target.value))}
                  className="mb-2 w-full accent-[var(--mr-acc)]"
                />

                <div className="text-[10px] leading-tight text-[var(--mr-mfg)]">
                  {dimension.description}
                </div>

                {/* Visual weight indicator */}
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--mr-muted)]">
                  <div
                    className="h-full bg-gradient-to-r from-[var(--mr-acc)]/50 to-[var(--mr-acc)] transition-all"
                    style={{ width: `${localWeights[dimension.key] * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {hasChanges && (
        <div className="flex items-center justify-between rounded-lg border border-[var(--mr-acc)]/30 bg-[var(--mr-acc)]/5 p-3">
          <div className="text-xs text-[var(--mr-acc)]">You have unsaved changes</div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={resetToDefaults}
              disabled={resetMutation.isPending}
              className="rounded px-3 py-1.5 text-xs text-[var(--mr-mfg)] hover:text-[var(--mr-fg)] hover:bg-[var(--mr-muted)]"
            >
              {resetMutation.isPending ? 'Resetting...' : 'Reset'}
            </button>
            <button
              type="button"
              onClick={saveWeights}
              disabled={!sumValid || updateMutation.isPending}
              className={cn(
                'rounded px-4 py-1.5 text-xs font-medium transition-colors',
                sumValid
                  ? 'bg-[var(--mr-acc)] text-[var(--mr-accfg)] hover:bg-[var(--mr-acc)]/90'
                  : 'bg-[var(--mr-muted)] text-[var(--mr-mfg)] cursor-not-allowed',
              )}
            >
              {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
