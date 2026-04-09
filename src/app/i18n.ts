import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from './locales/en.json';
import es from './locales/es.json';
import fr from './locales/fr.json';
import pt from './locales/pt.json';
import it from './locales/it.json';
import de from './locales/de.json';
import zh from './locales/zh.json';
import ar from './locales/ar.json';
import hi from './locales/hi.json';
import ja from './locales/ja.json';
import ko from './locales/ko.json';
import ru from './locales/ru.json';
import id from './locales/id.json';
import tr from './locales/tr.json';
import vi from './locales/vi.json';
import th from './locales/th.json';

export const supportedLanguages = [
  'en', 'es', 'fr', 'pt', 'it', 'de', 'zh',
  'ar', 'hi', 'ja', 'ko', 'ru', 'id', 'tr', 'vi', 'th',
] as const;

export type SupportedLanguage = (typeof supportedLanguages)[number];

/** Languages that read right-to-left. */
export const rtlLanguages: ReadonlySet<string> = new Set(['ar']);

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      es: { translation: es },
      fr: { translation: fr },
      pt: { translation: pt },
      it: { translation: it },
      de: { translation: de },
      zh: { translation: zh },
      ar: { translation: ar },
      hi: { translation: hi },
      ja: { translation: ja },
      ko: { translation: ko },
      ru: { translation: ru },
      id: { translation: id },
      tr: { translation: tr },
      vi: { translation: vi },
      th: { translation: th },
    },
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng',
    },
  });

export default i18n;
