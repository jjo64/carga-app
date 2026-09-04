import AsyncStorage from '@react-native-async-storage/async-storage'
import { supabase } from '@/lib/supabase'

const DAILY_PHOTO_SCANS_KEY = '@carga_daily_ai_photo_scans'
const LAST_ROUTINE_GEN_KEY = '@carga_last_ai_routine_timestamp'

const MAX_DAILY_PHOTO_SCANS = 5
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000

interface DailyScanRecord {
  count: number
  windowStart: number
}

/**
 * Comprueba si el usuario actual es administrador o desarrollador (cuota infinita).
 */
export async function isCurrentUserAdmin(): Promise<boolean> {
  // 1. Flag de entorno para desarrollo
  if (process.env.EXPO_PUBLIC_ADMIN_DEV_MODE === 'true') {
    return true
  }

  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) return false

    const userEmail = session.user.email?.toLowerCase() || ''
    // Lista de administradores o dominios dev
    if (
      userEmail.includes('admin') ||
      userEmail.includes('cueva') ||
      userEmail.endsWith('@carga.app') ||
      session.user.user_metadata?.role === 'admin'
    ) {
      return true
    }

    // Comprobar rol en tabla user_profiles
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role, is_admin')
      .eq('id', session.user.id)
      .maybeSingle()

    if (profile?.role === 'admin' || profile?.is_admin === true) {
      return true
    }
  } catch {
    // Si no se puede verificar sesión, fallback seguro
  }

  return false
}

// =========================================================================
// 1. CUOTA DIARIA DE ESCANEOS DE FOTO CON IA (5/día)
// =========================================================================
export async function checkPhotoScanQuota(): Promise<{
  allowed: boolean
  remaining: number
  resetHours: number
  isAdmin: boolean
}> {
  const isAdmin = await isCurrentUserAdmin()
  if (isAdmin) {
    return { allowed: true, remaining: 999, resetHours: 0, isAdmin: true }
  }

  try {
    const raw = await AsyncStorage.getItem(DAILY_PHOTO_SCANS_KEY)
    const now = Date.now()

    if (!raw) {
      return { allowed: true, remaining: MAX_DAILY_PHOTO_SCANS, resetHours: 24, isAdmin: false }
    }

    const record: DailyScanRecord = JSON.parse(raw)

    // Si pasaron más de 24h, resetear la ventana
    if (now - record.windowStart >= TWENTY_FOUR_HOURS_MS) {
      return { allowed: true, remaining: MAX_DAILY_PHOTO_SCANS, resetHours: 24, isAdmin: false }
    }

    const remaining = Math.max(0, MAX_DAILY_PHOTO_SCANS - record.count)
    const resetHours = Math.ceil((TWENTY_FOUR_HOURS_MS - (now - record.windowStart)) / (60 * 60 * 1000))

    return {
      allowed: record.count < MAX_DAILY_PHOTO_SCANS,
      remaining,
      resetHours,
      isAdmin: false,
    }
  } catch (err) {
    console.warn('[RateLimiter] Error comprobando cuota diaria de fotos:', err)
    return { allowed: true, remaining: MAX_DAILY_PHOTO_SCANS, resetHours: 24, isAdmin: false }
  }
}

export async function recordPhotoScanUsage(): Promise<void> {
  const isAdmin = await isCurrentUserAdmin()
  if (isAdmin) return

  try {
    const raw = await AsyncStorage.getItem(DAILY_PHOTO_SCANS_KEY)
    const now = Date.now()

    let record: DailyScanRecord
    if (!raw) {
      record = { count: 1, windowStart: now }
    } else {
      record = JSON.parse(raw)
      if (now - record.windowStart >= TWENTY_FOUR_HOURS_MS) {
        record = { count: 1, windowStart: now }
      } else {
        record.count += 1
      }
    }

    await AsyncStorage.setItem(DAILY_PHOTO_SCANS_KEY, JSON.stringify(record))
  } catch (err) {
    console.warn('[RateLimiter] Error registrando uso de foto:', err)
  }
}

// =========================================================================
// 2. LÍMITE SEMANAL DE GENERACIÓN DE RUTINAS / MESOCICLOS (1 vez/semana)
// =========================================================================
export async function checkWeeklyRoutineQuota(): Promise<{
  allowed: boolean
  daysRemaining: number
  isAdmin: boolean
}> {
  const isAdmin = await isCurrentUserAdmin()
  if (isAdmin) {
    return { allowed: true, daysRemaining: 0, isAdmin: true }
  }

  try {
    const raw = await AsyncStorage.getItem(LAST_ROUTINE_GEN_KEY)
    if (!raw) {
      return { allowed: true, daysRemaining: 0, isAdmin: false }
    }

    const lastTimestamp = parseInt(raw, 10)
    const now = Date.now()
    const elapsed = now - lastTimestamp

    if (elapsed >= SEVEN_DAYS_MS) {
      return { allowed: true, daysRemaining: 0, isAdmin: false }
    }

    const daysRemaining = Math.ceil((SEVEN_DAYS_MS - elapsed) / (24 * 60 * 60 * 1000))
    return {
      allowed: false,
      daysRemaining,
      isAdmin: false,
    }
  } catch (err) {
    console.warn('[RateLimiter] Error comprobando límite semanal de rutinas:', err)
    return { allowed: true, daysRemaining: 0, isAdmin: false }
  }
}

export async function recordWeeklyRoutineUsage(): Promise<void> {
  const isAdmin = await isCurrentUserAdmin()
  if (isAdmin) return

  try {
    await AsyncStorage.setItem(LAST_ROUTINE_GEN_KEY, String(Date.now()))
  } catch (err) {
    console.warn('[RateLimiter] Error registrando uso de rutina:', err)
  }
}
