import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './app/App';
import { AuthProvider } from './api/auth';
import './styles/app.css';
import './styles/live.css';
import './styles/modal.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>,
);
