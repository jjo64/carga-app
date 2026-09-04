import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'
import { AppState, Vibration } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { ExerciseDefinition } from '@/constants/exerciseDatabase'
import {
  setupWorkoutNotifications,
  updateWorkoutActiveNotification,
  scheduleRestFinishAlarm,
  cancelRestFinishAlarm,
  clearAllWorkoutNotifications,
  NOTIFICATION_ACTIONS,
} from '@/lib/services/notifications'
import * as Notifications from 'expo-notifications'

export type SetType = 'normal' | 'warmup' | 'dropset' | 'failure'

export interface SetRowData {
  id: string
  setNum: number
  setType: SetType
  previous: string
  weightKg: string
  reps: string
  placeholderWeight: string
  placeholderReps: string
  completed: boolean
}

export interface SessionExercise {
  id: string
  exercise: ExerciseDefinition
  sets: SetRowData[]
}

export interface ActiveWorkoutState {
  routineId: string
  routineTitle: string
  exercises: SessionExercise[]
  activeExerciseIndex: number
  startTime: number
  elapsedSeconds: number
  restEndTime: number | null
  restSeconds: number
  isResting: boolean
  restTimerEnabled: boolean
  defaultRestSeconds: number
  isMinimized: boolean
}

interface ActiveWorkoutContextType {
  activeWorkout: ActiveWorkoutState | null
  startOrResumeWorkout: (routineId: string, routineTitle: string, initialExercises: SessionExercise[]) => void
  setExercises: (updater: SessionExercise[] | ((prev: SessionExercise[]) => SessionExercise[])) => void
  setActiveExerciseIndex: (index: number) => void
  setRoutineTitle: (title: string) => void
  setDefaultRestSeconds: (seconds: number) => void
  setRestTimerEnabled: (enabled: boolean | ((prev: boolean) => boolean)) => void
  startRest: (durationSeconds?: number) => void
  skipRest: () => void
  addRestSeconds: (seconds: number) => void
  setElapsedDuration: (totalSeconds: number) => void
  minimizeWorkout: () => void
  restoreWorkout: () => void
  discardWorkout: () => Promise<void>
  finishWorkout: () => Promise<void>
  toggleSetComplete: (exerciseIndex: number, setId: string) => void
}

const STORAGE_KEY = '@carga_active_workout_session'

const ActiveWorkoutContext = createContext<ActiveWorkoutContextType | null>(null)

