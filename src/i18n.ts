import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Import translation files
import enTranslations from './locales/en.json';
import esTranslations from './locales/es.json';
import frTranslations from './locales/fr.json';
import deTranslations from './locales/de.json';
import arTranslations from './locales/ar.json';

const resources = {
  en: {
    translation: enTranslations
  },
  es: {
    translation: esTranslations
  },
  fr: {
    translation: frTranslations
  },
  de: {
    translation: deTranslations
  },
  ar: {
    translation: arTranslations
  }
};

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
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage']
    }
  });

// RTL language detection and document direction setting
const rtlLanguages = ['ar'];

i18n.on('languageChanged', (lng) => {
  const direction = rtlLanguages.includes(lng) ? 'rtl' : 'ltr';
  document.documentElement.dir = direction;
  document.documentElement.lang = lng;

  // Update body class for RTL styling
  if (rtlLanguages.includes(lng)) {
    document.body.classList.add('rtl');
  } else {
    document.body.classList.remove('rtl');
  }
});

// Set initial direction
const initialDirection = rtlLanguages.includes(i18n.language) ? 'rtl' : 'ltr';
document.documentElement.dir = initialDirection;
document.documentElement.lang = i18n.language;

if (rtlLanguages.includes(i18n.language)) {
  document.body.classList.add('rtl');
}

export default i18n;
