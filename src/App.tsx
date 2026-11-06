import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom'
import { AuthProvider } from './auth/AuthContext'
import RequireAuth from './auth/RequireAuth'
import RequireTenant from './auth/RequireTenant'
import AppLayout from './components/layout/AppLayout'
import { CooperativeProvider } from './context/CooperativeContext'
import { DialogProvider } from './context/DialogContext'
import { LicenseProvider } from './context/LicenseContext'
import { ToastProvider } from './context/ToastContext'
import { UpdateStatusProvider } from './context/UpdateStatusContext'
import LoginPage from './pages/LoginPage'
import MemberDebtTablePage from './pages/MemberDebtTablePage'
import SimpleMemberDetailPage from './pages/member/SimpleMemberDetailPage'
import SimpleMembersPage from './pages/member/SimpleMembersPage'
import PlaceholderPage from './pages/PlaceholderPage'
import TenantSelectPage from './pages/TenantSelectPage'
import { getPageTitle } from './config/navigation'

function RoutePlaceholder(): JSX.Element {
  const { pathname } = useLocation()
  return <PlaceholderPage title={getPageTitle(pathname)} />
}

function AppRoutes(): JSX.Element {
  return (
    <CooperativeProvider>
      <LicenseProvider>
        <UpdateStatusProvider>
          <Routes>
            <Route element={<AppLayout />}>
              <Route path="/" element={<PlaceholderPage title="Yönetim Paneli" />} />
              <Route path="/uyeler" element={<SimpleMembersPage />} />
              <Route path="/uyeler/:id" element={<SimpleMemberDetailPage />} />
              <Route path="/uye-borc-tablosu" element={<MemberDebtTablePage />} />
              <Route path="/uye-borc-tablosu/:partnerId" element={<MemberDebtTablePage />} />
              <Route path="*" element={<RoutePlaceholder />} />
            </Route>
          </Routes>
        </UpdateStatusProvider>
      </LicenseProvider>
    </CooperativeProvider>
  )
}

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
                      <AppRoutes />
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
