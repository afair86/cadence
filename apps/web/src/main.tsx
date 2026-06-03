import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ContactActionProvider } from './context/ContactActionContext';
import { SectionProvider } from './context/SectionContext';
import App from './App';
import ErrorBoundary from './components/ui/ErrorBoundary';
import './styles/global.scss';

const rootEl = document.getElementById('root');
if (!rootEl) {
  throw new Error('Root element not found');
}

try {
  createRoot(rootEl).render(
    <StrictMode>
      <ErrorBoundary>
        <BrowserRouter>
          <AuthProvider>
            <SectionProvider>
              <ContactActionProvider>
                <App />
              </ContactActionProvider>
            </SectionProvider>
          </AuthProvider>
        </BrowserRouter>
      </ErrorBoundary>
    </StrictMode>,
  );
  window.__cadenceMounted = true;
} catch (err) {
  const message = err instanceof Error ? err.message : 'Failed to start Cadence';
  rootEl.innerHTML = `<div style="padding:48px;text-align:center;font-family:Inter,sans-serif;color:#64748b"><h1 style="color:#0f172a">Cadence could not start</h1><p>${message}</p><p><a href="/login">Try login page</a></p></div>`;
}
