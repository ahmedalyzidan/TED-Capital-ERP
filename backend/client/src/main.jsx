import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { AuthProvider } from './contexts/AuthContext.jsx'
import { ThemeProvider } from './contexts/ThemeContext.jsx'

// Global Date Formatter Override to DD/MM/YYYY
const originalToLocaleDateString = Date.prototype.toLocaleDateString;
Date.prototype.toLocaleDateString = function(locale, options) {
  if (options && (options.month === 'long' || options.month === 'short' || options.dateStyle === 'full')) {
    return originalToLocaleDateString.call(this, locale, options);
  }
  const day = String(this.getDate()).padStart(2, '0');
  const month = String(this.getMonth() + 1).padStart(2, '0');
  const year = this.getFullYear();
  return `${day}/${month}/${year}`;
};

// 🌟 [Elite Stabilization] Forcefully unregister service worker to prevent network interference
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(registrations => {
    for (let registration of registrations) {
      registration.unregister();
      console.log('Forcefully Unregistered Zombie Service Worker');
    }
  });
}

// 📅 Global Date Input Formatter Helper (forces dd/mm/yyyy visually)
const updateDateInputHelper = (el) => {
  if (!el.value) {
    el.setAttribute('data-date', '');
    el.removeAttribute('data-placeholder-hidden');
    return;
  }
  const parts = el.value.split('-'); // yyyy-mm-dd format
  if (parts.length === 3) {
    const formatted = `${parts[2]}/${parts[1]}/${parts[0]}`;
    el.setAttribute('data-date', formatted);
    el.setAttribute('data-placeholder-hidden', 'true');
  }
};

document.addEventListener('input', (e) => {
  if (e.target && e.target.type === 'date') {
    updateDateInputHelper(e.target);
  }
}, true);

document.addEventListener('change', (e) => {
  if (e.target && e.target.type === 'date') {
    updateDateInputHelper(e.target);
  }
}, true);

// Observe DOM mutations to format dynamically rendered date inputs
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  const observer = new MutationObserver(() => {
    document.querySelectorAll('input[type="date"]').forEach(el => {
      if (!el.hasAttribute('data-date-observed')) {
        el.setAttribute('data-date-observed', 'true');
        el.setAttribute('data-placeholder', el.placeholder || 'dd/mm/yyyy');
        updateDateInputHelper(el);
      }
    });
  });
  
  // Start observing once document body is ready
  window.addEventListener('DOMContentLoaded', () => {
    observer.observe(document.body, { childList: true, subtree: true });
  });
  // Immediate trigger for already rendered items
  setTimeout(() => {
    if (document.body) {
      observer.observe(document.body, { childList: true, subtree: true });
      document.querySelectorAll('input[type="date"]').forEach(el => {
        el.setAttribute('data-date-observed', 'true');
        el.setAttribute('data-placeholder', el.placeholder || 'dd/mm/yyyy');
        updateDateInputHelper(el);
      });
    }
  }, 1000);
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </ThemeProvider>
  </React.StrictMode>,
)