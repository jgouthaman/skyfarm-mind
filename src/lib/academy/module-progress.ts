// Per-module section completion, persisted to sessionStorage (same pattern as
// the academy_user session in academy-auth.ts). Lesson/quiz content now lives
// on its own routes rather than an in-page stacked list, so completion state
// has to survive a full route unmount/remount to make it back to the grid.

const STORAGE_PREFIX = "academy_module_progress_";

function storageKey(moduleId: string): string {
  return `${STORAGE_PREFIX}${moduleId}`;
}

export function getCompletedSectionIds(moduleId: string): Set<string> {
  try {
    const raw = sessionStorage.getItem(storageKey(moduleId));
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

export function markSectionComplete(moduleId: string, sectionId: string): void {
  const ids = getCompletedSectionIds(moduleId);
  if (ids.has(sectionId)) return;
  ids.add(sectionId);
  sessionStorage.setItem(storageKey(moduleId), JSON.stringify([...ids]));
}

export function clearModuleProgress(moduleId: string): void {
  sessionStorage.removeItem(storageKey(moduleId));
}
