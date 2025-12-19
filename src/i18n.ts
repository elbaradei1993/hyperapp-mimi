import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Import translation files
import enTranslations from './locales/en.json';
import arTranslations from './locales/ar.json';
import { translationService } from './services/translationService';

// Arabic pluralization rules
const arabicPluralization = (count: number, ordinal?: boolean) => {
  // Arabic pluralization rules:
  // 0: zero
  // 1: singular (one)
  // 2: dual (two)
  // 3-10: plural_few
  // 11+: plural_many
  if (ordinal) {
    return 'ordinal';
  }
  if (count === 0) {
    return 'zero';
  }
  if (count === 1) {
    return 'singular';
  }
  if (count === 2) {
    return 'dual';
  }
  if (count >= 3 && count <= 10) {
    return 'plural_few';
  }
  return 'plural_many';
};

const resources = {
  en: {
    translation: enTranslations
  },
  ar: {
    translation: arTranslations
  }
};

// Track missing keys to avoid duplicate translation requests
const translatingKeys = new Set<string>();

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'en', // default language
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false // React already escapes values
    },
    react: {
      useSuspense: false
    },
    // Disable automatic detection - LanguageContext handles this manually
    detection: {
      order: [],
      caches: []
    },

    // Handle missing keys with LibreTranslate API - Optimized for Arabic
    missingKeyHandler: async (lngs: readonly string[], ns: string, key: string, fallbackValue: string) => {
      const targetLang = lngs[0]; // Primary language

      // Only handle Arabic translations (when switching TO Arabic)
      if (targetLang !== 'ar') {
        return fallbackValue;
      }

      const sourceLang = 'en'; // Always translate from English to Arabic

      // Skip if already translating this key
      const translationKey = `${sourceLang}-${targetLang}-${key}`;
      if (translatingKeys.has(translationKey)) {
        return fallbackValue;
      }

      // CRITICAL FIX: Get source text directly from resources to avoid infinite recursion
      // DO NOT use i18n.t() as it can trigger another missing key event
      const sourceResources = i18n.getResourceBundle(sourceLang, ns);
      let sourceText = sourceResources?.[key] || fallbackValue;

      // Skip if text is empty or not a real translation key
      if (!sourceText || sourceText === key || sourceText.trim() === '') {
        return fallbackValue;
      }

      // Skip if source text is the same as fallback (indicates it's not a real translation)
      if (sourceText === fallbackValue) {
        return fallbackValue;
      }

      // Skip if text is already in Arabic
      if (translationService['isArabicText'](sourceText)) {
        return fallbackValue;
      }

      try {
        translatingKeys.add(translationKey);

        const translatedText = await translationService.translate(
          sourceText,
          sourceLang as 'en' | 'ar',
          targetLang as 'en' | 'ar'
        );

        // Add the translation to the i18n resources dynamically
        if (translatedText && translatedText !== sourceText && translatedText.trim() !== '' &&
            !translationService['isArabicText'](translatedText) === false) { // Ensure we got Arabic back
          i18n.addResource(targetLang, ns, key, translatedText);
          console.log(`✅ Arabic Translation: "${key}" → "${translatedText}"`);
          return translatedText;
        }
      } catch (error) {
        console.warn(`❌ Arabic translation failed for "${key}":`, error);
      } finally {
        translatingKeys.delete(translationKey);
      }

      return fallbackValue;
    },
    // Save missing keys for debugging (optional)
    saveMissing: true,
    // Update missing keys reactively
    updateMissing: true
  });

// Configure Arabic pluralization rules after initialization
i18n.on('initialized', () => {
  if (i18n.services && i18n.services.pluralResolver) {
    i18n.services.pluralResolver.addRule('ar', arabicPluralization);
  }
});

// RTL language detection - direction setting handled by LanguageContext
const rtlLanguages = ['ar'];

export default i18n;
