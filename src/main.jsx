import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { TimetableProvider } from './context/TimetableContext';
import ErrorBoundary from './components/ErrorBoundary';
import App from './App';
import './index.css';

// Unregister old service workers on localhost to prevent stale cache blank screens
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    navigator.serviceWorker.getRegistrations().then(registrations => {
      for (const reg of registrations) {
        reg.unregister().catch(() => {});
      }
    }).catch(() => {});
  }
}

// Global error handlers for observability
if (typeof window !== 'undefined') {
  window.onerror = function(msg, url, lineNo, columnNo, error) {
    console.error('SmartSchedule Global Error:', { msg, url, lineNo, columnNo, error });
    return false;
  };

  window.onunhandledrejection = function(event) {
    console.error('SmartSchedule Unhandled Promise Rejection:', event.reason);
  };
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <TimetableProvider>
            <App />
          </TimetableProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
);
