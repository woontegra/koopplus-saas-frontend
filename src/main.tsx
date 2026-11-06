import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { installWindowApi } from './desktopApi/installWindowApi'
import './styles/tokens.css'
import './styles/global.css'
import './styles/saas-design.css'
import './styles/saas-auth.css'
import './styles/saas-shell.css'
import './styles/platform.css'
import './styles/progress.css'

installWindowApi()

const root = document.getElementById('root')
if (!root) {
  throw new Error('root elementi bulunamadı')
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>
)
