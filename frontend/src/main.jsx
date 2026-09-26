import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import * as Sentry from '@sentry/react';
import App from './App';
import './index.css';
import { initOfflineSyncListeners } from './lib/offlineSyncManager';

initOfflineSyncListeners();

const sentryDsn = import.meta.env.VITE_SENTRY_DSN;
if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    integrations: [
      Sentry.browserTracingIntegration(),
    ],
    tracesSampleRate: 0.1,
    beforeSend(event) {
      // Scrub PII: user details, phone numbers, patient names
      if (event.user) {
        delete event.user.ip_address;
        delete event.user.email;
        delete event.user.username;
        if (event.user.id) event.user.id = '[SCRUBBED]';
      }

      // Scrub breadcrumbs data
      if (event.breadcrumbs) {
        event.breadcrumbs.forEach((crumb) => {
          if (crumb.data && typeof crumb.data === 'object') {
            ['phone', 'name', 'patient_name', 'otp', 'password', 'token', 'authorization'].forEach((key) => {
              if (crumb.data[key]) crumb.data[key] = '[SCRUBBED]';
            });
          }
        });
      }

      // Regex scrub 10-digit Indian phone numbers from event message
      if (typeof event.message === 'string') {
        event.message = event.message.replace(/\b[6-9]\d{9}\b/g, '[SCRUBBED_PHONE]');
      }

      return event;
    },
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      <Toaster
        position="top-right"
        toastOptions={{
          style: { borderRadius: '12px', fontFamily: 'Manrope, sans-serif', fontSize: '13px' },
          success: { iconTheme: { primary: '#5F7A52', secondary: 'white' } },
        }}
      />
    </BrowserRouter>
  </React.StrictMode>
);