// Stage 2.1, Step 3 (MissionAgent.md Section 4.1.1) — Context Retrieval (RAG).
// Stubbed deliberately: real retrieval needs pgvector enabled, a populated
// Hangar_knowledge_base table, and an embedding step, none of which exist
// yet — and an empty knowledge base would just return nothing anyway
// (Section 4.1.1's "Build order recommendation"). Always returns [] until
// Phase 2, once Hangar_mission_specs has enough real missions to be worth
// searching.
//
// TODO(Phase 2): embed `detectedIntent` (e.g. text-embedding-3-small),
// similarity-search Hangar_knowledge_base via pgvector, return the top
// matching chunks as grounding context for Stage 2.2.
export async function retrieveContext(_detectedIntent: string): Promise<unknown[]> {
  return [];
}
