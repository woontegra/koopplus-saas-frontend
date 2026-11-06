/** cuid ↔ masaüstü numeric id eşlemesi (oturum + tenant bazlı). */

type Maps = {
  cuidToNum: Record<string, number>
  numToCuid: Record<string, string>
}

function storageKey(tenantId: string): string {
  return `koopplus.saas.partnerIdMap.${tenantId}`
}

function loadMaps(tenantId: string): Maps {
  try {
    const raw = sessionStorage.getItem(storageKey(tenantId))
    if (!raw) return { cuidToNum: {}, numToCuid: {} }
    const parsed = JSON.parse(raw) as Maps
    return {
      cuidToNum: parsed.cuidToNum ?? {},
      numToCuid: parsed.numToCuid ?? {}
    }
  } catch {
    return { cuidToNum: {}, numToCuid: {} }
  }
}

function saveMaps(tenantId: string, maps: Maps): void {
  try {
    sessionStorage.setItem(storageKey(tenantId), JSON.stringify(maps))
  } catch {
    // quota / private mode
  }
}

function hashCuid(cuid: string): number {
  let h = 2166136261
  for (let i = 0; i < cuid.length; i += 1) {
    h ^= cuid.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  const n = (h >>> 0) % 2000000000
  return n === 0 ? 1 : n
}

export function toNumericId(tenantId: string, cuid: string): number {
  const maps = loadMaps(tenantId)
  const existing = maps.cuidToNum[cuid]
  if (existing != null) return existing

  let num = hashCuid(cuid)
  while (maps.numToCuid[String(num)] && maps.numToCuid[String(num)] !== cuid) {
    num = (num % 2000000000) + 1
  }
  maps.cuidToNum[cuid] = num
  maps.numToCuid[String(num)] = cuid
  saveMaps(tenantId, maps)
  return num
}

export function toCuid(tenantId: string, numericId: number): string | null {
  const maps = loadMaps(tenantId)
  return maps.numToCuid[String(numericId)] ?? null
}

export function rememberPair(tenantId: string, cuid: string, numericId: number): void {
  const maps = loadMaps(tenantId)
  maps.cuidToNum[cuid] = numericId
  maps.numToCuid[String(numericId)] = cuid
  saveMaps(tenantId, maps)
}
