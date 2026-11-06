import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom'
import { AuthProvider } from './auth/AuthContext'
import AdminRoute from './auth/AdminRoute'
import RequireAuth from './auth/RequireAuth'
import RequireTenant from './auth/RequireTenant'
import AppLayout from './components/layout/AppLayout'
import { CooperativeProvider } from './context/CooperativeContext'
import { DialogProvider } from './context/DialogContext'
import { ToastProvider } from './context/ToastContext'
import ProgressBar from './progress/ProgressBar'
import ProgressBridge from './progress/ProgressBridge'
import { ProgressProvider } from './progress/ProgressContext'
import LoginPage from './pages/LoginPage'
import CooperativeCashPage from './pages/cash/CooperativeCashPage'
import InterestPage from './pages/interest/InterestPage'
import AidatDistributionPage from './pages/member/AidatDistributionPage'
import MemberDebtTablePage from './pages/member/MemberDebtTablePage'
import SimpleMemberDetailPage from './pages/member/SimpleMemberDetailPage'
import SimpleMembersPage from './pages/member/SimpleMembersPage'
import SimpleDashboardPage from './pages/member/SimpleDashboardPage'
import BankTransactionsPage from './pages/bank/BankTransactionsPage'
import ReportsPage from './pages/reports/ReportsPage'
import LibraryPage from './pages/library/LibraryPage'
import SimpleSettingsPage from './pages/settings/SimpleSettingsPage'
import BackupPage from './pages/backup/BackupPage'
import CooperativesPage from './pages/cooperatives/CooperativesPage'
import PlaceholderPage from './pages/PlaceholderPage'
import PlatformApp from './pages/platform/PlatformApp'
import { getPageTitle, SIMPLIFIED_UI } from './config/navigation'

function RoutePlaceholder(): JSX.Element {
  const { pathname } = useLocation()
  return <PlaceholderPage title={getPageTitle(pathname)} />
}

function AppRoutes(): JSX.Element {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<SimpleDashboardPage />} />
        <Route path="/uyeler" element={<SimpleMembersPage />} />
        <Route path="/uyeler/:id" element={<SimpleMemberDetailPage />} />
        <Route path="/uye-borc-tablosu" element={<MemberDebtTablePage />} />
        <Route path="/uye-borc-tablosu/:partnerId" element={<MemberDebtTablePage />} />
        <Route
          path="/faiz-isletme"
          element={
            SIMPLIFIED_UI ? (
              <AdminRoute>
                <InterestPage />
              </AdminRoute>
            ) : (
              <InterestPage />
            )
          }
        />
        <Route path="/aidat-dagitim" element={<AidatDistributionPage />} />
        <Route path="/kooperatif-kasasi" element={<CooperativeCashPage />} />
        <Route path="/banka-hareketleri" element={<BankTransactionsPage />} />
        <Route path="/raporlar" element={<ReportsPage />} />
        <Route path="/dokumanlar" element={<LibraryPage />} />
        <Route path="/ayarlar" element={<SimpleSettingsPage />} />
        <Route
          path="/yedekleme"
          element={
            <AdminRoute>
              <BackupPage />
            </AdminRoute>
          }
        />
        <Route path="*" element={<RoutePlaceholder />} />
      </Route>
    </Routes>
  )
}

export default function App(): JSX.Element {
  return (
    <BrowserRouter>
      <AuthProvider>
        <DialogProvider>
          <ToastProvider>
            <ProgressProvider>
              <ProgressBridge />
              <ProgressBar />
              <CooperativeProvider>
                <Routes>
                  <Route path="/login" element={<LoginPage />} />
                  <Route
                    path="/platform/*"
                    element={
                      <RequireAuth>
                        <PlatformApp />
                      </RequireAuth>
                    }
                  />
                  <Route
                    path="/kooperatifler"
                    element={
                      <RequireAuth>
                        <div className="tenant-select-shell">
                          <CooperativesPage />
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
              </CooperativeProvider>
            </ProgressProvider>
          </ToastProvider>
        </DialogProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
