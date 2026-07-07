const PRESET_FAVORITES_STORAGE_KEY = 'th:1980s:preset-favorites';

function normalizePresetIds(ids: Iterable<string>): string[] {
  return Array.from(
    new Set(
      Array.from(ids)
        .map(id => id.trim())
        .filter(Boolean),
    ),
  );
}

export function loadPresetFavorites(): Set<string> {
  if (typeof localStorage === 'undefined') {
    return new Set();
  }

  try {
    const raw = localStorage.getItem(PRESET_FAVORITES_STORAGE_KEY);
    if (!raw) {
      return new Set();
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return new Set();
    }

    return new Set(normalizePresetIds(parsed.filter(item => typeof item === 'string')));
  } catch (error) {
    console.warn('[PresetFavorites] 读取收藏失败，已回退为空列表:', error);
    return new Set();
  }
}

export function savePresetFavorites(ids: Iterable<string>): void {
  if (typeof localStorage === 'undefined') {
    return;
  }

  try {
    localStorage.setItem(PRESET_FAVORITES_STORAGE_KEY, JSON.stringify(normalizePresetIds(ids)));
  } catch (error) {
    console.warn('[PresetFavorites] 写入收藏失败:', error);
  }
}

export function togglePresetFavorite(presetId: string, ids: Set<string>): Set<string> {
  const normalizedId = presetId.trim();
  if (!normalizedId) {
    return new Set(ids);
  }

  const next = new Set(ids);
  if (next.has(normalizedId)) {
    next.delete(normalizedId);
  } else {
    next.add(normalizedId);
  }

  return next;
}
