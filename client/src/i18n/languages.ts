export interface LanguageInfo {
  name: string; // Always in the language's own language
}

// To add a new language:
// 1. Add an entry here (e.g., fr: { name: 'Français' })
// 2. Create client/src/i18n/fr.txt with all translated keys
// 3. Create server/src/i18n/fr.txt with server-side translated keys
// 4. Add import in LanguageContext.tsx and add to TRANSLATION_FILES
export const LANGUAGES: Record<string, LanguageInfo> = {
  en: { name: 'English' },
  de: { name: 'Deutsch' },
};

export type LanguageCode = string;
export const DEFAULT_LANGUAGE: LanguageCode = 'en';
