import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App';
import { armLaunchSplashFallback } from './platform/launchSplash';
import '@fontsource/pt-mono/cyrillic-400.css';
import '@fontsource/pt-mono/latin-400.css';
import '@fontsource/pt-sans/cyrillic-400.css';
import '@fontsource/pt-sans/latin-400.css';
import '@fontsource/pt-sans/cyrillic-700.css';
import '@fontsource/pt-sans/latin-700.css';
import './theme/global.css';

armLaunchSplashFallback();

const root = document.getElementById('root');
if (!root) throw new Error('Root element is missing');

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>,
);
