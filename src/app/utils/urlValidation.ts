export function normalizeHttpUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 2048) {
    return '';
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return '';
    }
    return parsed.toString();
  } catch {
    return '';
  }
}
