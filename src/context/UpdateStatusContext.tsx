import { createContext, useContext, type ReactNode } from 'react'

/** SaaS'ta otomatik güncelleme yok — footer güncelleme etiketi gizli kalır. */
export interface UpdateStatusStub {
  packaged: boolean
  phase: 'not-available' | 'available' | 'downloaded' | string
}

interface UpdateStatusContextValue {
  status: UpdateStatusStub | null
}

const STUB_VALUE: UpdateStatusContextValue = { status: null }

const UpdateStatusContext = createContext<UpdateStatusContextValue>(STUB_VALUE)

export function UpdateStatusProvider({ children }: { children: ReactNode }): JSX.Element {
  return <UpdateStatusContext.Provider value={STUB_VALUE}>{children}</UpdateStatusContext.Provider>
}

export function useUpdateStatus(): UpdateStatusContextValue {
  return useContext(UpdateStatusContext)
}
