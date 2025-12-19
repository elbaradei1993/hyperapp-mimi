import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

interface LanguageContextType {
  currentLanguage: string;
  changeLanguage: (language: string, updateProfile?: (data: any) => Promise<void>, user?: any) => Promise<void>;
  isRTL: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

interface LanguageProviderProps {
  children: ReactNode;
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {
  const { i18n } = useTranslation();
  const [currentLanguage, setCurrentLanguage] = useState('en');

  // RTL languages
  const rtlLanguages = ['ar'];

  useEffect(() => {
    // Load language from localStorage or default to 'en'
    const savedLanguage = localStorage.getItem('language') || 'en';
    setCurrentLanguage(savedLanguage);
    i18n.changeLanguage(savedLanguage).then(() => {
      // Set initial direction after i18n is ready
      const direction = rtlLanguages.includes(savedLanguage) ? 'rtl' : 'ltr';
      document.documentElement.dir = direction;
      document.documentElement.lang = savedLanguage;

      if (rtlLanguages.includes(savedLanguage)) {
        document.body.classList.add('rtl');
      } else {
        document.body.classList.remove('rtl');
      }
    });
  }, [i18n]);

  const changeLanguage = async (language: string, updateProfile?: (data: any) => Promise<void>, user?: any) => {
    try {
      // Update document direction and language immediately for instant visual feedback
      const direction = rtlLanguages.includes(language) ? 'rtl' : 'ltr';
      document.documentElement.dir = direction;
      document.documentElement.lang = language;

      // Update body class for RTL styling
      if (rtlLanguages.includes(language)) {
        document.body.classList.add('rtl');
      } else {
        document.body.classList.remove('rtl');
      }

      // Now change the i18n language
      await i18n.changeLanguage(language);

      // Update state after successful language change
      setCurrentLanguage(language);

      // Save to localStorage
      localStorage.setItem('language', language);

      // Update user profile if authenticated and updateProfile function is provided
      if (user && updateProfile) {
        await updateProfile({ language });
      }

      console.log(`Language changed to ${language} with direction ${direction}`);
    } catch (error) {
      console.error('Error changing language:', error);
      // Revert direction changes on error
      const currentDirection = rtlLanguages.includes(currentLanguage) ? 'rtl' : 'ltr';
      document.documentElement.dir = currentDirection;
      document.documentElement.lang = currentLanguage;
      if (rtlLanguages.includes(currentLanguage)) {
        document.body.classList.add('rtl');
      } else {
        document.body.classList.remove('rtl');
      }
    }
  };

  const isRTL = rtlLanguages.includes(currentLanguage);

  return (
    <LanguageContext.Provider value={{
      currentLanguage,
      changeLanguage,
      isRTL
    }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
