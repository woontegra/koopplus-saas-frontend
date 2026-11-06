import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from 'react'
import { useNavigate } from 'react-router-dom'
import type {
  CooperativeCreatePayload,
  CooperativeListResult,
  CooperativeRecord
} from '@shared/types'
import { useAuth } from '../auth/AuthContext'

interface CooperativeContextValue {
  currentId: string | null
  cooperatives: CooperativeRecord[]
  current: CooperativeRecord | null
  dataEpoch: number
  loadError: string | null
  reload: () => Promise<void>
  openCooperative: (id: string) => Promise<void>
  createCooperative: (payload: CooperativeCreatePayload) => Promise<CooperativeRecord>
  archiveCooperative: (id: string) => Promise<void>
  unarchiveCooperative: (id: string) => Promise<void>
}

const CooperativeContext = createContext<CooperativeContextValue | null>(null)

const EMPTY_LIST: CooperativeListResult = { current_id: null, cooperatives: [] }

function cooperativesApi(): NonNullable<Window['api']['cooperatives']> {
  const api = window.api
  if (!api?.cooperatives) {
    throw new Error('Kooperatif API köprüsü yüklenemedi.')
  }
  return api.cooperatives
}

function membershipsToRecords(
  memberships: Array<{
    tenantId: string
    tenant: { name: string; status: string }
  }>,
  currentId: string | null
): CooperativeListResult {
  return {
    current_id: currentId,
    cooperatives: memberships.map((m) => ({
      id: m.tenantId,
      name: m.tenant.name,
      status: (m.tenant.status === 'ARCHIVED' ? 'ARCHIVED' : 'ACTIVE') as CooperativeRecord['status'],
      relative_path: m.tenantId,
      created_at: '',
      last_opened_at: m.tenantId === currentId ? new Date().toISOString() : null,
      origin: 'created' as const
    }))
  }
}

export function CooperativeProvider({ children }: { children: ReactNode }): JSX.Element {
  const navigate = useNavigate()
  const { token, memberships, tenantId, selectTenant, refreshSession, ready } = useAuth()
  const [list, setList] = useState<CooperativeListResult>(EMPTY_LIST)
  const [dataEpoch, setDataEpoch] = useState(0)
  const [loadError, setLoadError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    if (!token) {
      setList(EMPTY_LIST)
      return
    }
    try {
      const res = await cooperativesApi().list()
      if (res.success && res.data) {
        setList({
          ...res.data,
          current_id: res.data.current_id ?? tenantId
        })
        setLoadError(null)
        return
      }
      // API yoksa membership fallback
      setList(membershipsToRecords(memberships, tenantId))
      setLoadError(null)
    } catch (err) {
      setList(membershipsToRecords(memberships, tenantId))
      setLoadError(err instanceof Error ? err.message : 'Kooperatif listesi alınamadı')
    }
  }, [token, memberships, tenantId])

  useEffect(() => {
    if (!ready || !token) {
      setList(EMPTY_LIST)
      setLoadError(null)
      return
    }
    void reload()
  }, [ready, token, reload])

  useEffect(() => {
    // Tenant seçimi değişince epoch + current_id
    setList((prev) => ({ ...prev, current_id: tenantId }))
    setDataEpoch((v) => v + 1)
  }, [tenantId])

  useEffect(() => {
    const api = window.api?.cooperatives
    if (!api?.onChanged) return
    return api.onChanged(() => {
      void reload()
    })
  }, [reload])

  const openCooperative = useCallback(
    async (id: string) => {
      try {
        const res = await cooperativesApi().open(id)
        if (res.success && res.data) {
          selectTenant(res.data.current.id)
          await refreshSession()
          setDataEpoch((v) => v + 1)
          navigate('/')
          return
        }
      } catch {
        /* open endpoint yoksa local switch */
      }
      selectTenant(id)
      setDataEpoch((v) => v + 1)
      navigate('/')
    },
    [navigate, refreshSession, selectTenant]
  )

  const createCooperative = useCallback(
    async (payload: CooperativeCreatePayload) => {
      const res = await cooperativesApi().create(payload)
      if (!res.success || !res.data) {
        throw new Error(res.error ?? 'Kooperatif oluşturulamadı')
      }
      await refreshSession()
      await reload()
      if (res.data.opened) {
        selectTenant(res.data.cooperative.id)
        setDataEpoch((v) => v + 1)
        navigate('/')
      }
      return res.data.cooperative
    },
    [navigate, refreshSession, reload, selectTenant]
  )

  const archiveCooperative = useCallback(
    async (id: string) => {
      const res = await cooperativesApi().archive(id)
      if (!res.success) {
        throw new Error(res.error ?? 'Arşivleme başarısız')
      }
      if (tenantId === id) {
        // aktif tenant arşivlendiyse seçimi temizle — RequireTenant kooperatifler’e yönlendirir
      }
      await refreshSession()
      await reload()
    },
    [refreshSession, reload, tenantId]
  )

  const unarchiveCooperative = useCallback(
    async (id: string) => {
      const res = await cooperativesApi().unarchive(id)
      if (!res.success) {
        throw new Error(res.error ?? 'Arşivden çıkarma başarısız')
      }
      await refreshSession()
      await reload()
    },
    [refreshSession, reload]
  )

  const current = useMemo(
    () => list.cooperatives.find((item) => item.id === (list.current_id ?? tenantId)) ?? null,
    [list, tenantId]
  )

  const value = useMemo(
    () => ({
      currentId: list.current_id ?? tenantId,
      cooperatives: list.cooperatives,
      current,
      dataEpoch,
      loadError,
      reload,
      openCooperative,
      createCooperative,
      archiveCooperative,
      unarchiveCooperative
    }),
    [
      list.current_id,
      list.cooperatives,
      tenantId,
      current,
      dataEpoch,
      loadError,
      reload,
      openCooperative,
      createCooperative,
      archiveCooperative,
      unarchiveCooperative
    ]
  )

  return <CooperativeContext.Provider value={value}>{children}</CooperativeContext.Provider>
}

export function useCooperatives(): CooperativeContextValue {
  const ctx = useContext(CooperativeContext)
  if (!ctx) throw new Error('useCooperatives must be used within CooperativeProvider')
  return ctx
}
