import React from 'react';
import ReactDOM from 'react-dom/client';
import '@fontsource/be-vietnam-pro/400.css';
import '@fontsource/be-vietnam-pro/500.css';
import '@fontsource/be-vietnam-pro/600.css';
import '@fontsource/be-vietnam-pro/700.css';
import App from './app/App';
import { AuthProvider } from './api/auth';
import { ThemeProvider } from './api/theme';
import './styles/app.css';
import './styles/live.css';
import './styles/modal.css';
import './styles/theme.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
<React.StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </ThemeProvider>
  </React.StrictMode>,
);
