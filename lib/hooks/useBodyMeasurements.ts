import { useState, useEffect, useCallback } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useAuth } from './useAuth'

export interface BodyMeasurementEntry {
  id: string
  date: string // YYYY-MM-DD
  weightKg?: number | null
  bodyFatPct?: number | null
  muscleMassPct?: number | null
  chestCm?: number | null
  waistCm?: number | null
  hipsCm?: number | null
  bicepsCm?: number | null
  thighCm?: number | null
  calvesCm?: number | null
  neckCm?: number | null
  notes?: string | null
  createdAt: string
}

const MEASUREMENTS_STORAGE_KEY = '@fitness_ia_body_measurements'

// Initial measurements start empty for real user tracking
const INITIAL_DEMO_MEASUREMENTS: BodyMeasurementEntry[] = []

export function useBodyMeasurements() {
  const { user } = useAuth()
  const storageKey = user ? `${MEASUREMENTS_STORAGE_KEY}_${user.id}` : MEASUREMENTS_STORAGE_KEY
  const [measurements, setMeasurements] = useState<BodyMeasurementEntry[]>(INITIAL_DEMO_MEASUREMENTS)
  const [loading, setLoading] = useState(true)

  const loadMeasurements = useCallback(async () => {
    try {
      const saved = await AsyncStorage.getItem(storageKey)
      if (saved) {
        const parsed: BodyMeasurementEntry[] = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMeasurements(parsed)
          return
        }
      }
      // If none saved, use demo data
      setMeasurements(INITIAL_DEMO_MEASUREMENTS)
    } catch (e) {
      console.log('Error reading measurements from storage:', e)
      setMeasurements(INITIAL_DEMO_MEASUREMENTS)
    } finally {
      setLoading(false)
    }
  }, [storageKey])

  useEffect(() => {
    loadMeasurements()
  }, [loadMeasurements])

  const saveToStorage = async (newList: BodyMeasurementEntry[]) => {
    try {
      await AsyncStorage.setItem(storageKey, JSON.stringify(newList))
    } catch (e) {
      console.log('Error saving measurements to storage:', e)
    }
  }

  const addMeasurement = async (entry: Omit<BodyMeasurementEntry, 'id' | 'createdAt'>) => {
    const newEntry: BodyMeasurementEntry = {
      ...entry,
      id: `m-${Date.now()}`,
      createdAt: new Date().toISOString(),
    }

    const updated = [newEntry, ...measurements].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    )

    setMeasurements(updated)
    await saveToStorage(updated)
    return newEntry
  }

  const deleteMeasurement = async (id: string) => {
    const updated = measurements.filter((m) => m.id !== id)
    setMeasurements(updated)
    await saveToStorage(updated)
  }

  const latestMeasurement = measurements.length > 0 ? measurements[0] : null
  const previousMeasurement = measurements.length > 1 ? measurements[1] : null

  return {
    measurements,
    latestMeasurement,
    previousMeasurement,
    loading,
    addMeasurement,
    deleteMeasurement,
    refetch: loadMeasurements,
  }
}
