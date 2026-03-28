export function nowIso() {
  return new Date().toISOString();
}

export function createId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID()}`;
  }

  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export function dedupe(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

export function excerpt(text: string, length = 120) {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= length) {
    return normalized;
  }

  return `${normalized.slice(0, length - 1)}…`;
}
