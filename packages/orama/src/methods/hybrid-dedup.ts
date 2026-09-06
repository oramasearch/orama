// Accurate Hybrid Search Candidate Deduplication
export function deduplicateHybridCandidates<T extends { id: string }>(
  vectorResults: T[],
  bm25Results: T[]
): { count: number; uniqueIds: string[] } {
  const uniqueDocIds = new Set<string>([
    ...vectorResults.map(r => r.id),
    ...bm25Results.map(r => r.id)
  ]);
  return {
    count: uniqueDocIds.size,
    uniqueIds: Array.from(uniqueDocIds)
  };
}
