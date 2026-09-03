import { useState, useEffect, useCallback } from 'react'
import {
  SleepRecord,
  loadSleepRecords,
  getTodaySleep,
  getSleepForDate,
  getRecentSleepAverage,
  saveSleepRecord,
  subscribeToSleepUpdates,
  recordAppActiveTimestamp,
  EstimatedNightSleep,
} from '../services/sleepService'

export function useSleep() {
  const [logs, setLogs] = useState<SleepRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [estimatedSleep, setEstimatedSleep] = useState<EstimatedNightSleep | null>(null)

  const refresh = useCallback(async () => {
    const loaded = await loadSleepRecords()
    setLogs(loaded)
    setLoading(false)

    // Check if we can estimate night sleep
    const est = await recordAppActiveTimestamp()
    const today = new Date().toISOString().split('T')[0]
    const hasToday = loaded.some((r) => r.date === today)
    if (est && !hasToday) {
      setEstimatedSleep(est)
    } else {
      setEstimatedSleep(null)
    }
  }, [])

  useEffect(() => {
    refresh()
    const unsub = subscribeToSleepUpdates(() => {
      loadSleepRecords().then(setLogs)
    })
    return unsub
  }, [refresh])

  const todayRecord = logs.find((r) => r.date === new Date().toISOString().split('T')[0])
  const stats7Days = getRecentSleepAverage(7)

  const logSleep = async (
    record: Omit<SleepRecord, 'id' | 'deepSleepMinutes' | 'remSleepMinutes' | 'lightSleepMinutes'> & {
      deepSleepMinutes?: number
      remSleepMinutes?: number
      lightSleepMinutes?: number
    }
  ) => {
    const saved = await saveSleepRecord(record)
    setEstimatedSleep(null)
    return saved
  }

  return {
    logs,
    loading,
    todayRecord,
    stats7Days,
    estimatedSleep,
    logSleep,
    getSleepForDate,
    refetch: refresh,
  }
}
