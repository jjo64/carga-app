import AsyncStorage from '@react-native-async-storage/async-storage'
import { Platform } from 'react-native'
import { Pedometer } from 'expo-sensors'
import { syncHardwarePedometer, getTodayStepsRecord, calculateStepMetrics } from './stepService'
import { getTodaySleep } from './sleepService'

export interface HealthSyncStatus {
  isAvailable: boolean
  isAuthorized: boolean
  providerName: 'Apple Health' | 'Health Connect' | 'Sensores de Hardware'
  lastSyncTimestamp: number | null
  syncedMetrics: {
    stepsToday: number
    activeCaloriesBurned: number
    estimatedDistanceKm: number
    sleepHoursToday: number
  }
}

const STORAGE_KEY_HEALTH_SYNC = '@carga_health_sync_status_v1'

/**
 * Servicio centralizado de Salud y Biometría
 * Conecta hardware nativo, Podómetro y prepara enlaces con Apple HealthKit / Google Health Connect.
 */
export const healthSyncService = {
  /**
   * Comprueba la disponibilidad de sensores de salud en el dispositivo
   */
  async checkAvailability(): Promise<boolean> {
    try {
      return await Pedometer.isAvailableAsync()
    } catch {
      return false
    }
  },

  /**
   * Solicita permisos de acceso a sensores de salud y pasos
   */
  async requestPermissions(): Promise<boolean> {
    try {
      const isAvailable = await Pedometer.isAvailableAsync()
      if (!isAvailable) return false
      
      const { status } = await Pedometer.requestPermissionsAsync()
      const granted = status === 'granted'
      
      await AsyncStorage.setItem(
        STORAGE_KEY_HEALTH_SYNC,
        JSON.stringify({
          authorized: granted,
          timestamp: Date.now(),
        })
      )
      
      return granted
    } catch (err) {
      console.log('Error requesting health permissions:', err)
      return false
    }
  },

  /**
   * Sincroniza todos los datos de salud disponibles (Pasos, Distancia, Calorías activas, Sueño)
   */
  async syncAllHealthData(): Promise<HealthSyncStatus> {
    const isAvailable = await this.checkAvailability()
    let isAuthorized = true

    try {
      const perm = await Pedometer.getPermissionsAsync()
      isAuthorized = perm.granted
    } catch {
      isAuthorized = isAvailable
    }

    // 1. Sincronizar pasos de hardware
    const stepsCount = await syncHardwarePedometer()
    const todaySteps = getTodayStepsRecord()
    const stepMetrics = calculateStepMetrics(stepsCount)

    // 2. Obtener sueño
    const todaySleep = getTodaySleep()
    const sleepHours = todaySleep ? Number((todaySleep.durationMinutes / 60).toFixed(1)) : 0

    const provider: HealthSyncStatus['providerName'] =
      Platform.OS === 'ios'
        ? 'Apple Health'
        : Platform.OS === 'android'
        ? 'Health Connect'
        : 'Sensores de Hardware'

    const syncStatus: HealthSyncStatus = {
      isAvailable,
      isAuthorized,
      providerName: provider,
      lastSyncTimestamp: Date.now(),
      syncedMetrics: {
        stepsToday: stepsCount || todaySteps.steps,
        activeCaloriesBurned: stepMetrics.caloriesBurned,
        estimatedDistanceKm: stepMetrics.distanceKm,
        sleepHoursToday: sleepHours,
      },
    }

    try {
      await AsyncStorage.setItem(
        STORAGE_KEY_HEALTH_SYNC,
        JSON.stringify({
          authorized: isAuthorized,
          timestamp: Date.now(),
          lastStatus: syncStatus,
        })
      )
    } catch {}

    return syncStatus
  },

  /**
   * Obtiene el último estado de sincronización guardado
   */
  async getSavedSyncStatus(): Promise<HealthSyncStatus | null> {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY_HEALTH_SYNC)
      if (raw) {
        const parsed = JSON.parse(raw)
        return parsed.lastStatus || null
      }
    } catch {}
    return null
  },
}
