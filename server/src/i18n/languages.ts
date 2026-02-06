export interface LanguageInfo {
  name: string;
}

export const LANGUAGES: Record<string, LanguageInfo> = {
  en: { name: 'English' },
  de: { name: 'Deutsch' },
};

export type LanguageCode = string;
export const DEFAULT_LANGUAGE: LanguageCode = 'en';
