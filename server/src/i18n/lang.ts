import fs from 'fs';
import path from 'path';
import { LANGUAGES, DEFAULT_LANGUAGE, LanguageCode } from './languages';

const translations: Record<string, Record<string, string>> = {};
let currentLanguage: LanguageCode = DEFAULT_LANGUAGE;

function parseTxt(content: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;
    const key = trimmed.substring(0, eqIndex).trim();
    const value = trimmed.substring(eqIndex + 1).trim();
    if (key) result[key] = value;
  }
  return result;
}

/**
 * Load all translation files at startup
 */
export function initializeLanguages(): void {
  for (const code of Object.keys(LANGUAGES)) {
    const filePath = path.join(__dirname, `${code}.txt`);
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      translations[code] = parseTxt(content);
      console.log(`[i18n] Loaded ${code}.txt (${Object.keys(translations[code]).length} keys)`);
    } catch (error) {
      console.warn(`[i18n] Could not load ${code}.txt:`, error);
    }
  }
}

/**
 * Set the active language
 */
export function setLanguage(lang: LanguageCode): void {
  if (LANGUAGES[lang]) {
    currentLanguage = lang;
  }
}

/**
 * Get current language
 */
export function getLanguage(): LanguageCode {
  return currentLanguage;
}

/**
 * Get a translated string. Falls back to English, then to the key itself.
 */
export function get(key: string, params?: Record<string, string | number>): string {
  let value = translations[currentLanguage]?.[key]
    ?? translations[DEFAULT_LANGUAGE]?.[key]
    ?? key;

  if (params) {
    for (const [paramKey, paramValue] of Object.entries(params)) {
      value = value.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(paramValue));
    }
  }
  return value;
}

// Convenience object: lang.get("key")
export const lang = { get, setLanguage, getLanguage, initializeLanguages };
