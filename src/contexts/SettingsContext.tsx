import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { storageManager } from '../lib/storage';

interface Settings {
  notifications: boolean;
  locationSharing: boolean;
  notificationRadius: number;
  hideNearbyUsers: boolean;
}

interface SettingsContextType {
  settings: Settings;
  updateSettings: (newSettings: Partial<Settings>) => void;
  isLoading: boolean;
}

const defaultSettings: Settings = {
  notifications: true,
  locationSharing: true,
  notificationRadius: 5,
  hideNearbyUsers: false
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

interface SettingsProviderProps {
  children: ReactNode;
}

export const SettingsProvider: React.FC<SettingsProviderProps> = ({ children }) => {
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);

  // Load settings from storage on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const storedSettings = await storageManager.get('userSettings');
        if (storedSettings) {
          const parsedSettings = JSON.parse(storedSettings);
          // Merge with defaults to handle new settings
          setSettings({ ...defaultSettings, ...parsedSettings });
        }
      } catch (error) {
        console.error('Error loading settings:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, []);

  // Save settings to storage whenever they change
  const updateSettings = async (newSettings: Partial<Settings>) => {
    const updatedSettings = { ...settings, ...newSettings };
    setSettings(updatedSettings);

    try {
      await storageManager.set('userSettings', JSON.stringify(updatedSettings));
      console.log('Settings updated:', updatedSettings);
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  };

  const value: SettingsContextType = {
    settings,
    updateSettings,
    isLoading
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = (): SettingsContextType => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};

export default SettingsContext;
