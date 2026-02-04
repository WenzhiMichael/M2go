import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { LanguageProvider } from './i18n.jsx'
import { UserRoleProvider } from './context/UserRoleContext.jsx'

// Force login on each full page load (avoid auto-redirect without password)
sessionStorage.removeItem('m2go_auth_ok');

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <LanguageProvider>
        <UserRoleProvider>
          <App />
        </UserRoleProvider>
      </LanguageProvider>
    </BrowserRouter>
  </StrictMode>,
)
