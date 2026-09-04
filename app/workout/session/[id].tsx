import React, { useState, useEffect, useRef, useMemo } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Platform,
  Alert,
  ActivityIndicator,
  Share,
  AppState,
} from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useRouter, useLocalSearchParams, Stack } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import ExerciseIllustration from '@/components/visuals/ExerciseIllustration'
import AddExerciseModal from '@/components/workout/AddExerciseModal'
import ExerciseDetailModal from '@/components/workout/ExerciseDetailModal'
import PainAdaptorModal from '@/components/workout/PainAdaptorModal'
import VoiceSetLoggerModal from '@/components/workout/VoiceSetLoggerModal'
import { EXERCISE_DATABASE, ExerciseDefinition } from '@/constants/exerciseDatabase'
import {
  DEFAULT_STARTER_ROUTINES,
  recordWorkoutSession,
  getSetPlaceholder,
  discardWorkoutSession,
  useWorkoutHistory,
} from '@/lib/hooks/useWorkout'
import { useAuth } from '@/lib/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import Svg, { Circle } from 'react-native-svg'
import * as Notifications from 'expo-notifications'
import {
  setupWorkoutNotifications,
  updateWorkoutActiveNotification,
  scheduleRestFinishedNotification,
  cancelRestFinishedNotification,
  clearAllWorkoutNotifications,
  NOTIFICATION_ACTIONS,
} from '@/lib/services/notifications'

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

