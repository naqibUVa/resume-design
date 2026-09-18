/**
 * @file main.jsx
 * Application entry point. Mounts React into #root.
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles/index.css';

const container = document.getElementById('root');

if (!container) {
  // Better than a blank page with a cryptic console error.
  document.body.innerHTML =
    '<pre style="font:14px/1.5 ui-monospace,monospace;padding:2rem">' +
    'Could not start: index.html is missing &lt;div id="root"&gt;.' +
    '</pre>';
} else {
  createRoot(container).render(
    <StrictMode>
      <App />
    </StrictMode>
  );

  // Tells the fallback panel in index.html to stand down. Without this, the
  // "this page needs to be started" explanation would appear over a working app.
  window.__APP_MOUNTED__ = true;
}
