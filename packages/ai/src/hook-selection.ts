/**
 * Hook deduplication + diversity ranking (plan §16–§18).
 *
 * MVP is greedy grouping, not K-means/HDBSCAN: candidates are visited highest-score first, each
 * either joins an existing cluster (cosine ≥ threshold to that cluster's representative) or starts a
 * new one. The representative is always the highest-scoring member because we visit in that order, so
 * the cluster winner is its representative. Winners are then ranked for diversity across hook types.
 *
 * Similarity is approximate: comparison is against a single representative vector per cluster, so we do
 * not assume pairwise transitivity. Documented ceiling — upgrade path is real clustering.
 */

/** Cosine similarity over two equal-intent vectors; 0 when either is zero-length or empty. */
export function cosineSimilarity(a: readonly number[], b: readonly number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  const length = Math.min(a.length, b.length);
  for (let index = 0; index < length; index += 1) {
    const left = a[index] ?? 0;
    const right = b[index] ?? 0;
    dot += left * right;
    normA += left * left;
    normB += right * right;
  }
  const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
  return magnitude === 0 ? 0 : dot / magnitude;
}

export interface SelectionCandidate {
  id: number;
  /** Final weighted score, 0..1. Missing scores are treated as 0. */
  score: number | null;
  hookType?: string | null;
  /** Embedding vector; when absent the candidate can only be its own cluster (no dedup). */
  vector?: readonly number[];
}

export interface SelectionConfig {
  similarityThreshold: number;
  finalCount: number;
}

export interface SelectionResult {
  /** Cluster representatives kept after diversity ranking, best first. */
  selectedIds: number[];
  /** Everything else: near-duplicates and representatives beyond `finalCount`. */
  rejectedIds: number[];
}

/** Deterministic ordering: score desc, then id asc so ties never depend on input order. */
function byScoreThenId(a: SelectionCandidate, b: SelectionCandidate): number {
  const scoreA = a.score ?? 0;
  const scoreB = b.score ?? 0;
  if (scoreB !== scoreA) {
    return scoreB - scoreA;
  }
  return a.id - b.id;
}

interface Cluster {
  representative: SelectionCandidate;
  memberIds: number[];
}

/**
 * Group near-duplicate candidates, keep the best per group, then pick a diverse top `finalCount`.
 * Candidates without a vector are never merged into another cluster.
 */
export function selectHooks(
  candidates: readonly SelectionCandidate[],
  config: SelectionConfig,
): SelectionResult {
  const ordered = [...candidates].sort(byScoreThenId);
  const threshold = config.similarityThreshold;
  const clusters: Cluster[] = [];

  for (const candidate of ordered) {
    let joined = false;
    if (candidate.vector && candidate.vector.length > 0) {
      for (const cluster of clusters) {
        const repVector = cluster.representative.vector;
        if (
          repVector &&
          repVector.length > 0 &&
          cosineSimilarity(candidate.vector, repVector) >= threshold
        ) {
          cluster.memberIds.push(candidate.id);
          joined = true;
          break;
        }
      }
    }
    if (!joined) {
      clusters.push({ representative: candidate, memberIds: [] });
    }
  }

  // Representatives are already highest-score-first because `ordered` created them in that order.
  const representatives = clusters.map((cluster) => cluster.representative);
  const finalCount = Math.max(0, Math.trunc(config.finalCount));
  const selected = rankForDiversity(representatives, finalCount);
  const selectedSet = new Set(selected.map((candidate) => candidate.id));

  const rejectedIds: number[] = [];
  for (const cluster of clusters) {
    if (!selectedSet.has(cluster.representative.id)) {
      rejectedIds.push(cluster.representative.id);
    }
    rejectedIds.push(...cluster.memberIds);
  }

  return { selectedIds: selected.map((candidate) => candidate.id), rejectedIds };
}

/**
 * Greedy diversity: from the score-sorted representatives, repeatedly take the highest-scoring
 * candidate whose hook type has not been used yet; once every type is represented (or a candidate has
 * no type) fall back to highest score. Avoids returning N variations of the same topic.
 */
function rankForDiversity(
  representatives: readonly SelectionCandidate[],
  finalCount: number,
): SelectionCandidate[] {
  const remaining = [...representatives].sort(byScoreThenId);
  const selected: SelectionCandidate[] = [];
  const usedTypes = new Set<string>();

  while (selected.length < finalCount && remaining.length > 0) {
    let index = remaining.findIndex(
      (candidate) => candidate.hookType && !usedTypes.has(candidate.hookType),
    );
    if (index === -1) {
      index = 0;
    }
    const [pick] = remaining.splice(index, 1);
    if (!pick) {
      break;
    }
    selected.push(pick);
    if (pick.hookType) {
      usedTypes.add(pick.hookType);
    }
  }

  return selected;
}
