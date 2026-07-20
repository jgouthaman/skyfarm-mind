// Per-module section completion, persisted to sessionStorage (same pattern as
// the academy_user session in academy-auth.ts). Lesson/quiz content now lives
// on its own routes rather than an in-page stacked list, so completion state
// has to survive a full route unmount/remount to make it back to the grid.

const STORAGE_PREFIX = "academy_module_progress_";

export interface SectionProgressEntry {
  score?: number;
  total?: number;
}

type ProgressMap = Record<string, SectionProgressEntry>;

function storageKey(moduleId: string): string {
  return `${STORAGE_PREFIX}${moduleId}`;
}

function readMap(moduleId: string): ProgressMap {
  try {
    const raw = sessionStorage.getItem(storageKey(moduleId));
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as ProgressMap) : {};
  } catch {
    return {};
  }
}

function writeMap(moduleId: string, map: ProgressMap): void {
  sessionStorage.setItem(storageKey(moduleId), JSON.stringify(map));
}

export function getCompletedSectionIds(moduleId: string): Set<string> {
  return new Set(Object.keys(readMap(moduleId)));
}

// Quiz/final-test sections carry a score; lesson (content) sections don't.
export function getSectionScore(moduleId: string, sectionId: string): SectionProgressEntry | null {
  return readMap(moduleId)[sectionId] ?? null;
}

export function markSectionComplete(moduleId: string, sectionId: string, result?: SectionProgressEntry): void {
  const map = readMap(moduleId);
  if (sectionId in map && !result) return;
  map[sectionId] = result ?? {};
  writeMap(moduleId, map);
}

export function clearModuleProgress(moduleId: string): void {
  sessionStorage.removeItem(storageKey(moduleId));
}
