import React, { useState, useEffect, useRef } from 'react'
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
} from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import ExerciseIllustration from '@/components/visuals/ExerciseIllustration'
import AddExerciseModal from '@/components/workout/AddExerciseModal'
import ExerciseDetailModal from '@/components/workout/ExerciseDetailModal'
import PainAdaptorModal from '@/components/workout/PainAdaptorModal'
import VoiceSetLoggerModal from '@/components/workout/VoiceSetLoggerModal'
import { EXERCISE_DATABASE, ExerciseDefinition } from '@/constants/exerciseDatabase'
import { DEFAULT_STARTER_ROUTINES, recordWorkoutSession } from '@/lib/hooks/useWorkout'
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

interface SetRowData {
  id: string
  setNum: number
  previous: string
  weightKg: string
  reps: string
  completed: boolean
}

interface SessionExercise {
  id: string
  exercise: ExerciseDefinition
  sets: SetRowData[]
}

export default function LiveWorkoutSessionScreen() {
  const router = useRouter()
  const params = useLocalSearchParams<{ id: string }>()
  const { user } = useAuth()

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
  const [showAddModal, setShowAddModal] = useState(false)
  const [showPainModal, setShowPainModal] = useState(false)
  const [showVoiceModal, setShowVoiceModal] = useState(false)
  const [detailModalExercise, setDetailModalExercise] = useState<ExerciseDefinition | null>(null)
  const startTimeRef = useRef<number>(Date.now())

  // Calculated finish stats
  const [finishStats, setFinishStats] = useState({
    durationMinutes: 0,
    durationFormatted: '0 min',
    totalVolumeKg: 0,
    recordsCount: 0,
    completedSetsCount: 0,
    caloriesBurned: 0,
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
          const defaultWeight = matchedDb.records?.maxWeight ? String(Math.round(matchedDb.records.maxWeight * 0.75)) : '50'
          const defaultReps = exItem.target_reps.split('-')[0] || '10'

          const initialSets: SetRowData[] = Array.from({ length: setsCount }).map((_, sIdx) => ({
            id: `s-${idx}-${sIdx + 1}`,
            setNum: sIdx + 1,
            previous: `${defaultWeight} kg x ${defaultReps}`,
            weightKg: defaultWeight,
            reps: defaultReps,
            completed: sIdx === 0, // first set ready
          }))

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
            const defaultWeight = '50'
            const defaultReps = (exItem.target_reps || '10').split('-')[0] || '10'

            const initialSets: SetRowData[] = Array.from({ length: setsCount }).map((_, sIdx) => ({
              id: `s-${idx}-${sIdx + 1}`,
              setNum: sIdx + 1,
              previous: `${defaultWeight} kg x ${defaultReps}`,
              weightKg: defaultWeight,
              reps: defaultReps,
              completed: false,
            }))

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
      setExercises([
        {
          id: 'ex-1',
          exercise: EXERCISE_DATABASE[0],
          sets: [
            { id: 's1', setNum: 1, previous: '62.5 kg x 12', weightKg: '62.5', reps: '12', completed: true },
            { id: 's2', setNum: 2, previous: '62.5 kg x 12', weightKg: '62.5', reps: '12', completed: false },
            { id: 's3', setNum: 3, previous: '62.5 kg x 12', weightKg: '62.5', reps: '12', completed: false },
          ],
        },
        {
          id: 'ex-2',
          exercise: EXERCISE_DATABASE[1],
          sets: [
            { id: 's1', setNum: 1, previous: '30 kg x 10', weightKg: '32', reps: '10', completed: false },
            { id: 's2', setNum: 2, previous: '30 kg x 10', weightKg: '32', reps: '10', completed: false },
            { id: 's3', setNum: 3, previous: '30 kg x 8', weightKg: '34', reps: '8', completed: false },
          ],
        },
      ])
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
    }, 1000)

    return () => clearInterval(timer)
  }, [params.id])

  const activeSessionExercise = exercises[activeExerciseIndex] || exercises[0]
  const currentExercise = activeSessionExercise?.exercise || EXERCISE_DATABASE[0]

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
        setExercises((prev) => {
          let completedAny = false
          return prev.map((ex, exIdx) => {
            if (exIdx !== activeExerciseIndex) return ex
            return {
              ...ex,
              sets: ex.sets.map((st) => {
                if (!completedAny && !st.completed) {
                  completedAny = true
                  if (restTimerEnabled && defaultRestSeconds > 0) {
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
              }),
            }
          })
        })
      } else if (actionId === NOTIFICATION_ACTIONS.REST_PLUS_30) {
        setRestSeconds((s) => s + 30)
      } else if (actionId === NOTIFICATION_ACTIONS.SKIP_REST) {
        setIsResting(false)
        cancelRestFinishedNotification()
      }
    })

    return () => subscription.remove()
  }, [activeExerciseIndex, currentExercise, defaultRestSeconds, restTimerEnabled])

  // Sync active notification with current exercise, sets progress & elapsed chronometer
  useEffect(() => {
    const activeEx = exercises[activeExerciseIndex] || exercises[0]
    if (!activeEx) return

    const currentSetData = activeEx.sets.find((s) => !s.completed) || activeEx.sets[activeEx.sets.length - 1]
    const currentSetNum = currentSetData ? currentSetData.setNum : 1

    updateWorkoutActiveNotification({
      routineName: routineTitle,
      exerciseName: activeEx.exercise.name,
      currentSet: currentSetNum,
      totalSets: activeEx.sets.length,
      targetWeight: currentSetData?.weightKg || '0',
      targetReps: currentSetData?.reps || '10',
      durationFormatted: formatChronometer(elapsedSeconds),
      isResting,
      restSecondsLeft: restSeconds,
    })
  }, [exercises, activeExerciseIndex, elapsedSeconds, isResting, restSeconds, routineTitle])

  // Rest countdown timer
  useEffect(() => {
    let restTimer: ReturnType<typeof setInterval>
    if (isResting && restSeconds > 0) {
      restTimer = setInterval(() => {
        setRestSeconds((s) => {
          if (s <= 1) {
            setIsResting(false)
            return 0
          }
          return s - 1
        })
      }, 1000)
    }
    return () => clearInterval(restTimer)
  }, [isResting, restSeconds])

  const toggleSetComplete = (setId: string) => {
    setExercises((prev) =>
      prev.map((ex, exIdx) => {
        if (exIdx !== activeExerciseIndex) return ex
        return {
          ...ex,
          sets: ex.sets.map((st) => {
            if (st.id === setId) {
              const nextState = !st.completed
              if (nextState && restTimerEnabled && defaultRestSeconds > 0) {
                // Trigger rest timer with configured seconds & schedule notification
                setRestSeconds(defaultRestSeconds)
                setIsResting(true)
                scheduleRestFinishedNotification(
                  currentExercise.name,
                  st.setNum + 1,
                  defaultRestSeconds
                )
              }
              return { ...st, completed: nextState }
            }
            return st
          }),
        }
      })
    )
  }

  const addSet = () => {
    setExercises((prev) =>
      prev.map((ex, exIdx) => {
        if (exIdx !== activeExerciseIndex) return ex
        const last = ex.sets[ex.sets.length - 1]
        const newSet: SetRowData = {
          id: `s-${Date.now()}`,
          setNum: ex.sets.length + 1,
          previous: last ? `${last.weightKg} kg x ${last.reps}` : '60 kg x 10',
          weightKg: last?.weightKg || '60',
          reps: last?.reps || '10',
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
    setExercises((prev) => [
      ...prev,
      {
        id: `sess-ex-${Date.now()}`,
        exercise: newEx,
        sets: [
          { id: `s1-${Date.now()}`, setNum: 1, previous: '0 kg x 0', weightKg: '40', reps: '10', completed: false },
          { id: `s2-${Date.now()}`, setNum: 2, previous: '0 kg x 0', weightKg: '40', reps: '10', completed: false },
          { id: `s3-${Date.now()}`, setNum: 3, previous: '0 kg x 0', weightKg: '40', reps: '10', completed: false },
        ],
      },
    ])
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
        const remainingSets: SetRowData[] = Array.from({ length: sets || 3 }).map((_, sIdx) => ({
          id: `s-pain-${Date.now()}-${sIdx + 1}`,
          setNum: sIdx + 1,
          previous: `Variante Segura (${reps} reps)`,
          weightKg: '20',
          reps: reps.split('-')[0] || '10',
          completed: false,
        }))
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
          previous: `${data.weightKg} kg x ${data.reps}`,
          weightKg: String(data.weightKg),
          reps: String(data.reps),
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

  // Calculate real metrics and finish workout
  const handleInitiateFinish = async () => {
    const durationMins = Math.max(1, Math.round(elapsedSeconds / 60))
    setFinishEditedMinutes(durationMins)
    const hours = Math.floor(durationMins / 60)
    const mins = durationMins % 60
    const durationFormatted = hours > 0 ? (mins > 0 ? `${hours}h ${mins}min` : `${hours}h`) : `${mins} min`

    // Calculate real volume from completed sets (or all if user finished)
    let totalVol = 0
    let completedCount = 0
    let recordsAchieved = 0

    const exerciseDataForSave = exercises.map((ex) => {
      const setsData = ex.sets.map((s) => {
        const w = parseFloat(s.weightKg.replace(',', '.')) || 0
        const r = parseInt(s.reps, 10) || 0
        const isDone = s.completed || true
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

    const estimatedCalories = Math.round(
      5.0 * 75 * (durationMins / 60) + (totalVol / 100) * 0.1
    )

    setFinishStats({
      durationMinutes: durationMins,
      durationFormatted,
      totalVolumeKg: Math.round(totalVol * 10) / 10,
      recordsCount: recordsAchieved,
      completedSetsCount: completedCount,
      caloriesBurned: estimatedCalories,
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
        const w = parseFloat(s.weightKg.replace(',', '.')) || 0
        const r = parseInt(s.reps, 10) || 0
        const isDone = s.completed || true
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
      {/* ── Top Bar with Live Chronometer & Rest Settings ── */}
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.iconBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-down" size={26} color="#FFFFFF" />
        </TouchableOpacity>

        {/* Live Running Stopwatch Chronometer Pill (Tap to Edit Duration) */}
        <TouchableOpacity
          onPress={() => {
            setManualDurationInput(String(Math.max(1, Math.round(elapsedSeconds / 60))))
            setShowEditDurationModal(true)
          }}
          style={styles.liveTimerPill}
          activeOpacity={0.8}
        >
          <View style={styles.timerLiveDot} />
          <Ionicons name="timer-outline" size={15} color="#38BDF8" />
          <Text style={styles.liveTimerText}>{formatChronometer(elapsedSeconds)}</Text>
          <Ionicons name="pencil-outline" size={12} color="rgba(56, 189, 248, 0.7)" style={{ marginLeft: 2 }} />
        </TouchableOpacity>

        {/* Rest Timer Toggle Button */}
        <TouchableOpacity
          onPress={() => {
            setRestTimerEnabled((prev) => !prev)
            if (isResting) setIsResting(false)
          }}
          style={[styles.restTogglePill, !restTimerEnabled && { opacity: 0.45 }]}
          activeOpacity={0.8}
        >
          <Ionicons
            name={restTimerEnabled ? 'hourglass-outline' : 'hourglass'}
            size={14}
            color={restTimerEnabled ? '#38BDF8' : 'rgba(255,255,255,0.4)'}
          />
          <Text style={[styles.restToggleText, !restTimerEnabled && { color: 'rgba(255,255,255,0.4)' }]}>
            {restTimerEnabled ? `${defaultRestSeconds}s` : 'Off'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleInitiateFinish}
          activeOpacity={0.7}
          style={styles.finishTopBtn}
        >
          <Text style={styles.finishBtnText}>Terminar</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Main Exercise High Definition Illustration ── */}
        <View style={styles.illustrationSection}>
          <ExerciseIllustration
            exerciseId={currentExercise.id}
            exerciseName={currentExercise.name}
            imageUrl={currentExercise.imageUrl}
            size={220}
            variant="large-banner"
            highlightColor="#38BDF8"
          />

          {/* Floating Pill: "Ver técnica" */}
          <TouchableOpacity
            style={styles.techniqueBtn}
            onPress={() => setDetailModalExercise(currentExercise)}
            activeOpacity={0.85}
          >
            <Ionicons name="play" size={12} color="#FFFFFF" />
            <Text style={styles.techniqueBtnText}>Ver técnica</Text>
          </TouchableOpacity>
        </View>

        {/* ── Horizontal Swipeable Exercise Thumbnails Carousel ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.carouselContainer}
        >
          {exercises.map((item, idx) => {
            const isActive = idx === activeExerciseIndex
            const isCompleted = item.sets.every((s) => s.completed)

            return (
              <TouchableOpacity
                key={item.id}
                onPress={() => setActiveExerciseIndex(idx)}
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
                    <Svg width="56" height="56" viewBox="0 0 56 56">
                      <Circle
                        cx="28"
                        cy="28"
                        r="26"
                        stroke="#38BDF8"
                        strokeWidth="2.5"
                        fill="none"
                      />
                    </Svg>
                  </View>
                )}

                {isCompleted && (
                  <View style={styles.completedCheckBadge}>
                    <Ionicons name="checkmark" size={12} color="#FFFFFF" />
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
            <Ionicons name="add" size={22} color="rgba(255,255,255,0.4)" />
          </TouchableOpacity>
        </ScrollView>

        {/* ── Exercise Title Header ── */}
        <View style={styles.exerciseHeaderRow}>
          <Text style={styles.exerciseHeaderTitle} numberOfLines={1}>
            {currentExercise.name}
          </Text>

          <View style={styles.exerciseHeaderIcons}>
            <TouchableOpacity
              style={styles.voiceLoggerBtn}
              onPress={() => setShowVoiceModal(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="mic" size={13} color="#38BDF8" />
              <Text style={styles.voiceLoggerBtnText}>Voz</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.painAdaptorBtn}
              onPress={() => setShowPainModal(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="medkit" size={13} color="#F59E0B" />
              <Text style={styles.painAdaptorBtnText}>Molestia</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => {
                setRestSeconds(90)
                setIsResting(true)
              }}
            >
              <Ionicons name="timer-outline" size={20} color="rgba(255,255,255,0.6)" />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Table Header: SERIE | PREVIA | KG | REPES ── */}
        <View style={styles.tableHeaderRow}>
          <Text style={[styles.tableHeadCol, { width: 44 }]}>SERIE</Text>
          <Text style={[styles.tableHeadCol, { flex: 1 }]}>PREVIA</Text>
          <Text style={[styles.tableHeadCol, { width: 68, textAlign: 'center' }]}>KG</Text>
          <Text style={[styles.tableHeadCol, { width: 68, textAlign: 'center' }]}>REPES</Text>
          <View style={{ width: 42 }} />
        </View>

        {/* ── Table Rows ── */}
        <View style={styles.tableBody}>
          {(activeSessionExercise?.sets || []).map((row) => {
            return (
              <View
                key={row.id}
                style={[
                  styles.tableRow,
                  row.completed && styles.tableRowCompleted,
                ]}
              >
                {/* Serie Number */}
                <View style={styles.serieNumBox}>
                  <Text style={styles.serieNumText}>{row.setNum}</Text>
                </View>

                {/* Previa */}
                <Text style={styles.previaText} numberOfLines={1}>
                  {row.previous}
                </Text>

                {/* KG Input Box */}
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.tableInput}
                    value={row.weightKg}
                    onChangeText={(val) => updateSetField(row.id, 'weightKg', val)}
                    keyboardType="decimal-pad"
                    selectTextOnFocus
                  />
                </View>

                {/* Reps Input Box */}
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.tableInput}
                    value={row.reps}
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
                    color={row.completed ? '#FFFFFF' : 'rgba(255,255,255,0.4)'}
                  />
                </TouchableOpacity>
              </View>
            )
          })}
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
            <Ionicons name="timer" size={20} color="#38BDF8" />
            <Text style={styles.restTimeText}>{formatChronometer(restSeconds)}</Text>
            <Text style={styles.restLabelText}>Descanso</Text>
          </View>

          <View style={styles.restBarActions}>
            <TouchableOpacity
              style={styles.restAdjustBtn}
              onPress={() => setRestSeconds((s) => Math.max(0, s - 15))}
            >
              <Text style={styles.restAdjustText}>-15s</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.restAdjustBtn}
              onPress={() => setRestSeconds((s) => s + 15)}
            >
              <Text style={styles.restAdjustText}>+15s</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.restSkipBtn}
              onPress={() => setIsResting(false)}
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
        onOpenInfo={(ex) => setDetailModalExercise(ex)}
      />

      {/* Exercise Detail Modal */}
      <ExerciseDetailModal
        exercise={detailModalExercise}
        visible={!!detailModalExercise}
        onClose={() => setDetailModalExercise(null)}
      />

      {/* Pain Adaptor Live Modal (Modulo 3) */}
      <PainAdaptorModal
        visible={showPainModal}
        onClose={() => setShowPainModal(false)}
        currentExerciseName={currentExercise.name}
        onApplyReplacement={handleApplyPainReplacement}
      />

      {/* Hands-Free Voice Logger Modal (Modulo 4) */}
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

      {/* Finish Session Modal with Editable Duration and Detailed Sharing */}
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
                <ActivityIndicator color="#FFFFFF" />
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
    backgroundColor: '#000000',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 52 : 36,
    paddingBottom: 8,
  },
  iconBtn: {
    padding: 6,
  },
  liveTimerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  timerLiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#38BDF8',
  },
  liveTimerText: {
    color: '#38BDF8',
    fontSize: 14,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  finishTopBtn: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 12,
  },
  finishBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  scrollContent: {
    paddingBottom: 100,
  },
  illustrationSection: {
    position: 'relative',
    backgroundColor: '#050505',
    alignItems: 'center',
    justifyContent: 'center',
  },
  techniqueBtn: {
    position: 'absolute',
    top: 14,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.14)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  techniqueBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  carouselContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  thumbWrapper: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
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
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#000000',
  },
  addExerciseDashedBtn: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.2)',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  exerciseHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  exerciseHeaderTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
    flex: 1,
  },
  exerciseHeaderIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 6,
  },
  tableHeadCol: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  tableBody: {
    gap: 8,
    paddingHorizontal: 16,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#101218',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
    gap: 8,
  },
  tableRowCompleted: {
    backgroundColor: 'rgba(37,99,235,0.18)',
    borderColor: 'rgba(37,99,235,0.4)',
  },
  serieNumBox: {
    width: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  serieNumText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  previaText: {
    flex: 1,
    color: 'rgba(255,255,255,0.4)',
    fontSize: 13,
    fontWeight: '500',
  },
  inputContainer: {
    width: 68,
    backgroundColor: '#161922',
    borderRadius: 10,
    paddingVertical: 4,
    alignItems: 'center',
  },
  tableInput: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
    padding: 4,
  },
  checkCircleBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1E2330',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkCircleBtnCompleted: {
    backgroundColor: '#2563EB',
  },
  addSerieBtn: {
    backgroundColor: '#101218',
    borderRadius: 14,
    marginHorizontal: 16,
    marginTop: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  addSerieBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  restFloatingBar: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
    backgroundColor: '#121622',
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(56,189,248,0.3)',
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
    fontSize: 20,
    fontWeight: '900',
  },
  restLabelText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
  },
  restBarActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  restAdjustBtn: {
    backgroundColor: '#1C2234',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  restAdjustText: {
    color: 'rgba(255,255,255,0.7)',
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
    color: '#080A10',
    fontSize: 12,
    fontWeight: '900',
  },
  finishOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  finishCard: {
    width: '100%',
    backgroundColor: '#12141E',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    gap: 10,
  },
  finishTitle: {
    color: '#FFFFFF',
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
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
    textAlign: 'center',
  },
  finishStatsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginVertical: 10,
  },
  finishStatBox: {
    flex: 1,
    backgroundColor: '#1A1E2C',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  finishStatVal: {
    color: '#38BDF8',
    fontSize: 18,
    fontWeight: '900',
  },
  finishStatLabel: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 11,
    marginTop: 2,
  },
  finishSaveBtn: {
    width: '100%',
    backgroundColor: '#2563EB',
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 8,
  },
  finishSaveBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  restTogglePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#181C28',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  restToggleText: {
    color: '#38BDF8',
    fontSize: 12,
    fontWeight: '700',
  },
  editDurationInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginVertical: 14,
  },
  durationStepBtn: {
    backgroundColor: '#1E2332',
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
    backgroundColor: '#0D0E16',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.4)',
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    paddingVertical: 8,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
  },
  modalCancelText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    fontWeight: '700',
  },
  modalConfirmBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#2563EB',
    alignItems: 'center',
  },
  modalConfirmText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  finishDurationEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    backgroundColor: '#161924',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    marginTop: 4,
  },
  finishDurationLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    fontWeight: '600',
  },
  finishDurationControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  finishMiniStepBtn: {
    backgroundColor: 'rgba(255,255,255,0.08)',
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
    color: '#FFFFFF',
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
  voiceLoggerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#0B2238',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#0284C740',
    marginRight: 4,
  },
  voiceLoggerBtnText: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '800',
  },
  painAdaptorBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#78350F25',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F59E0B40',
    marginRight: 4,
  },
  painAdaptorBtnText: {
    color: '#F59E0B',
    fontSize: 11,
    fontWeight: '800',
  },
})
