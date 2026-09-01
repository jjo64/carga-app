import { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
  Platform,
} from 'react-native'
import { useLocalSearchParams, useRouter, Stack } from 'expo-router'
import { useRoutines } from '@/lib/hooks/useWorkout'
import { theme } from '@/constants/theme'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/hooks/useAuth'

export default function RoutineDetailScreen() {
  const { routineId } = useLocalSearchParams<{ routineId: string }>()
  const router = useRouter()
  const { user } = useAuth()
  const { routines, addExerciseToRoutine, deleteExercise, refetch } = useRoutines()

  const routine = routines.find((r) => r.id === routineId)

  // Estado para modal de añadir ejercicio
  const [modalVisible, setModalVisible] = useState(false)
  const [name, setName] = useState('')
  const [sets, setSets] = useState('3')
  const [reps, setReps] = useState('8-10')
  const [restSeconds, setRestSeconds] = useState('90')
  const [notes, setNotes] = useState('')
  const [adding, setAdding] = useState(false)
  const [starting, setStarting] = useState(false)

  async function handleAddExercise() {
    if (!name.trim() || !routineId) return

    setAdding(true)
    const { error } = await addExerciseToRoutine(routineId, {
      name: name.trim(),
      target_sets: parseInt(sets, 10) || 3,
      target_reps: reps.trim() || '8-10',
      rest_seconds: parseInt(restSeconds, 10) || 90,
      notes: notes.trim() || undefined,
    })
    setAdding(false)

    if (!error) {
      setName('')
      setNotes('')
      setModalVisible(false)
    }
  }

  async function handleStartWorkout() {
    if (!user || !routineId) return

    setStarting(true)
    const today = new Date().toISOString().split('T')[0]

    const { data, error } = await supabase
      .from('workout_sessions')
      .insert({
        user_id: user.id,
        routine_id: routineId,
        date: today,
        started_at: new Date().toISOString(),
      })
      .select()
      .single()

    setStarting(false)

    if (!error && data) {
      router.push(`/workout/session/${data.id}`)
    } else {
      Alert.alert('Error', 'No se pudo iniciar la sesión de entrenamiento.')
    }
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerTitle: routine?.name || 'Detalle de Rutina',
          headerBackTitle: 'Rutinas',
        }}
      />

      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.content}>
          {/* Header de la Rutina */}
          <View style={styles.heroCard}>
            <Text style={styles.routineTitle}>{routine?.name || 'Cargando...'}</Text>
            {routine?.description && (
              <Text style={styles.routineDescription}>{routine.description}</Text>
            )}
            <View style={styles.badgeRow}>
              <View style={styles.badge}>
                <Ionicons name="barbell-outline" size={14} color={theme.colors.primary} />
                <Text style={styles.badgeText}>
                  {routine?.exercises?.length || 0} ejercicios
                </Text>
              </View>
            </View>
          </View>

          {/* Lista de Ejercicios */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Ejercicios de la Rutina</Text>
            <TouchableOpacity
              style={styles.addExerciseBtn}
              onPress={() => setModalVisible(true)}
            >
              <Ionicons name="add" size={18} color="#000" />
              <Text style={styles.addExerciseBtnText}>Añadir Ejercicio</Text>
            </TouchableOpacity>
          </View>

          {routine?.exercises?.length === 0 ? (
            <View style={styles.emptyExercises}>
              <Ionicons name="fitness-outline" size={36} color={theme.colors.textMuted} />
              <Text style={styles.emptyExTitle}>Sin ejercicios todavía</Text>
              <Text style={styles.emptyExSub}>
                Añade los ejercicios que componen este entrenamiento (ej: Press banca, Sentadilla, Dominadas).
              </Text>
            </View>
          ) : (
            <View style={styles.exerciseList}>
              {routine?.exercises?.map((exercise, index) => (
                <View key={exercise.id} style={styles.exerciseCard}>
                  <View style={styles.exerciseIndexBadge}>
                    <Text style={styles.exerciseIndexText}>{index + 1}</Text>
                  </View>

                  <View style={styles.exerciseDetails}>
                    <Text style={styles.exerciseName}>{exercise.name}</Text>
                    <Text style={styles.exerciseMeta}>
                      {exercise.target_sets} series × {exercise.target_reps} reps ·{' '}
                      {exercise.rest_seconds}s descanso
                    </Text>
                    {exercise.notes && (
                      <Text style={styles.exerciseNotes}>💬 {exercise.notes}</Text>
                    )}
                  </View>

                  <TouchableOpacity
                    onPress={() => deleteExercise(exercise.id)}
                    style={styles.deleteExBtn}
                  >
                    <Ionicons
                      name="trash-outline"
                      size={18}
                      color={theme.colors.textMuted}
                    />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </ScrollView>

        {/* Footer flotante para Iniciar Sesión */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[
              styles.startWorkoutButton,
              (routine?.exercises?.length === 0 || starting) &&
                styles.startWorkoutButtonDisabled,
            ]}
            onPress={handleStartWorkout}
            disabled={routine?.exercises?.length === 0 || starting}
          >
            {starting ? (
              <ActivityIndicator color="#000" />
            ) : (
              <>
                <Ionicons name="play" size={20} color="#000" />
                <Text style={styles.startWorkoutButtonText}>
                  COMENZAR ENTRENAMIENTO
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Modal para Añadir Ejercicio */}
        <Modal
          visible={modalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Añadir Ejercicio</Text>
                <TouchableOpacity
                  onPress={() => setModalVisible(false)}
                  style={styles.modalCloseBtn}
                >
                  <Ionicons name="close" size={22} color={theme.colors.textMuted} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalScroll}>
                <View style={styles.modalForm}>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Nombre del Ejercicio *</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="Ej: Press Banca con Barra"
                      placeholderTextColor={theme.colors.textMuted}
                      value={name}
                      onChangeText={setName}
                      autoFocus
                    />
                  </View>

                  <View style={styles.formRow}>
                    <View style={[styles.inputGroup, { flex: 1 }]}>
                      <Text style={styles.inputLabel}>Series Objetivo</Text>
                      <TextInput
                        style={styles.textInput}
                        placeholder="3"
                        placeholderTextColor={theme.colors.textMuted}
                        value={sets}
                        onChangeText={setSets}
                        keyboardType="number-pad"
                      />
                    </View>

                    <View style={[styles.inputGroup, { flex: 1 }]}>
                      <Text style={styles.inputLabel}>Reps Objetivo</Text>
                      <TextInput
                        style={styles.textInput}
                        placeholder="8-10"
                        placeholderTextColor={theme.colors.textMuted}
                        value={reps}
                        onChangeText={setReps}
                      />
                    </View>

                    <View style={[styles.inputGroup, { flex: 1 }]}>
                      <Text style={styles.inputLabel}>Descanso (s)</Text>
                      <TextInput
                        style={styles.textInput}
                        placeholder="90"
                        placeholderTextColor={theme.colors.textMuted}
                        value={restSeconds}
                        onChangeText={setRestSeconds}
                        keyboardType="number-pad"
                      />
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Notas de Técnica (Opcional)</Text>
                    <TextInput
                      style={[styles.textInput, styles.textArea]}
                      placeholder="Ej: Retracción escapular, pausa de 1s en el pecho"
                      placeholderTextColor={theme.colors.textMuted}
                      value={notes}
                      onChangeText={setNotes}
                      multiline
                      numberOfLines={2}
                    />
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.modalSubmitBtn,
                      (!name.trim() || adding) && styles.modalSubmitBtnDisabled,
                    ]}
                    onPress={handleAddExercise}
                    disabled={!name.trim() || adding}
                  >
                    {adding ? (
                      <ActivityIndicator color="#000" />
                    ) : (
                      <Text style={styles.modalSubmitBtnText}>Guardar Ejercicio</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>
      </View>
    </>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    padding: theme.spacing.md,
    gap: theme.spacing.lg,
    paddingBottom: 100,
  },
  heroCard: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: theme.spacing.xs,
  },
  routineTitle: {
    color: theme.colors.text,
    fontSize: 22,
    fontWeight: 'bold',
  },
  routineDescription: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    lineHeight: 18,
    marginTop: 2,
  },
  badgeRow: {
    flexDirection: 'row',
    marginTop: theme.spacing.xs,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primaryMuted,
    borderRadius: theme.borderRadius.sm,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  badgeText: {
    color: theme.colors.primary,
    fontSize: 12,
    fontWeight: 'bold',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    color: theme.colors.text,
    fontSize: 17,
    fontWeight: 'bold',
  },
  addExerciseBtn: {
    backgroundColor: theme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.sm,
    gap: 4,
  },
  addExerciseBtnText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 13,
  },
  emptyExercises: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: theme.spacing.sm,
  },
  emptyExTitle: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 4,
  },
  emptyExSub: {
    color: theme.colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  exerciseList: {
    gap: theme.spacing.sm,
  },
  exerciseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: theme.spacing.md,
  },
  exerciseIndexBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  exerciseIndexText: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: 'bold',
  },
  exerciseDetails: {
    flex: 1,
    gap: 2,
  },
  exerciseName: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: 'bold',
  },
  exerciseMeta: {
    color: theme.colors.textMuted,
    fontSize: 12,
  },
  exerciseNotes: {
    color: theme.colors.textSecondary,
    fontSize: 11,
    fontStyle: 'italic',
    marginTop: 2,
  },
  deleteExBtn: {
    padding: 6,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: theme.colors.background,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    padding: theme.spacing.md,
  },
  startWorkoutButton: {
    backgroundColor: theme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: theme.borderRadius.md,
    gap: 8,
  },
  startWorkoutButtonDisabled: {
    opacity: 0.5,
  },
  startWorkoutButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.md,
  },
  modalContent: {
    width: '100%',
    maxWidth: 500,
    maxHeight: '90%',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalScroll: {
    flexGrow: 0,
  },
  modalForm: {
    gap: theme.spacing.md,
  },
  formRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  textInput: {
    backgroundColor: theme.colors.surfaceSubtle,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    color: theme.colors.text,
    fontSize: 15,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
  },
  textArea: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  modalSubmitBtn: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: theme.spacing.sm,
  },
  modalSubmitBtnDisabled: {
    opacity: 0.6,
  },
  modalSubmitBtnText: {
    color: '#000',
    fontSize: 15,
    fontWeight: 'bold',
  },
})
