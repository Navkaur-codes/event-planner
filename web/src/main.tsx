import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
// Self-hosted Latin subsets (OFL): same origin, no render-blocking third-party stylesheet.
import '@fontsource/fraunces/latin-600.css';
import '@fontsource/fraunces/latin-800.css';
import '@fontsource/nunito/latin-400.css';
import '@fontsource/nunito/latin-700.css';
import './styles/tokens.css';
import './styles/base.css';
import './styles/print.css';

const root = document.getElementById('root');
if (!root) throw new Error('Root element #root not found');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
