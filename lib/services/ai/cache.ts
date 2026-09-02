import AsyncStorage from '@react-native-async-storage/async-storage'

interface CacheEntry<T> {
  data: T
  timestamp: number
  ttlMs: number
}

const CACHE_PREFIX = '@carga_ai_cache:'
const STATS_KEY = '@carga_ai_usage_stats'

export interface AiLifetimeStats {
  totalTokensSavedByCache: number
  totalCallsFromCache: number
  totalCallsToApi: number
  estimatedMoneySavedUsd: number
  estimatedTotalSpentUsd: number
}

/**
 * Serialización determinista y ordenada por claves para evitar colisiones
 * o discrepancias de hashing en caché JSON.
 */
export function stableStringify(obj: unknown): string {
  if (typeof obj !== 'object' || obj === null) return JSON.stringify(obj)
  if (Array.isArray(obj)) return `[${obj.map(stableStringify).join(',')}]`
  const keys = Object.keys(obj as object).sort()
  const pairs = keys.map((k) => `${JSON.stringify(k)}:${stableStringify((obj as any)[k])}`)
  return `{${pairs.join(',')}}`
}

/**
 * Genera un hash determinista a partir de un string o payload
 */
export function simpleHash(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash |= 0 // Convierte a entero de 32bit
  }
  return Math.abs(hash).toString(36)
}

/**
 * Cola en memoria para resolver la race condition al persistir estadísticas concurrentes
 */
type StatsTask = () => Promise<void>
const statsQueue: StatsTask[] = []
let isProcessingStats = false

async function enqueueStatsTask(task: StatsTask): Promise<void> {
  statsQueue.push(task)
  if (isProcessingStats) return
  isProcessingStats = true

  while (statsQueue.length > 0) {
    const nextTask = statsQueue.shift()
    if (nextTask) {
      try {
        await nextTask()
      } catch (err) {
        console.warn('[AiCache] Error actualizando estadísticas:', err)
      }
    }
  }

  isProcessingStats = false
}

/**
 * Obtiene un elemento en caché si aún no ha expirado su TTL
 */
export async function getCachedAiResponse<T>(cacheKey: string): Promise<T | null> {
  try {
    const key = `${CACHE_PREFIX}${cacheKey}`
    const raw = await AsyncStorage.getItem(key)
    if (!raw) return null

    const entry: CacheEntry<T> = JSON.parse(raw)
    const now = Date.now()

    if (now - entry.timestamp > entry.ttlMs) {
      // Expirado
      await AsyncStorage.removeItem(key)
      return null
    }

    // Actualizar estadísticas de ahorro de forma segura y secuencial
    recordCacheHit()

    return entry.data
  } catch (err) {
    console.warn('[AiCache] Error reading cache:', err)
    return null
  }
}

/**
 * Guarda una respuesta en caché con un tiempo de vida (TTL)
 */
export async function setCachedAiResponse<T>(
  cacheKey: string,
  data: T,
  ttlMs: number = 24 * 60 * 60 * 1000 // Por defecto 24 horas
): Promise<void> {
  try {
    const key = `${CACHE_PREFIX}${cacheKey}`
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttlMs,
    }
    await AsyncStorage.setItem(key, JSON.stringify(entry))
  } catch (err) {
    console.warn('[AiCache] Error setting cache:', err)
  }
}

/**
 * Registra un acierto en caché para métricas de ahorro (protegido contra race conditions)
 */
export function recordCacheHit(estimatedTokensSaved = 500): void {
  enqueueStatsTask(async () => {
    const stats = await getLifetimeStats()
    stats.totalCallsFromCache += 1
    stats.totalTokensSavedByCache += estimatedTokensSaved
    stats.estimatedMoneySavedUsd += (estimatedTokensSaved / 1000000) * 1.5
    await AsyncStorage.setItem(STATS_KEY, JSON.stringify(stats))
  })
}

/**
 * Registra una llamada real a la API para métricas (protegido contra race conditions)
 */
export async function recordApiCall(tokensUsed: number, costUsd: number): Promise<void> {
  await enqueueStatsTask(async () => {
    const stats = await getLifetimeStats()
    stats.totalCallsToApi += 1
    stats.estimatedTotalSpentUsd += costUsd
    await AsyncStorage.setItem(STATS_KEY, JSON.stringify(stats))
  })
}

/**
 * Obtiene las estadísticas acumuladas de uso y ahorro de la IA
 */
export async function getLifetimeStats(): Promise<AiLifetimeStats> {
  try {
    const raw = await AsyncStorage.getItem(STATS_KEY)
    if (!raw) {
      return {
        totalTokensSavedByCache: 0,
        totalCallsFromCache: 0,
        totalCallsToApi: 0,
        estimatedMoneySavedUsd: 0,
        estimatedTotalSpentUsd: 0,
      }
    }
    return JSON.parse(raw)
  } catch {
    return {
      totalTokensSavedByCache: 0,
      totalCallsFromCache: 0,
      totalCallsToApi: 0,
      estimatedMoneySavedUsd: 0,
      estimatedTotalSpentUsd: 0,
    }
  }
}

/**
 * Limpia todas las entradas de caché de IA
 */
export async function clearAiCache(): Promise<void> {
  try {
    const allKeys = await AsyncStorage.getAllKeys()
    const aiKeys = allKeys.filter((k) => k.startsWith(CACHE_PREFIX))
    if (aiKeys.length > 0) {
      await AsyncStorage.multiRemove(aiKeys)
    }
  } catch (err) {
    console.warn('[AiCache] Error clearing cache:', err)
  }
}
