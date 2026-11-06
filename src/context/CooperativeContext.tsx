import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode
} from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

export interface CooperativeItem {
  id: string
  name: string
  status: string
}

interface CooperativeContextValue {
  currentId: string | null
  cooperatives: CooperativeItem[]
  current: CooperativeItem | null
  /** Kooperatif değiştiğinde artar (veri yenileme tetikleyicisi). */
  dataEpoch: number
  openCooperative: (id: string) => Promise<void>
}

const CooperativeContext = createContext<CooperativeContextValue | null>(null)

/** SaaS tenant üyeliklerini masaüstü "kooperatif" modeline uyarlar. */
export function CooperativeProvider({ children }: { children: ReactNode }): JSX.Element {
  const navigate = useNavigate()
  const { memberships, tenantId, selectTenant } = useAuth()
  const [dataEpoch, setDataEpoch] = useState(0)
  const previousTenantRef = useRef<string | null>(tenantId)

  const cooperatives = useMemo<CooperativeItem[]>(
    () =>
      memberships.map((membership) => ({
        id: membership.tenantId,
        name: membership.tenant.name,
        status: membership.tenant.status
      })),
    [memberships]
  )

  useEffect(() => {
    if (previousTenantRef.current !== tenantId) {
      previousTenantRef.current = tenantId
      setDataEpoch((value) => value + 1)
    }
  }, [tenantId])

  const openCooperative = useCallback(
    async (id: string): Promise<void> => {
      selectTenant(id)
      navigate('/')
    },
    [selectTenant, navigate]
  )

  const current = useMemo(
    () => cooperatives.find((item) => item.id === tenantId) ?? null,
    [cooperatives, tenantId]
  )

  const value = useMemo<CooperativeContextValue>(
    () => ({
      currentId: tenantId,
      cooperatives,
      current,
      dataEpoch,
      openCooperative
    }),
    [tenantId, cooperatives, current, dataEpoch, openCooperative]
  )

  return <CooperativeContext.Provider value={value}>{children}</CooperativeContext.Provider>
}

export function useCooperatives(): CooperativeContextValue {
  const ctx = useContext(CooperativeContext)
  if (!ctx) throw new Error('useCooperatives must be used within CooperativeProvider')
  return ctx
}
