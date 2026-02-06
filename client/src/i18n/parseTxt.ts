/**
 * Parse a .txt translation file with key=value format.
 * Lines starting with # are comments. Empty lines are skipped.
 */
export function parseTxt(content: string): Record<string, string> {
  const translations: Record<string, string> = {};
  const lines = content.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;
    const key = trimmed.substring(0, eqIndex).trim();
    const value = trimmed.substring(eqIndex + 1).trim();
    if (key) {
      translations[key] = value;
    }
  }
  return translations;
}
