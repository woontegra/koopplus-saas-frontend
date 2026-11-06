import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './auth/AuthContext'
import RequireAuth from './auth/RequireAuth'
import RequireTenant from './auth/RequireTenant'
import AppShell from './components/layout/AppShell'
import { DialogProvider } from './context/DialogContext'
import { ToastProvider } from './context/ToastContext'
import LoginPage from './pages/LoginPage'
import TenantSelectPage from './pages/TenantSelectPage'

export default function App(): JSX.Element {
  // ToastProvider içinde ToastViewport zaten render edilir (masaüstü ile aynı); ikinci kez eklenmez.
  return (
    <BrowserRouter>
      <AuthProvider>
        <DialogProvider>
          <ToastProvider>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route
                path="/kooperatifler"
                element={
                  <RequireAuth>
                    <div className="tenant-select-shell">
                      <TenantSelectPage />
                    </div>
                  </RequireAuth>
                }
              />
              <Route
                path="*"
                element={
                  <RequireAuth>
                    <RequireTenant>
                      <AppShell />
                    </RequireTenant>
                  </RequireAuth>
                }
              />
            </Routes>
          </ToastProvider>
        </DialogProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
