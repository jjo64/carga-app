import { useState, useEffect, useCallback } from 'react'
import { Pedometer } from 'expo-sensors'
import {
  DailyStepsRecord,
  loadStepsData,
  getTodayStepsRecord,
  updateDailySteps,
  syncHardwarePedometer,
  setDailyStepGoal,
  subscribeToStepUpdates,
} from '../services/stepService'

export function useSteps() {
  const [todayRecord, setTodayRecord] = useState<DailyStepsRecord>(getTodayStepsRecord())
  const [isSensorAvailable, setIsSensorAvailable] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    await loadStepsData()
    await syncHardwarePedometer()
    setTodayRecord(getTodayStepsRecord())
    setLoading(false)
  }, [])

  useEffect(() => {
    Pedometer.isAvailableAsync()
      .then((avail) => setIsSensorAvailable(avail))
      .catch(() => setIsSensorAvailable(false))

    refresh()

    // Subscribe to live pedometer steps if available
    let subscription: { remove: () => void } | null = null
    try {
      subscription = Pedometer.watchStepCount((result) => {
        if (result && typeof result.steps === 'number') {
          const today = new Date().toISOString().split('T')[0]
          updateDailySteps(today, todayRecord.steps + result.steps)
        }
      })
    } catch {
      // Pedometer live watch not supported on some emulators
    }

    const unsub = subscribeToStepUpdates(() => {
      setTodayRecord(getTodayStepsRecord())
    })

    return () => {
      if (subscription) subscription.remove()
      unsub()
    }
  }, [refresh])

  const setGoal = async (newGoal: number) => {
    await setDailyStepGoal(newGoal)
    setTodayRecord(getTodayStepsRecord())
  }

  const logManualSteps = async (steps: number) => {
    const today = new Date().toISOString().split('T')[0]
    const updated = await updateDailySteps(today, steps)
    setTodayRecord(updated)
    return updated
  }

  return {
    todayRecord,
    steps: todayRecord.steps,
    goal: todayRecord.goal,
    distanceKm: todayRecord.distanceKm,
    caloriesBurned: todayRecord.caloriesBurned,
    progressRatio: Math.min(1, todayRecord.steps / (todayRecord.goal || 8000)),
    isSensorAvailable,
    loading,
    setGoal,
    logManualSteps,
    refetch: refresh,
  }
}
