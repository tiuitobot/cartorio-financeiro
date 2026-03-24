export const USER_PREFERENCE_KEYS = {
  livrosNotasColunas: 'livros_notas_colunas',
  relatoriosAtosColunas: 'relatorios_atos_colunas',
};

export function normalizeColumnSelection(value, allowedKeys) {
  if (!Array.isArray(value)) return null;

  const allowedSet = new Set(allowedKeys);
  const seen = new Set();
  const normalized = [];

  for (const item of value) {
    if (typeof item !== 'string') continue;
    const key = item.trim();
    if (!allowedSet.has(key) || seen.has(key)) continue;
    seen.add(key);
    normalized.push(key);
  }

  return normalized;
}

export function readColumnSelectionFromStorage(storageKey, allowedKeys) {
  try {
    const parsed = JSON.parse(localStorage.getItem(storageKey) || 'null');
    return normalizeColumnSelection(parsed, allowedKeys);
  } catch {
    return null;
  }
}

export function areStringArraysEqual(a = [], b = []) {
  if (a.length !== b.length) return false;
  return a.every((item, index) => item === b[index]);
}
