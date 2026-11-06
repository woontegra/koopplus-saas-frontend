import { Navigate } from 'react-router-dom'

/** Ayrı platform girişi kapatıldı — ana girişe yönlendir. */
export default function PlatformLoginPage(): JSX.Element {
  return <Navigate to="/login" replace />
}
