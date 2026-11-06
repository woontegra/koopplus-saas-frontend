import { createContext, useContext, type ReactNode } from 'react'

/** SaaS'ta lisans rozeti yok — masaüstü Sidebar koşulu (trial/paid) hiçbir zaman sağlanmaz. */
export interface LicenseStubState {
  kind: 'none' | 'trial' | 'paid'
  daysRemaining: number | null
}

interface LicenseContextValue {
  state: LicenseStubState
}

const STUB_VALUE: LicenseContextValue = {
  state: { kind: 'none', daysRemaining: null }
}

const LicenseContext = createContext<LicenseContextValue>(STUB_VALUE)

export function LicenseProvider({ children }: { children: ReactNode }): JSX.Element {
  return <LicenseContext.Provider value={STUB_VALUE}>{children}</LicenseContext.Provider>
}

export function useLicense(): LicenseContextValue {
  return useContext(LicenseContext)
}