export function ActiveWorkoutProvider({ children }: { children: React.ReactNode }) {
  const [activeWorkout, setActiveWorkout] = useState<ActiveWorkoutState | null>(null)
  const activeWorkoutRef = useRef<ActiveWorkoutState | null>(null)
  activeWorkoutRef.current = activeWorkout

  const restFinishedNotifiedRef = useRef<boolean>(false)

  // Format chronometer helper
  const formatChronometer = (totalSecs: number) => {
    const hours = Math.floor(totalSecs / 3600)
    const mins = Math.floor((totalSecs % 3600) / 60)
    const secs = totalSecs % 60
    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // Load saved session on initial app start
  useEffect(() => {
    async function loadSavedWorkout() {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY)
        if (raw) {
          const parsed: ActiveWorkoutState = JSON.parse(raw)
          // Only resume if less than 16 hours old
          if (parsed && parsed.startTime && Date.now() - parsed.startTime < 16 * 3600 * 1000) {
            const elapsed = Math.floor((Date.now() - parsed.startTime) / 1000)
            let restSecs = 0
            let resting = false
            if (parsed.restEndTime && parsed.restEndTime > Date.now()) {
              resting = true
              restSecs = Math.round((parsed.restEndTime - Date.now()) / 1000)
            }
            setActiveWorkout({
              ...parsed,
              elapsedSeconds: Math.max(0, elapsed),
              isResting: resting,
              restSeconds: restSecs,
            })
          } else {
            await AsyncStorage.removeItem(STORAGE_KEY)
          }
        }
      } catch (e) {
        console.log('Error loading saved workout:', e)
      }
    }
    loadSavedWorkout()
  }, [])

  // Auto persist snapshot on state change
  useEffect(() => {
    if (activeWorkout) {
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(activeWorkout)).catch(() => {})
    }
  }, [activeWorkout])

  // Setup notification channel on mount
  useEffect(() => {
    setupWorkoutNotifications()
  }, [])

  // Master 1-second interval ticker for live chronometer, rest countdown, & background notification sync
  useEffect(() => {
    if (!activeWorkout) return

    const timer = setInterval(() => {
      const current = activeWorkoutRef.current
      if (!current) return

      const elapsed = Math.max(0, Math.floor((Date.now() - current.startTime) / 1000))
      const activeEx = current.exercises[current.activeExerciseIndex] || current.exercises[0]
      const currentSetData = activeEx?.sets.find((s) => !s.completed) || activeEx?.sets[activeEx.sets.length - 1]
      const currentSetNum = currentSetData ? currentSetData.setNum : 1

      if (current.isResting && current.restEndTime) {
        const remaining = Math.round((current.restEndTime - Date.now()) / 1000)
        if (remaining <= 0) {
          // Rest finished!
          cancelRestFinishAlarm()
          try {
            Vibration.vibrate([0, 200, 100, 200])
          } catch {}

          setActiveWorkout((prev) => (prev ? { ...prev, elapsedSeconds: elapsed, isResting: false, restSeconds: 0, restEndTime: null } : null))

          if (!restFinishedNotifiedRef.current && activeEx) {
            restFinishedNotifiedRef.current = true
            updateWorkoutActiveNotification({
              routineName: current.routineTitle,
              exerciseName: activeEx.exercise.name,
              currentSet: currentSetNum,
              totalSets: activeEx.sets.length,
              targetWeight: currentSetData?.weightKg || currentSetData?.placeholderWeight || '',
              targetReps: currentSetData?.reps || currentSetData?.placeholderReps || '10',
              durationFormatted: formatChronometer(elapsed),
              isResting: false,
              isRestFinished: true,
            })

            // Transition to active set prompt after 4 seconds
            setTimeout(() => {
              const curState = activeWorkoutRef.current
              if (curState && !curState.isResting && activeEx) {
                updateWorkoutActiveNotification({
                  routineName: curState.routineTitle,
                  exerciseName: activeEx.exercise.name,
                  currentSet: currentSetNum,
                  totalSets: activeEx.sets.length,
                  targetWeight: currentSetData?.weightKg || currentSetData?.placeholderWeight || '',
                  targetReps: currentSetData?.reps || currentSetData?.placeholderReps || '10',
                  durationFormatted: formatChronometer(elapsed + 4),
                  isResting: false,
                  isRestFinished: false,
                })
              }
            }, 4000)
          }
        } else {
          // Ongoing rest countdown tick
          restFinishedNotifiedRef.current = false
          setActiveWorkout((prev) => (prev ? { ...prev, elapsedSeconds: elapsed, restSeconds: remaining } : null))

          if (activeEx) {
            updateWorkoutActiveNotification({
              routineName: current.routineTitle,
              exerciseName: activeEx.exercise.name,
              currentSet: currentSetNum,
              totalSets: activeEx.sets.length,
              targetWeight: currentSetData?.weightKg || currentSetData?.placeholderWeight || '',
              targetReps: currentSetData?.reps || currentSetData?.placeholderReps || '10',
              durationFormatted: formatChronometer(elapsed),
              isResting: true,
              restSecondsLeft: remaining,
              isRestFinished: false,
            })
          }
        }
      } else {
        // Active exercise tick
        setActiveWorkout((prev) => (prev ? { ...prev, elapsedSeconds: elapsed } : null))
      }
    }, 1000)

    return () => clearInterval(timer)
  }, [activeWorkout?.routineId, activeWorkout?.startTime])

  // Sync timers instantly on AppState change (foreground return)
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      const current = activeWorkoutRef.current
      if (!current) return

      if (state === 'active') {
        const elapsed = Math.max(0, Math.floor((Date.now() - current.startTime) / 1000))
        let resting = current.isResting
        let restSecs = current.restSeconds
        let restEnd = current.restEndTime

        if (current.restEndTime) {
          const remaining = Math.round((current.restEndTime - Date.now()) / 1000)
          if (remaining <= 0) {
            resting = false
            restSecs = 0
            restEnd = null
          } else {
            resting = true
            restSecs = remaining
          }
        }

        setActiveWorkout((prev) =>
          prev
            ? {
                ...prev,
                elapsedSeconds: elapsed,
                isResting: resting,
                restSeconds: restSecs,
                restEndTime: restEnd,
              }
            : null
        )
      }
    })
    return () => sub.remove()
  }, [])

  // Interactive notification listener
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const actionId = response.actionIdentifier
      const current = activeWorkoutRef.current
      if (!current) return

      if (actionId === NOTIFICATION_ACTIONS.COMPLETE_SET) {
        // Complete current set from notification
        const activeEx = current.exercises[current.activeExerciseIndex]
        if (!activeEx) return
        const nextPending = activeEx.sets.find((s) => !s.completed)
        if (nextPending) {
          toggleSetComplete(current.activeExerciseIndex, nextPending.id)
        }
      } else if (actionId === NOTIFICATION_ACTIONS.REST_PLUS_30) {
        addRestSeconds(30)
      } else if (actionId === NOTIFICATION_ACTIONS.SKIP_REST) {
        skipRest()
      }
    })

    return () => sub.remove()
  }, [])

  const startOrResumeWorkout = useCallback(
    (routineId: string, routineTitle: string, initialExercises: SessionExercise[]) => {
      const current = activeWorkoutRef.current
      if (current && current.routineId === routineId) {
        // Resume existing workout and un-minimize
        setActiveWorkout((prev) => (prev ? { ...prev, isMinimized: false } : null))
        return
      }

      // Start new workout
      const now = Date.now()
      const newState: ActiveWorkoutState = {
        routineId,
        routineTitle,
        exercises: initialExercises,
        activeExerciseIndex: 0,
        startTime: now,
        elapsedSeconds: 0,
        restEndTime: null,
        restSeconds: 0,
        isResting: false,
        restTimerEnabled: true,
        defaultRestSeconds: 90,
        isMinimized: false,
      }
      setActiveWorkout(newState)
    },
    []
  )

  const setExercises = useCallback(
    (updater: SessionExercise[] | ((prev: SessionExercise[]) => SessionExercise[])) => {
      setActiveWorkout((prev) => {
        if (!prev) return null
        const nextExercises = typeof updater === 'function' ? updater(prev.exercises) : updater
        return { ...prev, exercises: nextExercises }
      })
    },
    []
  )

  const setActiveExerciseIndex = useCallback((index: number) => {
    setActiveWorkout((prev) => (prev ? { ...prev, activeExerciseIndex: index } : null))
  }, [])

  const setRoutineTitle = useCallback((title: string) => {
    setActiveWorkout((prev) => (prev ? { ...prev, routineTitle: title } : null))
  }, [])

  const setDefaultRestSeconds = useCallback((seconds: number) => {
    setActiveWorkout((prev) => (prev ? { ...prev, defaultRestSeconds: seconds } : null))
  }, [])

  const setRestTimerEnabled = useCallback((enabled: boolean | ((prev: boolean) => boolean)) => {
    setActiveWorkout((prev) => {
      if (!prev) return null
      const nextVal = typeof enabled === 'function' ? enabled(prev.restTimerEnabled) : enabled
      if (!nextVal && prev.isResting) {
        cancelRestFinishAlarm()
        return { ...prev, restTimerEnabled: nextVal, isResting: false, restSeconds: 0, restEndTime: null }
      }
      return { ...prev, restTimerEnabled: nextVal }
    })
  }, [])

  const startRest = useCallback((durationSeconds?: number) => {
    setActiveWorkout((prev) => {
      if (!prev) return null
      const dur = durationSeconds || prev.defaultRestSeconds || 90
      const restEnd = Date.now() + dur * 1000

      const activeEx = prev.exercises[prev.activeExerciseIndex]
      const currentSetData = activeEx?.sets.find((s) => !s.completed) || activeEx?.sets[activeEx.sets.length - 1]

      // Schedule OS background alarm for when the timer ends
      if (activeEx) {
        scheduleRestFinishAlarm({
          seconds: dur,
          exerciseName: activeEx.exercise.name,
          currentSet: currentSetData ? currentSetData.setNum : 1,
          totalSets: activeEx.sets.length,
        })
      }

      return {
        ...prev,
        isResting: true,
        restSeconds: dur,
        restEndTime: restEnd,
      }
    })
  }, [])

  const skipRest = useCallback(() => {
    cancelRestFinishAlarm()
    setActiveWorkout((prev) => (prev ? { ...prev, isResting: false, restSeconds: 0, restEndTime: null } : null))
  }, [])

  const addRestSeconds = useCallback((seconds: number) => {
    setActiveWorkout((prev) => {
      if (!prev) return null
      const currentEnd = prev.restEndTime && prev.restEndTime > Date.now() ? prev.restEndTime : Date.now()
      const newEnd = currentEnd + seconds * 1000
      const remaining = Math.round((newEnd - Date.now()) / 1000)

      const activeEx = prev.exercises[prev.activeExerciseIndex]
      const currentSetData = activeEx?.sets.find((s) => !s.completed) || activeEx?.sets[activeEx.sets.length - 1]

      if (activeEx) {
        scheduleRestFinishAlarm({
          seconds: remaining,
          exerciseName: activeEx.exercise.name,
          currentSet: currentSetData ? currentSetData.setNum : 1,
          totalSets: activeEx.sets.length,
        })
      }

      return {
        ...prev,
        isResting: true,
        restSeconds: remaining,
        restEndTime: newEnd,
      }
    })
  }, [])

  const minimizeWorkout = useCallback(() => {
    setActiveWorkout((prev) => (prev ? { ...prev, isMinimized: true } : null))
  }, [])

  const restoreWorkout = useCallback(() => {
    setActiveWorkout((prev) => (prev ? { ...prev, isMinimized: false } : null))
  }, [])

  const discardWorkout = useCallback(async () => {
    await clearAllWorkoutNotifications()
    await AsyncStorage.removeItem(STORAGE_KEY)
    setActiveWorkout(null)
  }, [])

  const finishWorkout = useCallback(async () => {
    await clearAllWorkoutNotifications()
    await AsyncStorage.removeItem(STORAGE_KEY)
    setActiveWorkout(null)
  }, [])

  const toggleSetComplete = useCallback((exerciseIndex: number, setId: string) => {
    setActiveWorkout((prev) => {
      if (!prev) return null
      let shouldTriggerRest = false
      let restDuration = prev.defaultRestSeconds || 90

      const updatedExercises = prev.exercises.map((ex, exIdx) => {
        if (exIdx !== exerciseIndex) return ex
        const nextSets = ex.sets.map((st) => {
          if (st.id === setId) {
            const nextCompleted = !st.completed
            if (nextCompleted && prev.restTimerEnabled && prev.defaultRestSeconds > 0) {
              shouldTriggerRest = true
            }
            return { ...st, completed: nextCompleted }
          }
          return st
        })
        return { ...ex, sets: nextSets }
      })

      if (shouldTriggerRest) {
        const restEnd = Date.now() + restDuration * 1000
        const activeEx = updatedExercises[exerciseIndex]
        const currentSetData = activeEx?.sets.find((s) => !s.completed) || activeEx?.sets[activeEx.sets.length - 1]

        if (activeEx) {
          scheduleRestFinishAlarm({
            seconds: restDuration,
            exerciseName: activeEx.exercise.name,
            currentSet: currentSetData ? currentSetData.setNum : 1,
            totalSets: activeEx.sets.length,
          })
        }

        return {
          ...prev,
          exercises: updatedExercises,
          isResting: true,
          restSeconds: restDuration,
          restEndTime: restEnd,
        }
      }

      return {
        ...prev,
        exercises: updatedExercises,
      }
    })
  }, [])

  const setElapsedDuration = useCallback((totalSeconds: number) => {
    setActiveWorkout((prev) => {
      if (!prev) return null
      return {
        ...prev,
        startTime: Date.now() - totalSeconds * 1000,
        elapsedSeconds: totalSeconds,
      }
    })
  }, [])

  return (
    <ActiveWorkoutContext.Provider
      value={{
        activeWorkout,
        startOrResumeWorkout,
        setExercises,
        setActiveExerciseIndex,
        setRoutineTitle,
        setDefaultRestSeconds,
        setRestTimerEnabled,
        startRest,
        skipRest,
        addRestSeconds,
        setElapsedDuration,
        minimizeWorkout,
        restoreWorkout,
        discardWorkout,
        finishWorkout,
        toggleSetComplete,
      }}
    >
      {children}
    </ActiveWorkoutContext.Provider>
  )
}

export function useActiveWorkout() {
  const ctx = useContext(ActiveWorkoutContext)
  if (!ctx) {
    throw new Error('useActiveWorkout must be used within an ActiveWorkoutProvider')
  }
  return ctx
}
