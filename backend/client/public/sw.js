// TED ERP Service Worker - DISABLED
// This file is currently disabled to prevent network interference.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', () => self.clients.claim());
// No fetch listener to allow direct network access
