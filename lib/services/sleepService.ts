import AsyncStorage from '@react-native-async-storage/async-storage'

export interface SleepRecord {
  id: string
  date: string // YYYY-MM-DD
  bedtime: string // HH:mm
  wakeTime: string // HH:mm
  durationMinutes: number
  qualityScore: number // 1 to 5 (1=Pésimo, 5=Excelente)
  awakeningsCount: number // 0, 1, 2, 3, 4+
  deepSleepMinutes: number // Sueño profundo (reparación muscular)
  remSleepMinutes: number // Sueño REM (recuperación cognitiva y SNC)
  lightSleepMinutes: number
  source: 'phone_activity' | 'manual_checkin' | 'wearable'
  notes?: string
}

export interface EstimatedNightSleep {
  bedtime: string
  wakeTime: string
  durationMinutes: number
  date: string
  confidence: number
}

const STORAGE_KEY_SLEEP_LOGS = '@carga_sleep_logs_v1'
const STORAGE_KEY_DEVICE_ACTIVITY = '@carga_device_activity_timestamps'

interface DeviceActivityState {
  lastNightActiveTimestamp?: number // ms
  firstMorningActiveTimestamp?: number // ms
  lastRecordedDate?: string
  dismissedPromptDate?: string
}

let inMemorySleepLogs: SleepRecord[] = []
let sleepListeners: Array<() => void> = []

function notifySleepListeners() {
  sleepListeners.forEach((l) => l())
}

export function subscribeToSleepUpdates(listener: () => void) {
  sleepListeners.push(listener)
  return () => {
    sleepListeners = sleepListeners.filter((l) => l !== listener)
  }
}

/**
 * Carga los registros de sueño almacenados localmente
 */
export async function loadSleepRecords(): Promise<SleepRecord[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY_SLEEP_LOGS)
    if (raw) {
      inMemorySleepLogs = JSON.parse(raw)
    } else {
      inMemorySleepLogs = []
    }
  } catch (err) {
    console.log('Error loading sleep logs:', err)
  }
  return inMemorySleepLogs
}

/**
 * Obtiene el registro de sueño para una fecha concreta (YYYY-MM-DD)
 */
export function getSleepForDate(date: string): SleepRecord | undefined {
  return inMemorySleepLogs.find((r) => r.date === date)
}

/**
 * Obtiene el registro de sueño de anoche / hoy
 */
export function getTodaySleep(): SleepRecord | undefined {
  const today = new Date().toISOString().split('T')[0]
  return inMemorySleepLogs.find((r) => r.date === today)
}

/**
 * Obtiene el promedio de horas de sueño de los últimos N días
 */
export function getRecentSleepAverage(days = 7): {
  avgHours: number
  avgQuality: number
  avgDeepMinutes: number
  avgRemMinutes: number
  sleepDebtHours: number
} {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)
  const cutoffStr = cutoff.toISOString().split('T')[0]

  const recent = inMemorySleepLogs.filter((r) => r.date >= cutoffStr)
  if (recent.length === 0) {
    return {
      avgHours: 7.5,
      avgQuality: 4,
      avgDeepMinutes: 85,
      avgRemMinutes: 100,
      sleepDebtHours: 0,
    }
  }

  const totalMin = recent.reduce((sum, r) => sum + r.durationMinutes, 0)
  const totalQuality = recent.reduce((sum, r) => sum + r.qualityScore, 0)
  const totalDeep = recent.reduce((sum, r) => sum + r.deepSleepMinutes, 0)
  const totalRem = recent.reduce((sum, r) => sum + r.remSleepMinutes, 0)

  const avgMinutes = totalMin / recent.length
  const avgHours = Number((avgMinutes / 60).toFixed(1))
  const targetMinutes = 8 * 60
  const sleepDebtHours = Number(
    Math.max(0, (recent.length * targetMinutes - totalMin) / 60).toFixed(1)
  )

  return {
    avgHours,
    avgQuality: Number((totalQuality / recent.length).toFixed(1)),
    avgDeepMinutes: Math.round(totalDeep / recent.length),
    avgRemMinutes: Math.round(totalRem / recent.length),
    sleepDebtHours,
  }
}

/**
 * Calcula de forma científica la estimación de fases según duración y despertares
 */
