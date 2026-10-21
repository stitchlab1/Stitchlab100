// Fast client-side OAuth callback fallback handler before loading React app
if (window.location.pathname === '/auth/callback' || window.location.pathname.endsWith('/auth/callback')) {
  try {
    const params = new URLSearchParams(window.location.hash.substring(1) || window.location.search);
    const token = params.get('access_token');
    const code = params.get('code');
    const error = params.get('error');

    if (error) {
      if (window.opener) {
        window.opener.postMessage({ type: 'OAUTH_AUTH_ERROR', error }, '*');
      }
    } else if (token) {
      localStorage.setItem("stitchlab_drive_token", token);
      if (window.opener) {
        window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS', token }, '*');
        setTimeout(() => {
          try { window.close(); } catch (_) {}
        }, 500);
      } else {
        window.location.href = '/';
      }
    } else if (code) {
      localStorage.setItem("stitchlab_drive_code", code);
      if (window.opener) {
        window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS', token: code, isCode: true }, '*');
        setTimeout(() => {
          try { window.close(); } catch (_) {}
        }, 500);
      } else {
        window.location.href = '/';
      }
    }
  } catch (e) {
    console.error("Client-side fallback callback error:", e);
  }
}

import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
