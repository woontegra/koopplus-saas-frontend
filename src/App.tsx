import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './auth/AuthContext'
import RequireAuth from './auth/RequireAuth'
import RequireTenant from './auth/RequireTenant'
import AppShell from './components/layout/AppShell'
import LoginPage from './pages/LoginPage'
import TenantSelectPage from './pages/TenantSelectPage'

export default function App(): JSX.Element {
  return (
    <BrowserRouter>
      <AuthProvider>
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
      </AuthProvider>
    </BrowserRouter>
  )
}
