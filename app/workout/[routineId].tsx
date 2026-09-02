import React, { useState } from 'react'
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
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/hooks/useAuth'

const muscleGroupColor: Record<string, string> = {
  'Pecho': '#60A5FA',
  'Espalda': '#A78BFA',
  'Hombros': '#93C5FD',
  'Bíceps': '#6EE7B7',
  'Tríceps': '#FCA5A5',
  'Cuádriceps': '#FDE68A',
  'Isquiotibiales': '#5EEAD4',
  'Glúteos': '#F9A8D4',
}

export default function RoutineDetailScreen() {
  const { routineId } = useLocalSearchParams<{ routineId: string }>()
  const router = useRouter()
  const { user } = useAuth()
  const { routines, addExerciseToRoutine, deleteExercise, refetch } = useRoutines()

  const routine = routines.find((r) => r.id === routineId)

  const [modalVisible, setModalVisible] = useState(false)
  const [name, setName] = useState('')
  const [muscleGroup, setMuscleGroup] = useState('')
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
      notes: notes.trim() || (muscleGroup.trim() ? `Enfoque: ${muscleGroup.trim()}` : undefined),
    })
    setAdding(false)

    if (!error) {
      setName('')
      setMuscleGroup('')
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
          headerStyle: { backgroundColor: '#0A0A0A' },
          headerTintColor: '#FFFFFF',
          headerShadowVisible: false,
        }}
      />

      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.content}>
          {/* Header Card */}
          <View style={styles.heroCard}>
            <Text style={styles.routineCategory}>RUTINA</Text>
            <Text style={styles.routineTitle}>{routine?.name || 'Cargando...'}</Text>
            {routine?.description && (
              <Text style={styles.routineDescription}>{routine.description}</Text>
            )}

            <View style={styles.metaPillsRow}>
              <View style={styles.metaPill}>
                <Ionicons name="barbell-outline" size={13} color="#3B82F6" />
                <Text style={styles.metaPillText}>
                  {routine?.exercises?.length || 0} ejercicios
                </Text>
              </View>
              <View style={styles.metaPill}>
                <Ionicons name="layers-outline" size={13} color="rgba(255,255,255,0.4)" />
                <Text style={styles.metaPillText}>
                  {routine?.exercises?.reduce((s, e) => s + (e.target_sets || 3), 0) || 0} series
                </Text>
              </View>
            </View>
          </View>

          {/* Section title & Add button */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Ejercicios</Text>
            <TouchableOpacity
              style={styles.addExerciseBtn}
              onPress={() => setModalVisible(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={16} color="#3B82F6" />
              <Text style={styles.addExerciseBtnText}>Añadir</Text>
            </TouchableOpacity>
          </View>

          {/* Exercise list */}
          {routine?.exercises?.length === 0 ? (
            <View style={styles.emptyExercises}>
              <Ionicons name="fitness-outline" size={36} color="rgba(255,255,255,0.3)" />
              <Text style={styles.emptyExTitle}>Sin ejercicios todavía</Text>
              <Text style={styles.emptyExSub}>
                Añade los ejercicios que componen este entrenamiento para empezar a registrar.
              </Text>
              <TouchableOpacity
                style={styles.emptyAddBtn}
                onPress={() => setModalVisible(true)}
              >
                <Text style={styles.emptyAddBtnText}>AÑADIR EJERCICIO</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.exerciseList}>
              {routine?.exercises?.map((exercise, index) => {
                const color = muscleGroupColor[exercise.name.split(' ')[0]] || '#60A5FA'
                return (
                  <View key={exercise.id} style={styles.exerciseCard}>
                    <View style={[styles.sideIndicator, { backgroundColor: color }]} />
                    <View style={styles.exerciseCardInner}>
                      <View style={styles.exerciseHeader}>
                        <Text style={[styles.exerciseIndex, { color }]}>
                          {String(index + 1).padStart(2, '0')}
                        </Text>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.exerciseName}>{exercise.name}</Text>
                        </View>
                        <TouchableOpacity
                          onPress={() => deleteExercise(exercise.id)}
                          style={styles.deleteExBtn}
                        >
                          <Ionicons name="trash-outline" size={16} color="rgba(255,255,255,0.3)" />
                        </TouchableOpacity>
                      </View>

                      {/* Badges row */}
                      <View style={styles.specsRow}>
                        <View style={styles.specBox}>
                          <Text style={styles.specVal}>{exercise.target_sets}×</Text>
                          <Text style={styles.specLabel}>SERIES</Text>
                        </View>
                        <View style={styles.specBox}>
                          <Text style={styles.specVal}>{exercise.target_reps}</Text>
                          <Text style={styles.specLabel}>REPS</Text>
                        </View>
                        <View style={styles.specBox}>
                          <Text style={styles.specVal}>{exercise.rest_seconds}s</Text>
                          <Text style={styles.specLabel}>DESCANSO</Text>
                        </View>
                      </View>

                      {exercise.notes && (
                        <Text style={styles.exerciseNotes}>
                          {exercise.notes}
                        </Text>
                      )}
                    </View>
                  </View>
                )
              })}
            </View>
          )}
        </ScrollView>

        {/* Floating CTA */}
        {routine && (routine.exercises?.length ?? 0) > 0 && (
          <View style={styles.footer}>
            <TouchableOpacity
              style={[
                styles.startWorkoutButton,
                starting && styles.startWorkoutButtonDisabled,
              ]}
              onPress={handleStartWorkout}
              disabled={starting}
              activeOpacity={0.9}
            >
              {starting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.startWorkoutButtonText}>
                  COMENZAR ENTRENAMIENTO
                </Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Modal Añadir Ejercicio */}
        <Modal
          visible={modalVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalSheet}>
              <View style={styles.modalHandle} />
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Añadir Ejercicio</Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <Ionicons name="close" size={22} color="rgba(255,255,255,0.4)" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalScroll}>
                <View style={styles.modalForm}>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>NOMBRE DEL EJERCICIO *</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="Ej: Press Banca con Barra"
                      placeholderTextColor="rgba(255,255,255,0.25)"
                      value={name}
                      onChangeText={setName}
                      autoFocus
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>GRUPO MUSCULAR</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="Ej: Pecho, Espalda, Cuádriceps"
                      placeholderTextColor="rgba(255,255,255,0.25)"
                      value={muscleGroup}
                      onChangeText={setMuscleGroup}
                    />
                  </View>

                  <View style={styles.formRow}>
                    <View style={[styles.inputGroup, { flex: 1 }]}>
                      <Text style={styles.inputLabel}>SERIES</Text>
                      <TextInput
                        style={[styles.textInput, { textAlign: 'center' }]}
                        placeholder="3"
                        placeholderTextColor="rgba(255,255,255,0.25)"
                        value={sets}
                        onChangeText={setSets}
                        keyboardType="number-pad"
                      />
                    </View>

                    <View style={[styles.inputGroup, { flex: 1 }]}>
                      <Text style={styles.inputLabel}>REPS</Text>
                      <TextInput
                        style={[styles.textInput, { textAlign: 'center' }]}
                        placeholder="8-10"
                        placeholderTextColor="rgba(255,255,255,0.25)"
                        value={reps}
                        onChangeText={setReps}
                      />
                    </View>

                    <View style={[styles.inputGroup, { flex: 1 }]}>
                      <Text style={styles.inputLabel}>DESCANSO (S)</Text>
                      <TextInput
                        style={[styles.textInput, { textAlign: 'center' }]}
                        placeholder="90"
                        placeholderTextColor="rgba(255,255,255,0.25)"
                        value={restSeconds}
                        onChangeText={setRestSeconds}
                        keyboardType="number-pad"
                      />
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>NOTAS DE TÉCNICA</Text>
                    <TextInput
                      style={[styles.textInput, styles.textArea]}
                      placeholder="Ej: Pausa de 1s en el pecho, control excéntrico"
                      placeholderTextColor="rgba(255,255,255,0.25)"
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
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <Text style={styles.modalSubmitBtnText}>AÑADIR</Text>
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
    backgroundColor: '#0A0A0A',
  },
  content: {
    padding: 16,
    gap: 16,
    paddingBottom: 120,
  },
  heroCard: {
    backgroundColor: '#121212',
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    gap: 4,
  },
  routineCategory: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2,
  },
  routineTitle: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '900',
  },
  routineDescription: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 13,
    marginTop: 2,
  },
  metaPillsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    gap: 5,
  },
  metaPillText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
    fontWeight: '600',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  addExerciseBtn: {
    backgroundColor: 'rgba(59,130,246,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.25)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  addExerciseBtnText: {
    color: '#3B82F6',
    fontWeight: '700',
    fontSize: 12,
  },
  emptyExercises: {
    backgroundColor: '#111111',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    gap: 12,
  },
  emptyExTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
    marginTop: 4,
  },
  emptyExSub: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 240,
  },
  emptyAddBtn: {
    backgroundColor: 'rgba(59,130,246,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.25)',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 14,
    marginTop: 8,
  },
  emptyAddBtnText: {
    color: '#3B82F6',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
  },
  exerciseList: {
    gap: 12,
  },
  exerciseCard: {
    backgroundColor: '#121212',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
    flexDirection: 'row',
  },
  sideIndicator: {
    width: 4,
  },
  exerciseCardInner: {
    flex: 1,
    padding: 16,
    gap: 10,
  },
  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  exerciseIndex: {
    fontSize: 18,
    fontWeight: '900',
  },
  exerciseName: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  deleteExBtn: {
    padding: 4,
  },
  specsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  specBox: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    alignItems: 'center',
  },
  specVal: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  specLabel: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 1,
    marginTop: 2,
  },
  exerciseNotes: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 11,
    fontStyle: 'italic',
    lineHeight: 15,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#0A0A0A',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
  },
  startWorkoutButton: {
    backgroundColor: '#3B82F6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 18,
    shadowColor: '#3B82F6',
    shadowOpacity: 0.4,
    shadowRadius: 18,
  },
  startWorkoutButtonDisabled: {
    opacity: 0.5,
  },
  startWorkoutButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#141414',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    borderTopWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    maxHeight: '90%',
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
  },
  modalScroll: {
    flexGrow: 0,
  },
  modalForm: {
    gap: 14,
  },
  formRow: {
    flexDirection: 'row',
    gap: 8,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  textInput: {
    backgroundColor: '#1C1C1C',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    color: '#FFFFFF',
    fontSize: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  textArea: {
    minHeight: 56,
    textAlignVertical: 'top',
  },
  modalSubmitBtn: {
    backgroundColor: '#3B82F6',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: '#3B82F6',
    shadowOpacity: 0.35,
    shadowRadius: 12,
  },
  modalSubmitBtnDisabled: {
    backgroundColor: '#1F1F1F',
    shadowOpacity: 0,
  },
  modalSubmitBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
})
