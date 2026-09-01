import { useState, useEffect, useRef } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native'
import { useLocalSearchParams, useRouter, Stack } from 'expo-router'
import { useActiveSession } from '@/lib/hooks/useWorkout'
import { ExerciseSet } from '@/components/workout/ExerciseSet'
import { RestTimer } from '@/components/workout/RestTimer'
import { theme } from '@/constants/theme'
import { Ionicons } from '@expo/vector-icons'
import { RoutineExercise } from '@/types'

export default function ActiveSessionScreen() {
  const { id: sessionId } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const {
    session,
    routine,
    sets,
    previousSets,
    loading,
    logSet,
    finishSession,
  } = useActiveSession(sessionId)

  // Cronómetro de sesión
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // Temporizador de descanso
  const [activeRestSeconds, setActiveRestSeconds] = useState<number | null>(null)
  const [finishing, setFinishing] = useState(false)

  // Estado local para número de series por ejercicio
  const [exerciseSetCounts, setExerciseSetCounts] = useState<Record<string, number>>({})

  useEffect(() => {
    if (session?.started_at) {
      const startMs = new Date(session.started_at).getTime()
      const updateElapsed = () => {
        const now = Date.now()
        setElapsedSeconds(Math.max(0, Math.floor((now - startMs) / 1000)))
      }
      updateElapsed()
      timerRef.current = setInterval(updateElapsed, 1000)
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [session?.started_at])

  // Inicializar conteo de series según target_sets
  useEffect(() => {
    if (routine?.exercises) {
      const counts: Record<string, number> = {}
      routine.exercises.forEach((ex) => {
        // Al menos el número objetivo o las que ya están registradas
        const loggedSets = sets.filter(
          (s) => s.exercise_id === ex.id || s.exercise_name === ex.name
        ).length
        counts[ex.id] = Math.max(ex.target_sets || 3, loggedSets)
      })
      setExerciseSetCounts(counts)
    }
  }, [routine?.exercises, sets])

  // Volumen total en vivo
  const liveTotalVolume = sets
    .filter((s) => !s.is_warmup)
    .reduce((acc, s) => acc + s.weight_kg * s.reps, 0)

  const formatTime = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60)
    const secs = totalSec % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  async function handleSetComplete(
    exercise: RoutineExercise,
    setNumber: number,
    data: { weightKg: number; reps: number; isWarmup: boolean; rpe?: number }
  ) {
    await logSet({
      exerciseId: exercise.id,
      exerciseName: exercise.name,
      setNumber,
      weightKg: data.weightKg,
      reps: data.reps,
      isWarmup: data.isWarmup,
      rpe: data.rpe,
    })

    // Disparar timer de descanso
    setActiveRestSeconds(exercise.rest_seconds || 90)
  }

  function handleAddSetToExercise(exerciseId: string) {
    setExerciseSetCounts((prev) => ({
      ...prev,
      [exerciseId]: (prev[exerciseId] || 3) + 1,
    }))
  }

  async function handleFinishWorkout() {
    const confirmAction = async () => {
      setFinishing(true)
      const result = await finishSession()
      setFinishing(false)

      if (!result.error) {
        if (Platform.OS === 'web') {
          alert(
            `¡Entrenamiento completado! 🔥\nDuración: ${result.durationMinutes} min\nVolumen total: ${result.totalVolume} kg\nCalorías estimadas: ${result.estimatedBurn} kcal`
          )
        } else {
          Alert.alert(
            '¡Entrenamiento Completado! 🔥',
            `Duración: ${result.durationMinutes} min\nVolumen total: ${result.totalVolume} kg\nCalorías estimadas: ${result.estimatedBurn} kcal`
          )
        }
        router.replace('/(tabs)/workout')
      } else {
        Alert.alert('Error', 'No se pudo guardar la finalización del entrenamiento.')
      }
    }

    if (Platform.OS === 'web') {
      if (window.confirm('¿Deseas finalizar este entrenamiento?')) {
        await confirmAction()
      }
    } else {
      Alert.alert(
        'Finalizar Entrenamiento',
        '¿Completaste todas las series de hoy?',
        [
          { text: 'Seguir entrenando', style: 'cancel' },
          { text: 'Finalizar', style: 'default', onPress: confirmAction },
        ]
      )
    }
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    )
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerTitle: routine?.name || 'Entrenamiento en Curso',
          headerBackVisible: false,
          headerRight: () => (
            <TouchableOpacity
              onPress={handleFinishWorkout}
              style={styles.headerFinishBtn}
              disabled={finishing}
            >
              <Text style={styles.headerFinishText}>Terminar</Text>
            </TouchableOpacity>
          ),
        }}
      />

      <View style={styles.container}>
        {/* Barra superior de métricas en vivo */}
        <View style={styles.liveBar}>
          <View style={styles.metricWidget}>
            <Ionicons name="time-outline" size={18} color={theme.colors.primary} />
            <Text style={styles.metricWidgetValue}>
              {formatTime(elapsedSeconds)}
            </Text>
            <Text style={styles.metricWidgetLabel}>Tiempo</Text>
          </View>

          <View style={styles.metricDivider} />

          <View style={styles.metricWidget}>
            <Ionicons name="barbell-outline" size={18} color={theme.colors.info} />
            <Text style={styles.metricWidgetValue}>{liveTotalVolume}</Text>
            <Text style={styles.metricWidgetLabel}>Volumen (kg)</Text>
          </View>

          <View style={styles.metricDivider} />

          <View style={styles.metricWidget}>
            <Ionicons name="checkbox-outline" size={18} color={theme.colors.warning} />
            <Text style={styles.metricWidgetValue}>{sets.length}</Text>
            <Text style={styles.metricWidgetLabel}>Series</Text>
          </View>
        </View>

        {/* Rest Timer flotante */}
        {activeRestSeconds !== null && (
          <View style={styles.timerWrapper}>
            <RestTimer
              initialSeconds={activeRestSeconds}
              onClose={() => setActiveRestSeconds(null)}
              onComplete={() => setActiveRestSeconds(null)}
            />
          </View>
        )}

        <ScrollView contentContainerStyle={styles.content}>
          {routine?.exercises?.map((exercise) => {
            const setCount = exerciseSetCounts[exercise.id] || exercise.target_sets || 3
            const prevExerciseSets = previousSets[exercise.id] || previousSets[exercise.name] || {}

            return (
              <View key={exercise.id} style={styles.exerciseBox}>
                <View style={styles.exerciseBoxHeader}>
                  <View style={styles.exerciseHeaderLeft}>
                    <Text style={styles.exerciseName}>{exercise.name}</Text>
                    <Text style={styles.exerciseMeta}>
                      Objetivo: {exercise.target_sets} series × {exercise.target_reps} reps
                    </Text>
                  </View>
                </View>

                {exercise.notes && (
                  <Text style={styles.exerciseNotes}>💬 {exercise.notes}</Text>
                )}

                {/* Series del ejercicio */}
                <View style={styles.setsList}>
                  {Array.from({ length: setCount }).map((_, index) => {
                    const setNum = index + 1
                    const existingSet = sets.find(
                      (s) =>
                        (s.exercise_id === exercise.id ||
                          s.exercise_name === exercise.name) &&
                        s.set_number === setNum
                    )
                    const prevSet = prevExerciseSets[setNum]

                    return (
                      <ExerciseSet
                        key={`${exercise.id}-set-${setNum}`}
                        setNumber={setNum}
                        targetReps={exercise.target_reps}
                        previousSet={prevSet}
                        isCompleted={!!existingSet}
                        initialWeight={existingSet?.weight_kg}
                        initialReps={existingSet?.reps}
                        onComplete={(data) =>
                          handleSetComplete(exercise, setNum, data)
                        }
                      />
                    )
                  })}
                </View>

                {/* Botón para añadir una serie extra */}
                <TouchableOpacity
                  style={styles.addSetButton}
                  onPress={() => handleAddSetToExercise(exercise.id)}
                >
                  <Ionicons
                    name="add"
                    size={16}
                    color={theme.colors.textSecondary}
                  />
                  <Text style={styles.addSetText}>Añadir Serie</Text>
                </TouchableOpacity>
              </View>
            )
          })}
        </ScrollView>

        {/* Botón Finalizar abajo */}
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={styles.finishButton}
            onPress={handleFinishWorkout}
            disabled={finishing}
          >
            {finishing ? (
              <ActivityIndicator color="#000" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={22} color="#000" />
                <Text style={styles.finishButtonText}>
                  FINALIZAR ENTRENAMIENTO
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerFinishBtn: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.sm,
    marginRight: theme.spacing.xs,
  },
  headerFinishText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 13,
  },
  liveBar: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  metricWidget: {
    alignItems: 'center',
    gap: 2,
  },
  metricWidgetValue: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: 'bold',
  },
  metricWidgetLabel: {
    color: theme.colors.textMuted,
    fontSize: 10,
    textTransform: 'uppercase',
  },
  metricDivider: {
    width: 1,
    height: 24,
    backgroundColor: theme.colors.border,
  },
  timerWrapper: {
    paddingHorizontal: theme.spacing.md,
  },
  content: {
    padding: theme.spacing.md,
    gap: theme.spacing.lg,
    paddingBottom: 110,
  },
  exerciseBox: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: theme.spacing.sm,
  },
  exerciseBoxHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  exerciseHeaderLeft: {
    flex: 1,
    gap: 2,
  },
  exerciseName: {
    color: theme.colors.text,
    fontSize: 17,
    fontWeight: 'bold',
  },
  exerciseMeta: {
    color: theme.colors.textMuted,
    fontSize: 12,
  },
  exerciseNotes: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontStyle: 'italic',
  },
  setsList: {
    marginTop: theme.spacing.xs,
  },
  addSetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 4,
    marginTop: 4,
  },
  addSetText: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: theme.colors.background,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    padding: theme.spacing.md,
  },
  finishButton: {
    backgroundColor: theme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: theme.borderRadius.md,
    gap: 8,
  },
  finishButtonText: {
    color: '#000',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 1,
  },
})
