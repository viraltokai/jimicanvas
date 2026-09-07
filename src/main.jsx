import React from 'react';
import ReactDOM from 'react-dom/client';
import RootApp from './RootApp.jsx';
import { bootstrapFromUrl } from './lib/urlBootstrap';
import { initTheme } from './lib/theme';
import { initClickEffect } from './lib/clickEffect';
import './styles.css';

initTheme();
initClickEffect();
bootstrapFromUrl();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <RootApp />
  </React.StrictMode>
);