export function calculateSleepPhases(
  durationMinutes: number,
  qualityScore: number,
  awakeningsCount: number
): { deep: number; rem: number; light: number } {
  // En un adulto normal: Deep ~18-22%, REM ~20-25%, Light ~55%
  // Calidad alta y 0 despertares maximiza deep & REM
  let deepRatio = 0.20
  let remRatio = 0.24

  if (qualityScore >= 4) {
    deepRatio += 0.03
    remRatio += 0.02
  } else if (qualityScore <= 2) {
    deepRatio -= 0.05
    remRatio -= 0.04
  }

  if (awakeningsCount >= 2) {
    deepRatio -= awakeningsCount * 0.02
    remRatio -= awakeningsCount * 0.02
  }

  deepRatio = Math.max(0.10, Math.min(0.28, deepRatio))
  remRatio = Math.max(0.12, Math.min(0.30, remRatio))

  const deep = Math.round(durationMinutes * deepRatio)
  const rem = Math.round(durationMinutes * remRatio)
  const light = Math.max(0, durationMinutes - deep - rem)

  return { deep, rem, light }
}

/**
 * Guarda o actualiza un registro de sueño
 */
export async function saveSleepRecord(
  record: Omit<SleepRecord, 'id' | 'deepSleepMinutes' | 'remSleepMinutes' | 'lightSleepMinutes'> & {
    deepSleepMinutes?: number
    remSleepMinutes?: number
    lightSleepMinutes?: number
  }
): Promise<SleepRecord> {
  const phases =
    record.deepSleepMinutes !== undefined && record.remSleepMinutes !== undefined
      ? {
          deep: record.deepSleepMinutes,
          rem: record.remSleepMinutes,
          light:
            record.lightSleepMinutes ||
            Math.max(0, record.durationMinutes - record.deepSleepMinutes - record.remSleepMinutes),
        }
      : calculateSleepPhases(record.durationMinutes, record.qualityScore, record.awakeningsCount)

  const fullRecord: SleepRecord = {
    id: `sleep-${record.date}-${Date.now()}`,
    ...record,
    deepSleepMinutes: phases.deep,
    remSleepMinutes: phases.rem,
    lightSleepMinutes: phases.light,
  }

  const existingIdx = inMemorySleepLogs.findIndex((r) => r.date === record.date)
  if (existingIdx >= 0) {
    inMemorySleepLogs[existingIdx] = fullRecord
  } else {
    inMemorySleepLogs = [fullRecord, ...inMemorySleepLogs]
  }

  inMemorySleepLogs.sort((a, b) => b.date.localeCompare(a.date))

  try {
    await AsyncStorage.setItem(STORAGE_KEY_SLEEP_LOGS, JSON.stringify(inMemorySleepLogs))
  } catch (e) {
    console.log('Error saving sleep logs to storage:', e)
  }

  notifySleepListeners()
  return fullRecord
}

/**
 * Registra timestamps de interacción con el dispositivo para predecir las horas de sueño
 */
export async function recordAppActiveTimestamp(): Promise<EstimatedNightSleep | null> {
  const now = new Date()
  const hour = now.getHours()
  const todayStr = now.toISOString().split('T')[0]

  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY_DEVICE_ACTIVITY)
    const state: DeviceActivityState = raw ? JSON.parse(raw) : {}

    // Si es de noche (21:00 a 04:59), actualizamos la última interacción nocturna
    if (hour >= 21 || hour < 5) {
      state.lastNightActiveTimestamp = now.getTime()
      state.lastRecordedDate = todayStr
      await AsyncStorage.setItem(STORAGE_KEY_DEVICE_ACTIVITY, JSON.stringify(state))
      return null
    }

    // Si es de mañana (05:00 a 13:00) y tenemos una interacción nocturna previa
    if (hour >= 5 && hour < 14) {
      if (state.lastNightActiveTimestamp) {
        const lastNight = new Date(state.lastNightActiveTimestamp)
        const diffHours = (now.getTime() - state.lastNightActiveTimestamp) / (1000 * 60 * 60)

        // Verificamos que la inactividad tenga sentido (entre 4h y 14h de descanso)
        if (diffHours >= 4 && diffHours <= 14) {
          const bedtime = `${String(lastNight.getHours()).padStart(2, '0')}:${String(
            lastNight.getMinutes()
          ).padStart(2, '0')}`
          const wakeTime = `${String(now.getHours()).padStart(2, '0')}:${String(
            now.getMinutes()
          ).padStart(2, '0')}`
          const durationMinutes = Math.round(diffHours * 60)

          return {
            bedtime,
            wakeTime,
            durationMinutes,
            date: todayStr,
            confidence: 0.85,
          }
        }
      }
    }
  } catch (err) {
    console.log('Error tracking device activity for sleep:', err)
  }

  return null
}
