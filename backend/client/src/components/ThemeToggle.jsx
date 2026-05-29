import React from 'react';
import { useTheme } from '../contexts/ThemeContext';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className={`px-6 py-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-lg flex items-center gap-2 transform active:scale-95 ${
        theme === 'dark'
          ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-600/20'
          : 'bg-slate-900 hover:bg-slate-800 text-white shadow-slate-900/20'
      }`}
      title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
    >
      {theme === 'dark' ? '☀️ Light' : '🌙 Dark'}
    </button>
  );
}
