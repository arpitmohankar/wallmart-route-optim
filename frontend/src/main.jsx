/* eslint-disable no-unused-vars */

// import { StrictMode } from 'react'
// import { createRoot } from 'react-dom/client'
// import './index.css'
// import App from './App.jsx'

// createRoot(document.getElementById('root')).render(
//   <StrictMode>
//     <App />
//   </StrictMode>,
// )
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// PWA Service Worker Registration
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('🚀 PWA Service Worker registered successfully:', registration.scope);
      })
      .catch((error) => {
        console.log('❌ PWA Service Worker registration failed:', error);
      });
  });
}

// Install App Prompt for PWA
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
  console.log('💡 PWA install prompt ready');
  deferredPrompt = e;
  // Show custom install button in UI
  window.dispatchEvent(new Event('pwa-installable'));
});

// PWA Install Success
window.addEventListener('appinstalled', () => {
  console.log('🎉 PWA installed successfully!');
  deferredPrompt = null;
});

// Render React App
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
