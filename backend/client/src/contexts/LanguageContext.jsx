import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState(localStorage.getItem('ted-lang') || 'en');
  const [theme, setTheme] = useState(localStorage.getItem('ted-theme') || 'light');
  const [isSynced, setIsSynced] = useState(false);

  // Apply Language & Direction
  useEffect(() => {
    const root = window.document.documentElement;
    root.setAttribute('dir', language === 'ar' ? 'rtl' : 'ltr');
    root.setAttribute('lang', language);
    localStorage.setItem('ted-lang', language);
  }, [language]);

  // Apply Theme (Dark/Light)
  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('ted-theme', theme);
  }, [theme]);

  // Sync with Backend on Load
  useEffect(() => {
    if (isSynced) return; 
    const syncPreferences = async () => {
      try {
        const response = await api.get('/user/preferences');
        if (response.data) {
          if (response.data.language && response.data.language !== language) setLanguage(response.data.language);
          if (response.data.theme_mode && response.data.theme_mode !== theme) setTheme(response.data.theme_mode);
          setIsSynced(true);
        }
      } catch (error) {
        console.warn("Preferences sync failed or user not logged in.");
      }
    };
    syncPreferences();
  }, [isSynced]); // Controlled sync

  // Persist to Backend on Change
  const updatePreferences = async (updates) => {
    try {
      if (updates.language) setLanguage(updates.language);
      if (updates.theme) setTheme(updates.theme);
      
      await api.post('/user/preferences', {
        language: updates.language || language,
        theme_mode: updates.theme || theme
      });
    } catch (error) {
      console.error("Failed to save preferences to DB");
    }
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, theme, setTheme, updatePreferences }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