export default function LiveWorkoutSessionScreen() {
  const router = useRouter()
  const params = useLocalSearchParams<{ id: string }>()
  const { user, profile } = useAuth()
  const { history: workoutHistory } = useWorkoutHistory()

  const [routineTitle, setRoutineTitle] = useState('Entrenamiento')
  const [exercises, setExercises] = useState<SessionExercise[]>([])
  const [activeExerciseIndex, setActiveExerciseIndex] = useState(0)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [restSeconds, setRestSeconds] = useState(0)
  const [isResting, setIsResting] = useState(false)
  const [restTimerEnabled, setRestTimerEnabled] = useState(true)
  const [defaultRestSeconds, setDefaultRestSeconds] = useState(90)
  const [showEditDurationModal, setShowEditDurationModal] = useState(false)
  const [manualDurationInput, setManualDurationInput] = useState('45')
  const [finishEditedMinutes, setFinishEditedMinutes] = useState(45)
  const [saving, setSaving] = useState(false)
  const [showFinishModal, setShowFinishModal] = useState(false)
  const [showDiscardModal, setShowDiscardModal] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showPainModal, setShowPainModal] = useState(false)
  const [showVoiceModal, setShowVoiceModal] = useState(false)
  const [detailModalExercise, setDetailModalExercise] = useState<ExerciseDefinition | null>(null)
  const startTimeRef = useRef<number>(Date.now())
  const restEndTimeRef = useRef<number | null>(null)
  const carouselScrollRef = useRef<ScrollView>(null)

  // Calculated finish stats
  const [finishStats, setFinishStats] = useState({
    durationMinutes: 0,
    durationFormatted: '0 min',
    totalVolumeKg: 0,
    recordsCount: 0,
    completedSetsCount: 0,
    caloriesBurned: 0,
    previousVolumeKg: 0,
    volumeDiff: 0,
    volumePctChange: 0,
    userWeight: 75,
  })

  // Load routine data on mount
  useEffect(() => {
    async function loadRoutine() {
      const routineId = params.id || 'starter-pecho'

      // 1. Check starter template routines
      const starter = DEFAULT_STARTER_ROUTINES.find(
        (r) => r.id === routineId || routineId.includes(r.target)
      )

      if (starter) {
        setRoutineTitle(starter.name)
        const builtExercises: SessionExercise[] = starter.exercises.map((exItem, idx) => {
          const matchedDb = EXERCISE_DATABASE.find(
            (e) => e.name.toLowerCase() === exItem.name.toLowerCase()
          ) || EXERCISE_DATABASE[idx % EXERCISE_DATABASE.length]

          const setsCount = exItem.target_sets || 3
          const targetReps = exItem.target_reps || '8-10'

          const initialSets: SetRowData[] = Array.from({ length: setsCount }).map((_, sIdx) => {
            const ph = getSetPlaceholder(exItem.name || matchedDb.name, sIdx + 1, targetReps)
            return {
              id: `s-${idx}-${sIdx + 1}`,
              setNum: sIdx + 1,
              setType: 'normal',
              previous: ph.previousSummary,
              weightKg: '',
              reps: '',
              placeholderWeight: ph.placeholderWeight,
              placeholderReps: ph.placeholderReps,
              completed: false,
            }
          })

          return {
            id: `ex-${idx + 1}`,
            exercise: matchedDb,
            sets: initialSets,
          }
        })

        setExercises(builtExercises)
        return
      }

      // 2. Check Supabase DB routine
      try {
        const { data: dbRoutine } = await supabase
          .from('routines')
          .select(`
            *,
            exercises:routine_exercises (*)
          `)
          .eq('id', routineId)
          .single()

        if (dbRoutine && dbRoutine.exercises && dbRoutine.exercises.length > 0) {
          setRoutineTitle(dbRoutine.name)
          const builtExercises: SessionExercise[] = dbRoutine.exercises.map((exItem: any, idx: number) => {
            const matchedDb = EXERCISE_DATABASE.find(
              (e) => e.name.toLowerCase() === exItem.name.toLowerCase()
            ) || EXERCISE_DATABASE[idx % EXERCISE_DATABASE.length]

            const setsCount = exItem.target_sets || 3
            const targetReps = exItem.target_reps || '8-10'

            const initialSets: SetRowData[] = Array.from({ length: setsCount }).map((_, sIdx) => {
              const ph = getSetPlaceholder(exItem.name || matchedDb.name, sIdx + 1, targetReps)
              return {
                id: `s-${idx}-${sIdx + 1}`,
                setNum: sIdx + 1,
                setType: 'normal',
                previous: ph.previousSummary,
                weightKg: '',
                reps: '',
                placeholderWeight: ph.placeholderWeight,
                placeholderReps: ph.placeholderReps,
                completed: false,
              }
            })

            return {
              id: `ex-${idx + 1}`,
              exercise: matchedDb,
              sets: initialSets,
            }
          })
          setExercises(builtExercises)
          return
        }
      } catch (err) {
        console.log('Error loading DB routine:', err)
      }

      // Fallback default exercises
      setRoutineTitle('Pecho - Hipertrofia')
      const defaultExList = [EXERCISE_DATABASE[0], EXERCISE_DATABASE[1]]
      const builtFallback: SessionExercise[] = defaultExList.map((exDef, idx) => {
        const initialSets: SetRowData[] = [1, 2, 3].map((setNum) => {
          const ph = getSetPlaceholder(exDef.name, setNum, '8-10')
          return {
            id: `s-${idx}-${setNum}`,
            setNum,
            setType: 'normal',
            previous: ph.previousSummary,
            weightKg: '',
            reps: '',
            placeholderWeight: ph.placeholderWeight,
            placeholderReps: ph.placeholderReps,
            completed: false,
          }
        })
        return {
          id: `ex-${idx + 1}`,
          exercise: exDef,
          sets: initialSets,
        }
      })
      setExercises(builtFallback)
    }

    loadRoutine()
  }, [params.id])

  // Global live workout chronometer with background timestamp persistence
  useEffect(() => {
    const storageKey = `@workout_session_start_${params.id || 'current'}`
    async function initTimer() {
      try {
        const saved = await AsyncStorage.getItem(storageKey)
        if (saved) {
          const parsed = parseInt(saved, 10)
          if (parsed && Date.now() - parsed < 86400000) {
            startTimeRef.current = parsed
            const diff = Math.floor((Date.now() - parsed) / 1000)
            setElapsedSeconds(diff >= 0 ? diff : 0)
          } else {
            startTimeRef.current = Date.now()
            await AsyncStorage.setItem(storageKey, String(startTimeRef.current))
          }
        } else {
          startTimeRef.current = Date.now()
          await AsyncStorage.setItem(storageKey, String(startTimeRef.current))
        }
      } catch (e) {
        startTimeRef.current = Date.now()
      }
    }
    initTimer()

    const timer = setInterval(() => {
      const diff = Math.floor((Date.now() - startTimeRef.current) / 1000)
      setElapsedSeconds(diff >= 0 ? diff : 0)

      // Live rest countdown tick against exact target timestamp
      if (restEndTimeRef.current) {
        const remaining = Math.round((restEndTimeRef.current - Date.now()) / 1000)
        if (remaining <= 0) {
          setRestSeconds(0)
          setIsResting(false)
          restEndTimeRef.current = null
        } else {
          setRestSeconds(remaining)
        }
      }
    }, 1000)

    return () => clearInterval(timer)
  }, [params.id])

  const activeSessionExercise = exercises[activeExerciseIndex] || exercises[0]
  const currentExercise = activeSessionExercise?.exercise || EXERCISE_DATABASE[0]

  // AI Cognitive Progressive Overload Recommendation for current exercise & upcoming set
  const overloadAdvice = useMemo(() => {
    if (!activeSessionExercise || !activeSessionExercise.sets) return null
    const completedSets = activeSessionExercise.sets.filter((s) => s.completed)
    const nextPending = activeSessionExercise.sets.find((s) => !s.completed)

    const isUpper = [
      'pecho',
      'espalda',
      'hombro',
      'bícep',
      'trícep',
      'dorsal',
      'brazo',
      'chest',
      'back',
      'shoulder',
      'bicep',
      'tricep',
      'torso',
    ].some(
      (m) =>
        (currentExercise.category || '').toLowerCase().includes(m) ||
        (currentExercise.muscleGroup || '').toLowerCase().includes(m)
    )

    if (completedSets.length > 0) {
      const last = completedSets[completedSets.length - 1]
      const w = parseFloat((last.weightKg || last.placeholderWeight || '0').replace(',', '.')) || 0
      const r = parseInt(last.reps || last.placeholderReps || '10', 10) || 10

      if (r >= 10) {
        const increment = isUpper ? 2.5 : 5
        const suggestedWeight = Math.round((w + increment) * 10) / 10
        return {
          type: 'increase_load',
          suggestedWeight,
          suggestedReps: 8,
          badgeText: 'Sobrecarga Lista',
          badgeColor: '#10B981',
          message: `¡Completaste ${r} reps! Sube a ${suggestedWeight} kg (+${increment} kg) para 8-10 reps @ RPE 8.5`,
          actionLabel: nextPending ? `Aplicar ${suggestedWeight} kg a Set ${nextPending.setNum}` : 'Carga Óptima Lograda',
          targetSetId: nextPending?.id,
        }
      } else if (r >= 7) {
        const targetReps = r + 1
        return {
          type: 'double_progression',
          suggestedWeight: w,
          suggestedReps: targetReps,
          badgeText: 'Doble Progresión',
          badgeColor: '#38BDF8',
          message: `Gran serie a ${w} kg. Mantén el peso y busca alcanzar ${targetReps} reps en la siguiente serie`,
          actionLabel: nextPending ? `Fijar ${w} kg en Set ${nextPending.setNum}` : 'Objetivo Cumplido',
          targetSetId: nextPending?.id,
        }
      } else {
        return {
          type: 'recover_and_hold',
          suggestedWeight: w,
          suggestedReps: r,
          badgeText: 'Recuperación',
          badgeColor: '#F59E0B',
          message: `Serie exigente (${r} reps). Mantén ${w} kg y prioriza el descanso completo para asegurar el estímulo`,
          actionLabel: nextPending ? `Fijar ${w} kg en Set ${nextPending.setNum}` : null,
          targetSetId: nextPending?.id,
        }
      }
    } else {
      const firstSet = activeSessionExercise.sets[0]
      const phW = parseFloat((firstSet?.placeholderWeight || '40').replace(',', '.')) || 40
      const phR = firstSet?.placeholderReps || '8-10'
      return {
        type: 'initial_target',
        suggestedWeight: phW,
        suggestedReps: 10,
        badgeText: 'Punto de Partida',
        badgeColor: '#818CF8',
        message: `Carga objetivo sugerida: ${phW} kg x ${phR} reps @ RPE 8 para activar el estímulo neuromuscular`,
        actionLabel: nextPending ? `Auto-rellenar Set 1 con ${phW} kg` : null,
        targetSetId: firstSet?.id,
      }
    }
  }, [activeSessionExercise, currentExercise])

  const handleApplyAiSuggestion = (targetSetId?: string, weight?: number, reps?: number) => {
    if (!targetSetId || weight === undefined) return
    setExercises((prev) =>
      prev.map((ex, exIdx) => {
        if (exIdx !== activeExerciseIndex) return ex
        return {
          ...ex,
          sets: ex.sets.map((st) =>
            st.id === targetSetId
              ? {
                  ...st,
                  weightKg: String(weight),
                  reps: reps ? String(reps) : st.reps || st.placeholderReps || '10',
                }
              : st
          ),
        }
      })
    )
  }

  const formatChronometer = (totalSecs: number) => {
    const hours = Math.floor(totalSecs / 3600)
    const mins = Math.floor((totalSecs % 3600) / 60)
    const secs = totalSecs % 60
    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // Setup Notification Channels & Categories
  useEffect(() => {
    setupWorkoutNotifications()
    return () => {
      clearAllWorkoutNotifications()
    }
  }, [])

  // Interactive Notification Actions Listener (Tick / +30s / Skip)
  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const actionId = response.actionIdentifier
      if (actionId === NOTIFICATION_ACTIONS.COMPLETE_SET) {
        // Complete current active set from notifications bar
        let shouldAutoAdvance = false
        let nextExIndex = activeExerciseIndex

        setExercises((prev) => {
          let completedAny = false
          return prev.map((ex, exIdx) => {
            if (exIdx !== activeExerciseIndex) return ex
            const nextSets = ex.sets.map((st) => {
              if (!completedAny && !st.completed) {
                completedAny = true
                if (restTimerEnabled && defaultRestSeconds > 0) {
                  restEndTimeRef.current = Date.now() + defaultRestSeconds * 1000
                  setRestSeconds(defaultRestSeconds)
                  setIsResting(true)
                  scheduleRestFinishedNotification(
                    currentExercise.name,
                    st.setNum + 1,
                    defaultRestSeconds
                  )
                }
                return { ...st, completed: true }
              }
              return st
            })

            const allCompleted = nextSets.length > 0 && nextSets.every((s) => s.completed)
            if (allCompleted && activeExerciseIndex < prev.length - 1) {
              shouldAutoAdvance = true
              nextExIndex = activeExerciseIndex + 1
            }

            return { ...ex, sets: nextSets }
          })
        })

        if (shouldAutoAdvance) {
          setTimeout(() => {
            setActiveExerciseIndex(nextExIndex)
            carouselScrollRef.current?.scrollTo({ x: nextExIndex * 66, animated: true })
          }, 350)
        }
      } else if (actionId === NOTIFICATION_ACTIONS.REST_PLUS_30) {
        const newEnd = (restEndTimeRef.current && restEndTimeRef.current > Date.now() ? restEndTimeRef.current : Date.now()) + 30000
        restEndTimeRef.current = newEnd
        setRestSeconds(Math.round((newEnd - Date.now()) / 1000))
        setIsResting(true)
      } else if (actionId === NOTIFICATION_ACTIONS.SKIP_REST) {
        restEndTimeRef.current = null
        setIsResting(false)
        setRestSeconds(0)
        cancelRestFinishedNotification()
      }
    })

    return () => subscription.remove()
  }, [activeExerciseIndex, currentExercise, defaultRestSeconds, restTimerEnabled])

  // Sync active notification with current exercise, sets progress when state changes or app backgrounds
  const syncNotification = () => {
    const activeEx = exercises[activeExerciseIndex] || exercises[0]
    if (!activeEx) return

    const currentSetData = activeEx.sets.find((s) => !s.completed) || activeEx.sets[activeEx.sets.length - 1]
    const currentSetNum = currentSetData ? currentSetData.setNum : 1

    updateWorkoutActiveNotification({
      routineName: routineTitle,
      exerciseName: activeEx.exercise.name,
      currentSet: currentSetNum,
      totalSets: activeEx.sets.length,
      targetWeight: currentSetData?.weightKg || currentSetData?.placeholderWeight || '',
      targetReps: currentSetData?.reps || currentSetData?.placeholderReps || '10',
      durationFormatted: formatChronometer(elapsedSeconds),
      isResting,
      restSecondsLeft: restSeconds,
    })
  }

  useEffect(() => {
    syncNotification()
  }, [exercises, activeExerciseIndex, isResting, routineTitle])

  // Handle AppState changes (returning to foreground or backgrounding)
  useEffect(() => {
    const appStateSub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'background' || nextState === 'inactive') {
        syncNotification()
      } else if (nextState === 'active') {
        // Immediately sync timers upon returning to app to prevent any frozen visuals
        const diffElapsed = Math.floor((Date.now() - startTimeRef.current) / 1000)
        setElapsedSeconds(diffElapsed >= 0 ? diffElapsed : 0)

        if (restEndTimeRef.current) {
          const remaining = Math.round((restEndTimeRef.current - Date.now()) / 1000)
          if (remaining <= 0) {
            setRestSeconds(0)
            setIsResting(false)
            restEndTimeRef.current = null
          } else {
            setRestSeconds(remaining)
            setIsResting(true)
          }
        }
      }
    })
    return () => appStateSub.remove()
  }, [exercises, activeExerciseIndex, elapsedSeconds, isResting, restSeconds, routineTitle])

  const toggleSetComplete = (setId: string) => {
    let shouldAutoAdvance = false
    let nextExIndex = activeExerciseIndex

    setExercises((prev) =>
      prev.map((ex, exIdx) => {
        if (exIdx !== activeExerciseIndex) return ex
        const nextSets = ex.sets.map((st) => {
          if (st.id === setId) {
            const nextState = !st.completed
            const effectiveWeight = st.weightKg.trim() || st.placeholderWeight || ''
            const effectiveReps = st.reps.trim() || st.placeholderReps || '10'

            if (nextState && restTimerEnabled && defaultRestSeconds > 0) {
              // Trigger rest timer with configured seconds & schedule notification
              restEndTimeRef.current = Date.now() + defaultRestSeconds * 1000
              setRestSeconds(defaultRestSeconds)
              setIsResting(true)
              scheduleRestFinishedNotification(
                currentExercise.name,
                st.setNum + 1,
                defaultRestSeconds
              )
            }
            return {
              ...st,
              weightKg: nextState ? (effectiveWeight || st.weightKg) : st.weightKg,
              reps: nextState ? (effectiveReps || st.reps) : st.reps,
              completed: nextState,
            }
          }
          return st
        })

        // Auto jump to next exercise if all sets in current exercise are completed
        const allCompleted = nextSets.length > 0 && nextSets.every((s) => s.completed)
        if (allCompleted && activeExerciseIndex < prev.length - 1) {
          shouldAutoAdvance = true
          nextExIndex = activeExerciseIndex + 1
        }

        return {
          ...ex,
          sets: nextSets,
        }
      })
    )

    if (shouldAutoAdvance) {
      setTimeout(() => {
        setActiveExerciseIndex(nextExIndex)
        carouselScrollRef.current?.scrollTo({ x: nextExIndex * 66, animated: true })
      }, 350)
    }
  }

  const cycleSetType = (setId: string) => {
    setExercises((prev) =>
      prev.map((ex, exIdx) => {
        if (exIdx !== activeExerciseIndex) return ex
        return {
          ...ex,
          sets: ex.sets.map((st) => {
            if (st.id === setId) {
              const order: SetType[] = ['normal', 'warmup', 'dropset', 'failure']
              const currentIdx = order.indexOf(st.setType || 'normal')
              const nextType = order[(currentIdx + 1) % order.length]
              return { ...st, setType: nextType }
            }
            return st
          }),
        }
      })
    )
  }

  const deleteSet = (setId: string) => {
    setExercises((prev) =>
      prev.map((ex, exIdx) => {
        if (exIdx !== activeExerciseIndex) return ex
        if (ex.sets.length <= 1) return ex
        const filtered = ex.sets.filter((s) => s.id !== setId)
        const reindexed = filtered.map((s, idx) => ({ ...s, setNum: idx + 1 }))
        return { ...ex, sets: reindexed }
      })
    )
  }

  const addSet = () => {
    setExercises((prev) =>
      prev.map((ex, exIdx) => {
        if (exIdx !== activeExerciseIndex) return ex
        const last = ex.sets[ex.sets.length - 1]
        const newSetNum = ex.sets.length + 1
        const ph = getSetPlaceholder(ex.exercise.name, newSetNum)
        const newSet: SetRowData = {
          id: `s-${Date.now()}-${newSetNum}`,
          setNum: newSetNum,
          setType: 'normal',
          previous: last
            ? `${last.weightKg || last.placeholderWeight} kg x ${last.reps || last.placeholderReps}`
            : ph.previousSummary,
          weightKg: '',
          reps: '',
          placeholderWeight: last?.weightKg || last?.placeholderWeight || ph.placeholderWeight || '50',
          placeholderReps: last?.reps || last?.placeholderReps || ph.placeholderReps || '10',
          completed: false,
        }
        return { ...ex, sets: [...ex.sets, newSet] }
      })
    )
  }

  const updateSetField = (setId: string, field: 'weightKg' | 'reps', val: string) => {
    setExercises((prev) =>
      prev.map((ex, exIdx) => {
        if (exIdx !== activeExerciseIndex) return ex
        return {
          ...ex,
          sets: ex.sets.map((st) => (st.id === setId ? { ...st, [field]: val } : st)),
        }
      })
    )
  }

  const handleAddExerciseToSession = (newEx: ExerciseDefinition) => {
    const s1Ph = getSetPlaceholder(newEx.name, 1, '8-10')
    const s2Ph = getSetPlaceholder(newEx.name, 2, '8-10')
    const s3Ph = getSetPlaceholder(newEx.name, 3, '8-10')

    setExercises((prev) => [
      ...prev,
      {
        id: `sess-ex-${Date.now()}`,
        exercise: newEx,
        sets: [
          { id: `s1-${Date.now()}`, setNum: 1, setType: 'normal', previous: s1Ph.previousSummary, weightKg: '', reps: '', placeholderWeight: s1Ph.placeholderWeight, placeholderReps: s1Ph.placeholderReps, completed: false },
          { id: `s2-${Date.now()}`, setNum: 2, setType: 'normal', previous: s2Ph.previousSummary, weightKg: '', reps: '', placeholderWeight: s2Ph.placeholderWeight, placeholderReps: s2Ph.placeholderReps, completed: false },
          { id: `s3-${Date.now()}`, setNum: 3, setType: 'normal', previous: s3Ph.previousSummary, weightKg: '', reps: '', placeholderWeight: s3Ph.placeholderWeight, placeholderReps: s3Ph.placeholderReps, completed: false },
        ],
      },
    ])
    setShowAddModal(false)
  }

  const handleAddExercisesToSession = (newExercises: ExerciseDefinition[]) => {
    const newItems = newExercises.map((newEx, i) => {
      const s1Ph = getSetPlaceholder(newEx.name, 1, '8-10')
      const s2Ph = getSetPlaceholder(newEx.name, 2, '8-10')
      const s3Ph = getSetPlaceholder(newEx.name, 3, '8-10')
      return {
        id: `sess-ex-${Date.now()}-${i}`,
        exercise: newEx,
        sets: [
          { id: `s1-${Date.now()}-${i}`, setNum: 1, setType: 'normal' as SetType, previous: s1Ph.previousSummary, weightKg: '', reps: '', placeholderWeight: s1Ph.placeholderWeight, placeholderReps: s1Ph.placeholderReps, completed: false },
          { id: `s2-${Date.now()}-${i}`, setNum: 2, setType: 'normal' as SetType, previous: s2Ph.previousSummary, weightKg: '', reps: '', placeholderWeight: s2Ph.placeholderWeight, placeholderReps: s2Ph.placeholderReps, completed: false },
          { id: `s3-${Date.now()}-${i}`, setNum: 3, setType: 'normal' as SetType, previous: s3Ph.previousSummary, weightKg: '', reps: '', placeholderWeight: s3Ph.placeholderWeight, placeholderReps: s3Ph.placeholderReps, completed: false },
        ],
      }
    })

    setExercises((prev) => [...prev, ...newItems])
    setShowAddModal(false)
  }

  const handleApplyPainReplacement = (
    newExercise: ExerciseDefinition,
    sets: number,
    reps: string,
    notes: string
  ) => {
    setExercises((prev) => {
      const next = [...prev]
      if (next[activeExerciseIndex]) {
        const remainingSets: SetRowData[] = Array.from({ length: sets || 3 }).map((_, sIdx) => {
          const ph = getSetPlaceholder(newExercise.name, sIdx + 1, reps)
          return {
            id: `s-pain-${Date.now()}-${sIdx + 1}`,
            setNum: sIdx + 1,
            setType: 'normal',
            previous: `Variante Segura (${reps} reps)`,
            weightKg: '',
            reps: '',
            placeholderWeight: ph.placeholderWeight,
            placeholderReps: reps.split('-')[0] || '10',
            completed: false,
          }
        })
        next[activeExerciseIndex] = {
          id: `ex-pain-${Date.now()}`,
          exercise: newExercise,
          sets: remainingSets,
        }
      }
      return next
    })
    setShowPainModal(false)
    Alert.alert(
      'Variante Adaptada',
      `Se ha reemplazado por "${newExercise.name}". Las series han sido adaptadas biomecánicamente.`
    )
  }

  const handleLogVoiceSet = (data: {
    setNum?: number
    weightKg: number
    reps: number
    rpe?: number
    notes?: string
  }) => {
    let completedSetNumber = 1
    setExercises((prev) =>
      prev.map((ex, exIdx) => {
        if (exIdx !== activeExerciseIndex) return ex

        let targetIndex = ex.sets.findIndex((s) => !s.completed)
        if (targetIndex === -1) {
          targetIndex = ex.sets.length
        }

        const setsCopy = [...ex.sets]
        const targetSet: SetRowData = setsCopy[targetIndex] || {
          id: `s-voice-${Date.now()}`,
          setNum: targetIndex + 1,
          setType: 'normal',
          previous: `${data.weightKg} kg x ${data.reps}`,
          weightKg: String(data.weightKg),
          reps: String(data.reps),
          placeholderWeight: String(data.weightKg),
          placeholderReps: String(data.reps),
          completed: true,
        }

        targetSet.weightKg = String(data.weightKg)
        targetSet.reps = String(data.reps)
        targetSet.completed = true
        completedSetNumber = targetSet.setNum
        setsCopy[targetIndex] = targetSet

        return { ...ex, sets: setsCopy }
      })
    )

    // Trigger rest timer & schedule notification
    if (restTimerEnabled && defaultRestSeconds > 0) {
      setRestSeconds(defaultRestSeconds)
      setIsResting(true)
      scheduleRestFinishedNotification(
        currentExercise.name,
        completedSetNumber + 1,
        defaultRestSeconds
      )
    }

    setShowVoiceModal(false)
  }

  const handlePromptDiscard = () => {
    setShowDiscardModal(true)
  }

  const handleConfirmDiscard = async () => {
    setShowDiscardModal(false)
    if (params.id) {
      await discardWorkoutSession(params.id, user?.id)
      await AsyncStorage.removeItem(`@workout_session_start_${params.id || 'current'}`)
    }
    await clearAllWorkoutNotifications()
    router.back()
  }

  // Calculate real metrics and finish workout
  const handleInitiateFinish = async () => {
    const durationMins = Math.max(1, Math.round(elapsedSeconds / 60))
    setFinishEditedMinutes(durationMins)
    const hours = Math.floor(durationMins / 60)
    const mins = durationMins % 60
    const durationFormatted = hours > 0 ? (mins > 0 ? `${hours}h ${mins}min` : `${hours}h`) : `${mins} min`

    // Calculate real volume from completed sets
    let totalVol = 0
    let completedCount = 0
    let recordsAchieved = 0

    const exerciseDataForSave = exercises.map((ex) => {
      const setsData = ex.sets.map((s) => {
        const wStr = s.weightKg.trim() || s.placeholderWeight || '0'
        const rStr = s.reps.trim() || s.placeholderReps || '0'
        const w = parseFloat(wStr.replace(',', '.')) || 0
        const r = parseInt(rStr, 10) || 0
        const isDone = s.completed

        if (isDone) {
          totalVol += w * r
          completedCount += 1
        }
        return {
          setNum: s.setNum,
          weightKg: w,
          reps: r,
          completed: isDone,
        }
      })

      const sessionMax = Math.max(...setsData.map((s) => s.weightKg), 0)
      if (sessionMax >= (ex.exercise.records?.maxWeight || 50)) {
        recordsAchieved += 1
      }

      return {
        name: ex.exercise.name,
        muscleGroup: ex.exercise.muscleGroup,
        sets: setsData,
      }
    })

    if (recordsAchieved === 0 && totalVol > 3000) {
      recordsAchieved = 1
    }

    const userWeight = profile?.weight_kg || profile?.initial_weight_kg || 75
    const estimatedCalories = Math.round(
      5.0 * userWeight * (durationMins / 60) + (totalVol / 100) * 0.1
    )

    const prevWorkout = (workoutHistory || []).find(
      (w) => w.volumeKg && w.volumeKg > 0 && (!params.id || w.id !== params.id)
    )
    const prevVol = prevWorkout?.volumeKg || 0
    const currentVol = Math.round(totalVol * 10) / 10
    const volumeDiff = Math.round((currentVol - prevVol) * 10) / 10
    const volumePctChange = prevVol > 0 ? Math.round(((currentVol - prevVol) / prevVol) * 100) : 0

    setFinishStats({
      durationMinutes: durationMins,
      durationFormatted,
      totalVolumeKg: currentVol,
      recordsCount: recordsAchieved,
      completedSetsCount: completedCount,
      caloriesBurned: estimatedCalories,
      previousVolumeKg: prevVol,
      volumeDiff,
      volumePctChange,
      userWeight,
    })

    setShowFinishModal(true)
    handleConfirmSaveWorkout(durationMins)
  }

  const handleConfirmSaveWorkout = async (customMins?: number) => {
    const finalMins = customMins ?? finishEditedMinutes ?? Math.max(1, Math.round(elapsedSeconds / 60))
    let totalVol = 0
    let recordsAchieved = 0

    const exerciseDataForSave = exercises.map((ex) => {
      const setsData = ex.sets.map((s) => {
        const wStr = s.weightKg.trim() || s.placeholderWeight || '0'
        const rStr = s.reps.trim() || s.placeholderReps || '0'
        const w = parseFloat(wStr.replace(',', '.')) || 0
        const r = parseInt(rStr, 10) || 0
        const isDone = s.completed

        if (isDone) {
          totalVol += w * r
        }
        return {
          setNum: s.setNum,
          weightKg: w,
          reps: r,
          completed: isDone,
        }
      })

      const sessionMax = Math.max(...setsData.map((s) => s.weightKg), 0)
      if (sessionMax >= (ex.exercise.records?.maxWeight || 50)) {
        recordsAchieved += 1
      }

      return {
        name: ex.exercise.name,
        muscleGroup: ex.exercise.muscleGroup,
        sets: setsData,
      }
    })

    if (recordsAchieved === 0 && totalVol > 3000) {
      recordsAchieved = 1
    }

    setSaving(true)
    try {
      await recordWorkoutSession({
        userId: user?.id,
        routineId: params.id,
        routineName: routineTitle,
        durationMinutes: finalMins,
        totalVolumeKg: Math.round(totalVol * 10) / 10,
        recordsCount: recordsAchieved,
        userWeightKg: profile?.weight_kg || profile?.initial_weight_kg || 75,
        exercises: exerciseDataForSave,
      })

      await AsyncStorage.removeItem(`@workout_session_start_${params.id || 'current'}`)
      await clearAllWorkoutNotifications()
    } catch (e) {
      console.log('Error in recordWorkoutSession:', e)
    } finally {
      setSaving(false)
    }
  }

  const handleShareWorkoutSession = async () => {
    try {
      const durationStr = `${finishEditedMinutes} min`
      const exercisesSummary = exercises
        .map((ex) => {
          const setsStr = ex.sets
            .map((s) => `  • Serie ${s.setNum}: ${s.weightKg} kg x ${s.reps} reps ${s.completed ? '✅' : '⏳'}`)
            .join('\n')
          return `🏋️ ${ex.exercise.name} (${ex.exercise.muscleGroup}):\n${setsStr}`
        })
        .join('\n\n')

      const shareText = `⚡ ENTRENAMIENTO COMPLETADO EN CARGA APP\n📋 Rutina: ${routineTitle}\n⏱️ Duración: ${durationStr}\n🏋️ Volumen total: ${finishStats.totalVolumeKg.toLocaleString('es-ES')} kg\n🥇 Récords PR: ${finishStats.recordsCount}\n\nDetalle de Series:\n${exercisesSummary}\n\n¡Entrena con Carga App! 💪🔥`

      await Share.share({
        title: `Entrenamiento - ${routineTitle}`,
        message: shareText,
      })
    } catch (e) {
      console.log('Share error:', e)
    }
  }

  return (
    <View style={styles.container}>
      {/* ── Screen Header with Routine Name only ── */}
      <Stack.Screen
        options={{
          title: routineTitle || 'Entrenamiento',
          headerStyle: { backgroundColor: '#09090B' },
          headerTintColor: '#FAFAFA',
          headerTitleStyle: { fontWeight: '800', fontSize: 18 },
          headerShadowVisible: false,
        }}
      />

      {/* ── Top Control Bar with Live Chronometer, Discard & Rest Settings ── */}
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={handlePromptDiscard}
          style={styles.discardTopBtn}
          activeOpacity={0.7}
        >
          <Text style={styles.discardTopText}>Descartar</Text>
        </TouchableOpacity>

        {/* Live Running Stopwatch Chronometer & Rest Pill */}
        <TouchableOpacity
          onPress={() => {
            setManualDurationInput(String(Math.max(1, Math.round(elapsedSeconds / 60))))
            setShowEditDurationModal(true)
          }}
          style={styles.liveTimerPill}
          activeOpacity={0.8}
        >
          <Ionicons name="time-outline" size={13} color="#A1A1AA" />
          <Text style={styles.liveTimerText}>{formatChronometer(elapsedSeconds)}</Text>
          <Text style={styles.timerDivider}>·</Text>
          <TouchableOpacity
            onPress={() => {
              setRestTimerEnabled((prev) => !prev)
              if (isResting) {
                restEndTimeRef.current = null
                setIsResting(false)
                setRestSeconds(0)
              }
            }}
            style={styles.innerRestToggle}
            activeOpacity={0.7}
          >
            <Ionicons
              name="hourglass-outline"
              size={12}
              color={restTimerEnabled ? '#38BDF8' : '#71717A'}
            />
            <Text style={[styles.restToggleText, !restTimerEnabled && { color: '#71717A' }]}>
              {restTimerEnabled ? `${defaultRestSeconds}s` : 'Off'}
            </Text>
          </TouchableOpacity>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleInitiateFinish}
          activeOpacity={0.8}
          style={styles.finishTopBtn}
        >
          <Text style={styles.finishBtnText}>Terminar</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Main Exercise High Definition Illustration Banner ── */}
        <View style={styles.illustrationSection}>
          <ExerciseIllustration
            exerciseId={currentExercise.id}
            exerciseName={currentExercise.name}
            imageUrl={currentExercise.imageUrl}
            size={220}
            variant="large-banner"
            highlightColor="#FAFAFA"
          />

          {/* Floating Pill: "Técnica" */}
          <TouchableOpacity
            style={styles.techniqueBtn}
            onPress={() => setDetailModalExercise(currentExercise)}
            activeOpacity={0.85}
          >
            <Ionicons name="play-circle-outline" size={14} color="#FAFAFA" />
            <Text style={styles.techniqueBtnText}>Técnica</Text>
          </TouchableOpacity>
        </View>

        {/* ── Horizontal Swipeable Exercise Thumbnails Carousel ── */}
        <ScrollView
          ref={carouselScrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.carouselContainer}
        >
          {exercises.map((item, idx) => {
            const isActive = idx === activeExerciseIndex
            const isCompleted = item.sets.length > 0 && item.sets.every((s) => s.completed)

            return (
              <TouchableOpacity
                key={item.id}
                onPress={() => {
                  setActiveExerciseIndex(idx)
                  carouselScrollRef.current?.scrollTo({ x: idx * 64, animated: true })
                }}
                style={[
                  styles.thumbWrapper,
                  isActive && styles.thumbWrapperActive,
                ]}
                activeOpacity={0.8}
              >
                <ExerciseIllustration
                  exerciseId={item.exercise.id}
                  exerciseName={item.exercise.name}
                  imageUrl={item.exercise.imageUrl}
                  size={46}
                  variant="circle-thumb"
                />

                {isActive && (
                  <View style={styles.activeRingOverlay}>
                    <Svg width="54" height="54" viewBox="0 0 54 54">
                      <Circle
                        cx="27"
                        cy="27"
                        r="25"
                        stroke="#FAFAFA"
                        strokeWidth="2"
                        fill="none"
                      />
                    </Svg>
                  </View>
                )}

                {isCompleted && (
                  <View style={styles.completedCheckBadge}>
                    <Ionicons name="checkmark" size={11} color="#09090B" />
                  </View>
                )}
              </TouchableOpacity>
            )
          })}

          <TouchableOpacity
            style={styles.addExerciseDashedBtn}
            onPress={() => setShowAddModal(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={20} color="#71717A" />
          </TouchableOpacity>
        </ScrollView>

        {/* ── Exercise Title Header & Action Pills ── */}
        <View style={styles.exerciseHeaderCard}>
          <View style={styles.exerciseTitleTopRow}>
            <Text style={styles.exerciseHeaderTitle} numberOfLines={2}>
              {currentExercise.name}
            </Text>
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => {
                const restSec = defaultRestSeconds || 90
                restEndTimeRef.current = Date.now() + restSec * 1000
                setRestSeconds(restSec)
                setIsResting(true)
                scheduleRestFinishedNotification(currentExercise.name, 1, restSec)
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="timer-outline" size={20} color="#38BDF8" />
            </TouchableOpacity>
          </View>

          <View style={styles.exerciseActionsRow}>
            <TouchableOpacity
              style={styles.voiceLoggerBtn}
              onPress={() => setShowVoiceModal(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="mic-outline" size={13} color="#38BDF8" />
              <Text style={styles.voiceLoggerBtnText}>Voz</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.painAdaptorBtn}
              onPress={() => setShowPainModal(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="medkit-outline" size={13} color="#F59E0B" />
              <Text style={styles.painAdaptorBtnText}>Molestia</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.infoPillBtn}
              onPress={() => setDetailModalExercise(currentExercise)}
              activeOpacity={0.8}
            >
              <Ionicons name="information-circle-outline" size={13} color="#A1A1AA" />
              <Text style={styles.infoPillBtnText}>Detalles</Text>
            </TouchableOpacity>
          </View>

          {/* ── AI Cognitive Progressive Overload Recommendation Card ── */}
          {overloadAdvice && (
            <View style={styles.aiSuggestionCard}>
              <View style={styles.aiSuggestionHeader}>
                <View style={styles.aiSuggestionBadge}>
                  <Text style={styles.aiSparkleIcon}>✨</Text>
                  <Text style={styles.aiSuggestionBadgeText}>
                    {overloadAdvice.badgeText} · SOBRECARGA IA
                  </Text>
                </View>
              </View>

              <Text style={styles.aiSuggestionMessage}>{overloadAdvice.message}</Text>

              {overloadAdvice.actionLabel && overloadAdvice.targetSetId && (
                <TouchableOpacity
                  style={styles.aiApplyBtn}
                  onPress={() =>
                    handleApplyAiSuggestion(
                      overloadAdvice.targetSetId,
                      overloadAdvice.suggestedWeight,
                      overloadAdvice.suggestedReps
                    )
                  }
                  activeOpacity={0.85}
                >
                  <Ionicons name="flash" size={12} color="#09090B" />
                  <Text style={styles.aiApplyBtnText}>{overloadAdvice.actionLabel}</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        {/* ── Sets Table (Calculated fixed-width columns to strictly avoid overlaps) ── */}
        <View style={styles.tableContainer}>
          <View style={styles.tableHeaderRow}>
            <Text style={styles.thSet}>SET</Text>
            <Text style={styles.thAnterior}>ANTERIOR</Text>
            <Text style={styles.thKg}>KG</Text>
            <Text style={styles.thReps}>REPES</Text>
            <Text style={styles.thCheck}>✓</Text>
            {activeSessionExercise?.sets.length > 1 && <View style={styles.thDelete} />}
          </View>

          <View style={styles.tableBody}>
            {(activeSessionExercise?.sets || []).map((row) => {
              const setTypeLabel =
                row.setType === 'warmup'
                  ? 'W'
                  : row.setType === 'dropset'
                  ? 'D'
                  : row.setType === 'failure'
                  ? 'F'
                  : String(row.setNum)

              const setTypeBadgeStyle =
                row.setType === 'warmup'
                  ? styles.badgeWarmup
                  : row.setType === 'dropset'
                  ? styles.badgeDropset
                  : row.setType === 'failure'
                  ? styles.badgeFailure
                  : styles.badgeNormal

              const setTypeTextStyle =
                row.setType === 'warmup'
                  ? styles.badgeTextWarmup
                  : row.setType === 'dropset'
                  ? styles.badgeTextDropset
                  : row.setType === 'failure'
                  ? styles.badgeTextFailure
                  : styles.badgeTextNormal

              const displayPrevia = row.previous && row.previous !== 'Primer registro' && !row.previous.includes('PR: 0')
                ? row.previous
                : '—'

              return (
                <View
                  key={row.id}
                  style={[
                    styles.tableRow,
                    row.completed && styles.tableRowCompleted,
                  ]}
                >
                  {/* Serie Number / Type Selector Button */}
                  <TouchableOpacity
                    style={[styles.serieNumBox, setTypeBadgeStyle]}
                    onPress={() => cycleSetType(row.id)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.serieNumText, setTypeTextStyle]}>{setTypeLabel}</Text>
                  </TouchableOpacity>

                  {/* Previa */}
                  <Text style={styles.previaText} numberOfLines={1}>
                    {displayPrevia}
                  </Text>

                  {/* KG Input Box */}
                  <View style={[styles.inputContainer, row.completed && styles.inputContainerCompleted]}>
                    <TextInput
                      style={[styles.tableInput, row.completed && styles.tableInputCompleted]}
                      value={row.weightKg}
                      placeholder={row.placeholderWeight || '—'}
                      placeholderTextColor="#52525B"
                      onChangeText={(val) => updateSetField(row.id, 'weightKg', val)}
                      keyboardType="decimal-pad"
                      selectTextOnFocus
                    />
                  </View>

                  {/* Reps Input Box */}
                  <View style={[styles.inputContainer, row.completed && styles.inputContainerCompleted]}>
                    <TextInput
                      style={[styles.tableInput, row.completed && styles.tableInputCompleted]}
                      value={row.reps}
                      placeholder={row.placeholderReps || '10'}
                      placeholderTextColor="#52525B"
                      onChangeText={(val) => updateSetField(row.id, 'reps', val)}
                      keyboardType="number-pad"
                      selectTextOnFocus
                    />
                  </View>

                  {/* Check Button */}
                  <TouchableOpacity
                    style={[
                      styles.checkCircleBtn,
                      row.completed && styles.checkCircleBtnCompleted,
                    ]}
                    onPress={() => toggleSetComplete(row.id)}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name="checkmark"
                      size={16}
                      color={row.completed ? '#09090B' : '#71717A'}
                    />
                  </TouchableOpacity>

                  {/* Delete Set Icon if > 1 set */}
                  {activeSessionExercise?.sets.length > 1 && (
                    <TouchableOpacity
                      style={styles.deleteSetMiniBtn}
                      onPress={() => deleteSet(row.id)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="trash-outline" size={14} color="#52525B" />
                    </TouchableOpacity>
                  )}
                </View>
              )
            })}
          </View>
        </View>

        {/* Bottom Button: "+ Añadir serie" */}
        <TouchableOpacity
          style={styles.addSerieBtn}
          onPress={addSet}
          activeOpacity={0.85}
        >
          <Text style={styles.addSerieBtnText}>+ Añadir serie</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Rest Timer Floating Bar */}
      {isResting && (
        <View style={styles.restFloatingBar}>
          <View style={styles.restBarLeft}>
            <Ionicons name="timer-outline" size={20} color="#38BDF8" />
            <Text style={styles.restTimeText}>{formatChronometer(restSeconds)}</Text>
            <Text style={styles.restLabelText}>Descanso</Text>
          </View>

          <View style={styles.restBarActions}>
            <TouchableOpacity
              style={styles.restAdjustBtn}
              onPress={() => {
                const newEnd = Math.max(Date.now(), (restEndTimeRef.current || Date.now()) - 15000)
                restEndTimeRef.current = newEnd
                setRestSeconds(Math.round((newEnd - Date.now()) / 1000))
              }}
            >
              <Text style={styles.restAdjustText}>-15s</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.restAdjustBtn}
              onPress={() => {
                const newEnd = (restEndTimeRef.current && restEndTimeRef.current > Date.now() ? restEndTimeRef.current : Date.now()) + 15000
                restEndTimeRef.current = newEnd
                setRestSeconds(Math.round((newEnd - Date.now()) / 1000))
              }}
            >
              <Text style={styles.restAdjustText}>+15s</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.restSkipBtn}
              onPress={() => {
                restEndTimeRef.current = null
                setIsResting(false)
                setRestSeconds(0)
                cancelRestFinishedNotification()
              }}
            >
              <Text style={styles.restSkipText}>SALTAR</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Add Exercise Modal */}
      <AddExerciseModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSelectExercise={handleAddExerciseToSession}
        onAddExercises={handleAddExercisesToSession}
        onOpenInfo={(ex) => setDetailModalExercise(ex)}
      />

      {/* Exercise Detail Modal */}
      <ExerciseDetailModal
        exercise={detailModalExercise}
        visible={!!detailModalExercise}
        onClose={() => setDetailModalExercise(null)}
      />

      {/* Pain Adaptor Live Modal */}
      <PainAdaptorModal
        visible={showPainModal}
        onClose={() => setShowPainModal(false)}
        currentExerciseName={currentExercise.name}
        onApplyReplacement={handleApplyPainReplacement}
      />

      {/* Hands-Free Voice Logger Modal */}
      <VoiceSetLoggerModal
        visible={showVoiceModal}
        onClose={() => setShowVoiceModal(false)}
        currentExerciseName={currentExercise.name}
        nextSetNumber={
          activeSessionExercise?.sets.find((s) => !s.completed)?.setNum ||
          (activeSessionExercise?.sets.length || 0) + 1
        }
        onLogVoiceSet={handleLogVoiceSet}
      />

      {/* Live Chronometer Edit Modal */}
      <Modal
        visible={showEditDurationModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowEditDurationModal(false)}
      >
        <View style={styles.finishOverlay}>
          <View style={[styles.finishCard, { maxWidth: 360 }]}>
            <Text style={styles.finishTitle}>⏱️ Ajustar Cronómetro</Text>
            <Text style={styles.finishSubtitle}>
              Modifica los minutos transcurridos de tu entrenamiento.
            </Text>

            <View style={styles.editDurationInputRow}>
              <TouchableOpacity
                onPress={() => {
                  const curr = parseInt(manualDurationInput, 10) || 1
                  setManualDurationInput(String(Math.max(1, curr - 5)))
                }}
                style={styles.durationStepBtn}
              >
                <Text style={styles.durationStepBtnText}>-5 min</Text>
              </TouchableOpacity>

              <TextInput
                style={styles.editDurationTextInput}
                value={manualDurationInput}
                onChangeText={setManualDurationInput}
                keyboardType="number-pad"
                selectTextOnFocus
              />

              <TouchableOpacity
                onPress={() => {
                  const curr = parseInt(manualDurationInput, 10) || 1
                  setManualDurationInput(String(curr + 5))
                }}
                style={styles.durationStepBtn}
              >
                <Text style={styles.durationStepBtnText}>+5 min</Text>
              </TouchableOpacity>
            </View>

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowEditDurationModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalConfirmBtn}
                onPress={() => {
                  const parsed = parseInt(manualDurationInput, 10) || 1
                  const newSecs = parsed * 60
                  setElapsedSeconds(newSecs)
                  startTimeRef.current = Date.now() - newSecs * 1000
                  setShowEditDurationModal(false)
                }}
              >
                <Text style={styles.modalConfirmText}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Discard Workout Modal ── */}
      <Modal
        visible={showDiscardModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDiscardModal(false)}
      >
        <View style={styles.finishOverlay}>
          <View style={[styles.finishCard, { maxWidth: 360 }]}>
            <View style={styles.discardIconCircle}>
              <Ionicons name="alert-circle-outline" size={36} color="#EF4444" />
            </View>
            <Text style={styles.finishTitle}>¿Descartar entrenamiento?</Text>
            <Text style={styles.finishSubtitle}>
              Se cancelará la sesión actual y no se guardará ningún registro en tu historial.
            </Text>

            <View style={{ width: '100%', gap: 10, marginTop: 18 }}>
              <TouchableOpacity
                style={styles.discardConfirmBtn}
                onPress={handleConfirmDiscard}
                activeOpacity={0.85}
              >
                <Text style={styles.discardConfirmBtnText}>DESCARTAR Y SALIR</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.discardCancelBtn}
                onPress={() => setShowDiscardModal(false)}
                activeOpacity={0.85}
              >
                <Text style={styles.discardCancelBtnText}>Continuar entrenando</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Finish Session Modal */}
      <Modal
        visible={showFinishModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowFinishModal(false)}
      >
        <View style={styles.finishOverlay}>
          <View style={styles.finishCard}>
            <Text style={{ fontSize: 36, textAlign: 'center' }}>🏆</Text>
            <Text style={styles.finishTitle}>¡Entrenamiento Guardado!</Text>
            <Text style={styles.finishRoutineName}>{routineTitle}</Text>

            {/* Editable Duration Row in Finish Modal */}
            <View style={styles.finishDurationEditRow}>
              <Text style={styles.finishDurationLabel}>⏱️ Duración total:</Text>
              <View style={styles.finishDurationControls}>
                <TouchableOpacity
                  onPress={() => {
                    const next = Math.max(1, finishEditedMinutes - 5)
                    setFinishEditedMinutes(next)
                    handleConfirmSaveWorkout(next)
                  }}
                  style={styles.finishMiniStepBtn}
                >
                  <Text style={styles.finishMiniStepText}>-5</Text>
                </TouchableOpacity>
                <Text style={styles.finishDurationValText}>{finishEditedMinutes} min</Text>
                <TouchableOpacity
                  onPress={() => {
                    const next = finishEditedMinutes + 5
                    setFinishEditedMinutes(next)
                    handleConfirmSaveWorkout(next)
                  }}
                  style={styles.finishMiniStepBtn}
                >
                  <Text style={styles.finishMiniStepText}>+5</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.finishStatsGrid}>
              <View style={styles.finishStatBox}>
                <Text style={styles.finishStatVal}>
                  {finishStats.completedSetsCount || exercises.reduce((s, e) => s + e.sets.length, 0)}
                </Text>
                <Text style={styles.finishStatLabel}>Series</Text>
              </View>

              <View style={styles.finishStatBox}>
                <Text style={styles.finishStatVal}>
                  {finishStats.totalVolumeKg >= 1000
                    ? `${(finishStats.totalVolumeKg / 1000).toFixed(1)}t`
                    : `${finishStats.totalVolumeKg}kg`}
                </Text>
                <Text style={styles.finishStatLabel}>Volumen</Text>
              </View>

              <View style={styles.finishStatBox}>
                <Text style={styles.finishStatVal}>
                  🥇 {finishStats.recordsCount}
                </Text>
                <Text style={styles.finishStatLabel}>Récords PR</Text>
              </View>
            </View>

            {/* AI Performance & Progressive Overload Card */}
            <View style={styles.finishAiPerformanceCard}>
              <View style={styles.finishAiHeaderRow}>
                <View style={styles.finishAiBadge}>
                  <Text style={{ fontSize: 13 }}>⚡</Text>
                  <Text style={styles.finishAiBadgeText}>ANÁLISIS DE RENDIMIENTO IA</Text>
                </View>
                <Text style={styles.finishAiCaloriesText}>🔥 {finishStats.caloriesBurned} kcal</Text>
              </View>

              <View style={styles.finishOverloadRow}>
                <Text style={styles.finishOverloadTitle}>
                  {finishStats.volumePctChange > 0
                    ? `🔥 +${finishStats.volumePctChange}% de Sobrecarga Progresiva`
                    : finishStats.previousVolumeKg === 0
                    ? '🚀 Primera Sesión Registrada'
                    : '⚡ Volumen Efectivo Consolidado'}
                </Text>
                <Text style={styles.finishOverloadSub}>
                  {finishStats.volumePctChange > 0
                    ? `Superaste en ${finishStats.volumeDiff} kg el tonelaje de tu sesión previa (${finishStats.previousVolumeKg} kg → ${finishStats.totalVolumeKg} kg).`
                    : finishStats.previousVolumeKg === 0
                    ? `Estableciste una base sólida de ${finishStats.totalVolumeKg} kg de tonelaje para tus futuras progresiones.`
                    : `Completaste ${finishStats.totalVolumeKg} kg de tonelaje total con alta calidad técnica y estímulo mecánico.`}
                </Text>
              </View>

              <View style={styles.finishAiMetaRow}>
                <Text style={styles.finishAiMetaText}>
                  Gasto calórico calculado para tus <Text style={{ color: '#38BDF8', fontWeight: '700' }}>{finishStats.userWeight} kg</Text> de peso corporal.
                </Text>
              </View>
            </View>

            {/* Share Workout Button */}
            <TouchableOpacity
              style={styles.finishShareBtn}
              onPress={handleShareWorkoutSession}
              activeOpacity={0.85}
            >
              <Ionicons name="share-social-outline" size={18} color="#38BDF8" />
              <Text style={styles.finishShareBtnText}>COMPARTIR ENTRENAMIENTO</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.finishSaveBtn}
              onPress={() => {
                setShowFinishModal(false)
                router.replace('/(tabs)/profile')
              }}
              activeOpacity={0.9}
            >
              {saving ? (
                <ActivityIndicator color="#09090B" />
              ) : (
                <Text style={styles.finishSaveBtnText}>VER EN MI PERFIL</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#09090B',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    backgroundColor: '#09090B',
  },
  discardTopBtn: {
    backgroundColor: '#18181B',
    borderWidth: 1,
    borderColor: '#27272A',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 9999,
  },
  discardTopText: {
    color: '#A1A1AA',
    fontSize: 12,
    fontWeight: '700',
  },
  discardIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  discardConfirmBtn: {
    backgroundColor: '#EF4444',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  discardConfirmBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1,
  },
  discardCancelBtn: {
    backgroundColor: '#27272A',
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  discardCancelBtnText: {
    color: '#FAFAFA',
    fontSize: 13,
    fontWeight: '700',
  },
  iconBtn: {
    padding: 6,
  },
  liveTimerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#18181B',
    borderWidth: 1,
    borderColor: '#27272A',
    borderRadius: 9999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  liveTimerText: {
    color: '#FAFAFA',
    fontSize: 13,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  timerDivider: {
    color: '#52525B',
    fontSize: 13,
    fontWeight: '700',
  },
  innerRestToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  restToggleText: {
    color: '#38BDF8',
    fontSize: 12,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  finishTopBtn: {
    backgroundColor: '#FAFAFA',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  finishBtnText: {
    color: '#09090B',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.2,
  },
  scrollContent: {
    paddingBottom: 110,
  },
  illustrationSection: {
    position: 'relative',
    backgroundColor: '#09090B',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  techniqueBtn: {
    position: 'absolute',
    top: 12,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(24, 24, 27, 0.85)',
    borderWidth: 1,
    borderColor: '#27272A',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 5,
  },
  techniqueBtnText: {
    color: '#FAFAFA',
    fontSize: 12,
    fontWeight: '700',
  },
  carouselContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  thumbWrapper: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    backgroundColor: '#18181B',
  },
  thumbWrapperActive: {},
  activeRingOverlay: {
    position: 'absolute',
    top: -2,
    left: -2,
  },
  completedCheckBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 17,
    height: 17,
    borderRadius: 9,
    backgroundColor: '#FAFAFA',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#09090B',
  },
  addExerciseDashedBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#27272A',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#18181B',
  },
  exerciseHeaderCard: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 12,
    gap: 10,
  },
  exerciseTitleTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  exerciseHeaderTitle: {
    color: '#FAFAFA',
    fontSize: 20,
    fontWeight: '800',
    flex: 1,
    lineHeight: 25,
    letterSpacing: -0.3,
  },
  exerciseActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  voiceLoggerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#18181B',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.25)',
  },
  voiceLoggerBtnText: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '700',
  },
  painAdaptorBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#18181B',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.25)',
  },
  painAdaptorBtnText: {
    color: '#F59E0B',
    fontSize: 11,
    fontWeight: '700',
  },
  infoPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#18181B',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#27272A',
  },
  infoPillBtnText: {
    color: '#A1A1AA',
    fontSize: 11,
    fontWeight: '700',
  },
  /* ── AI Suggestion Chip / Card ── */
  aiSuggestionCard: {
    backgroundColor: '#18181B',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.35)',
    gap: 8,
    marginTop: 4,
  },
  aiSuggestionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  aiSuggestionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(124, 58, 237, 0.15)',
  },
  aiSparkleIcon: {
    fontSize: 11,
  },
  aiSuggestionBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#DDD6FE',
    letterSpacing: 0.4,
  },
  aiSuggestionMessage: {
    color: '#E4E4E7',
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 18,
  },
  aiApplyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FAFAFA',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  aiApplyBtnText: {
    color: '#09090B',
    fontSize: 12,
    fontWeight: '800',
  },
  /* ── Sets Table Styles (Clean layout with zero overlap) ── */
  tableContainer: {
    paddingHorizontal: 16,
    marginTop: 4,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    gap: 6,
  },
  thSet: {
    width: 32,
    color: '#71717A',
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  thAnterior: {
    flex: 1,
    color: '#71717A',
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  thKg: {
    width: 62,
    color: '#71717A',
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  thReps: {
    width: 62,
    color: '#71717A',
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  thCheck: {
    width: 36,
    color: '#71717A',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  thDelete: {
    width: 20,
  },
  tableBody: {
    gap: 6,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    gap: 6,
  },
  tableRowCompleted: {
    opacity: 0.9,
  },
  serieNumBox: {
    width: 32,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeNormal: {
    backgroundColor: '#27272A',
  },
  badgeWarmup: {
    backgroundColor: 'rgba(245, 158, 11, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.35)',
  },
  badgeDropset: {
    backgroundColor: 'rgba(168, 85, 247, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.35)',
  },
  badgeFailure: {
    backgroundColor: 'rgba(239, 68, 68, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.35)',
  },
  serieNumText: {
    fontSize: 13,
    fontWeight: '800',
  },
  badgeTextNormal: {
    color: '#FAFAFA',
  },
  badgeTextWarmup: {
    color: '#F59E0B',
  },
  badgeTextDropset: {
    color: '#A855F7',
  },
  badgeTextFailure: {
    color: '#EF4444',
  },
  previaText: {
    flex: 1,
    color: '#71717A',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  inputContainer: {
    width: 62,
    height: 36,
    backgroundColor: '#18181B',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#27272A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputContainerCompleted: {
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderColor: 'rgba(16, 185, 129, 0.35)',
  },
  tableInput: {
    color: '#FAFAFA',
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
    paddingVertical: 2,
    paddingHorizontal: 2,
    width: '100%',
    fontVariant: ['tabular-nums'],
  },
  tableInputCompleted: {
    color: '#10B981',
  },
  checkCircleBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#27272A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkCircleBtnCompleted: {
    backgroundColor: '#10B981',
  },
  deleteSetMiniBtn: {
    width: 20,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addSerieBtn: {
    backgroundColor: '#18181B',
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 14,
    paddingVertical: 13,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#27272A',
  },
  addSerieBtnText: {
    color: '#FAFAFA',
    fontSize: 13,
    fontWeight: '800',
  },
  restFloatingBar: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
    backgroundColor: '#18181B',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#27272A',
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8,
  },
  restBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  restTimeText: {
    color: '#38BDF8',
    fontSize: 18,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  restLabelText: {
    color: '#71717A',
    fontSize: 12,
    fontWeight: '600',
  },
  restBarActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  restAdjustBtn: {
    backgroundColor: '#27272A',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  restAdjustText: {
    color: '#FAFAFA',
    fontSize: 12,
    fontWeight: '700',
  },
  restSkipBtn: {
    backgroundColor: '#38BDF8',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  restSkipText: {
    color: '#09090B',
    fontSize: 12,
    fontWeight: '900',
  },
  finishOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.88)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  finishCard: {
    width: '100%',
    backgroundColor: '#18181B',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#27272A',
    gap: 10,
  },
  finishTitle: {
    color: '#FAFAFA',
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
  },
  finishRoutineName: {
    color: '#38BDF8',
    fontSize: 16,
    fontWeight: '800',
  },
  finishSubtitle: {
    color: '#A1A1AA',
    fontSize: 13,
    textAlign: 'center',
  },
  finishStatsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginVertical: 10,
  },
  finishStatBox: {
    flex: 1,
    backgroundColor: '#27272A',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  finishStatVal: {
    color: '#38BDF8',
    fontSize: 18,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  finishStatLabel: {
    color: '#A1A1AA',
    fontSize: 11,
    marginTop: 2,
    fontWeight: '600',
  },
  finishSaveBtn: {
    width: '100%',
    backgroundColor: '#FAFAFA',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  finishSaveBtnText: {
    color: '#09090B',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1,
  },
  editDurationInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginVertical: 14,
  },
  durationStepBtn: {
    backgroundColor: '#27272A',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
  },
  durationStepBtnText: {
    color: '#38BDF8',
    fontSize: 13,
    fontWeight: '700',
  },
  editDurationTextInput: {
    flex: 1,
    backgroundColor: '#09090B',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#27272A',
    color: '#FAFAFA',
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    paddingVertical: 8,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#27272A',
    alignItems: 'center',
  },
  modalCancelText: {
    color: '#A1A1AA',
    fontSize: 14,
    fontWeight: '700',
  },
  modalConfirmBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#FAFAFA',
    alignItems: 'center',
  },
  modalConfirmText: {
    color: '#09090B',
    fontSize: 14,
    fontWeight: '800',
  },
  finishDurationEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    backgroundColor: '#27272A',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    marginTop: 4,
  },
  finishDurationLabel: {
    color: '#A1A1AA',
    fontSize: 13,
    fontWeight: '600',
  },
  finishDurationControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  finishMiniStepBtn: {
    backgroundColor: '#18181B',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  finishMiniStepText: {
    color: '#38BDF8',
    fontSize: 12,
    fontWeight: '800',
  },
  finishDurationValText: {
    color: '#FAFAFA',
    fontSize: 14,
    fontWeight: '800',
  },
  finishShareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
    borderRadius: 14,
    paddingVertical: 12,
    marginTop: 6,
  },
  finishShareBtnText: {
    color: '#38BDF8',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  /* ── Finish Modal AI Performance Card ── */
  finishAiPerformanceCard: {
    width: '100%',
    backgroundColor: '#27272A',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.3)',
    gap: 8,
    marginTop: 6,
  },
  finishAiHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  finishAiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(124, 58, 237, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  finishAiBadgeText: {
    color: '#DDD6FE',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  finishAiCaloriesText: {
    color: '#F97316',
    fontSize: 12,
    fontWeight: '800',
  },
  finishOverloadRow: {
    gap: 3,
  },
  finishOverloadTitle: {
    color: '#FAFAFA',
    fontSize: 13,
    fontWeight: '800',
  },
  finishOverloadSub: {
    color: '#A1A1AA',
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '500',
  },
  finishAiMetaRow: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    paddingTop: 6,
  },
  finishAiMetaText: {
    color: '#71717A',
    fontSize: 10,
    fontWeight: '500',
  },
})
