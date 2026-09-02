import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Modal,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Plus, Trash2, Dumbbell, Clock, Layers, Flame, Calendar, Sparkles, ChevronRight } from 'lucide-react-native'
import { ExerciseDefinition, getExerciseById } from '@/constants/exerciseDatabase'
import ExerciseIllustration from '@/components/visuals/ExerciseIllustration'
import AddExerciseModal from '@/components/workout/AddExerciseModal'
import ExerciseDetailModal from '@/components/workout/ExerciseDetailModal'
import AiRoutineGeneratorModal from '@/components/workout/AiRoutineGeneratorModal'
import {
  useRoutines,
  parseRoutineDays,
  cleanRoutineDescription,
  getExerciseRecordData,
} from '@/lib/hooks/useWorkout'
import { Routine } from '@/types'
import { useLanguage } from '@/lib/i18n'

interface Props {
  visible: boolean
  onClose: () => void
  onRoutineCreated?: () => void
  routineToEdit?: Routine | null
}

interface SelectedRoutineExercise {
  id: string
  exercise: ExerciseDefinition
  targetSets: number
  targetReps: string
  restSeconds: number
}

const DAYS_OF_WEEK = [
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
  'Domingo',
]

export default function CreateRoutineModal({
  visible,
  onClose,
  onRoutineCreated,
  routineToEdit,
}: Props) {
  const { t } = useLanguage()
  const { createRoutine, updateRoutine } = useRoutines()

  const isEditMode = !!routineToEdit

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [assignedDays, setAssignedDays] = useState<string[]>([])
  const [routineExercises, setRoutineExercises] = useState<SelectedRoutineExercise[]>([])
  const [showAddExerciseSearch, setShowAddExerciseSearch] = useState(false)
  const [showAiGenerator, setShowAiGenerator] = useState(false)
  const [infoModalExercise, setInfoModalExercise] = useState<ExerciseDefinition | null>(null)
  const [saving, setSaving] = useState(false)

  // Populate data when entering edit mode or reset when creating
  useEffect(() => {
    if (routineToEdit) {
      setName(routineToEdit.name || '')
      setDescription(cleanRoutineDescription(routineToEdit.description))
      setAssignedDays(parseRoutineDays(routineToEdit))

      if (routineToEdit.exercises && routineToEdit.exercises.length > 0) {
        const mapped: SelectedRoutineExercise[] = routineToEdit.exercises.map((e, idx) => {
          const dbEx = getExerciseById(e.name)
          const fallbackEx: ExerciseDefinition = {
            id: `ex-${idx}`,
            name: e.name,
            imageUrl: '',
            gifUrl: '',
            category: 'General',
            equipment: 'Barra / Mancuerna',
            target: 'Músculo',
            muscleGroup: 'General',
            secondaryMuscles: [],
            instructions: {
              setup: '',
              execution: '',
              tips: '',
              allSteps: [],
            },
            defaultSets: e.target_sets || 3,
            defaultReps: e.target_reps || '8-10',
            defaultRestSec: e.rest_seconds || 90,
            records: {
              maxWeight: 0,
              maxWeightPrev: 0,
              changePct: 0,
              period: '',
              volumeSet: '',
              volumeSession: '',
              oneRepMax: '',
            },
            history: [],
          }
          return {
            id: e.id || `ex-${Date.now()}-${idx}`,
            exercise: dbEx || fallbackEx,
            targetSets: e.target_sets || 3,
            targetReps: e.target_reps || '8-10',
            restSeconds: e.rest_seconds || 90,
          }
        })
        setRoutineExercises(mapped)
      } else {
        setRoutineExercises([])
      }
    } else {
      setName('')
      setDescription('')
      setAssignedDays([])
      setRoutineExercises([])
    }
  }, [routineToEdit, visible])

  const toggleDay = (day: string) => {
    setAssignedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    )
  }

  const handleAddExercise = (ex: ExerciseDefinition) => {
    const newEntry: SelectedRoutineExercise = {
      id: `ex-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      exercise: ex,
      targetSets: ex.defaultSets || 3,
      targetReps: ex.defaultReps || '8-10',
      restSeconds: ex.defaultRestSec || 90,
    }
    setRoutineExercises((prev) => [...prev, newEntry])
    setShowAddExerciseSearch(false)
  }

  const handleRemoveExercise = (id: string) => {
    setRoutineExercises((prev) => prev.filter((item) => item.id !== id))
  }

  const handleMoveExercise = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1
    if (newIndex < 0 || newIndex >= routineExercises.length) return
    const updated = [...routineExercises]
    const temp = updated[index]
    updated[index] = updated[newIndex]
    updated[newIndex] = temp
    setRoutineExercises(updated)
  }

  const updateExerciseSets = (id: string, delta: number) => {
    setRoutineExercises((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const newSets = Math.max(1, Math.min(10, item.targetSets + delta))
          return { ...item, targetSets: newSets }
        }
        return item
      })
    )
  }

  const updateExerciseReps = (id: string, reps: string) => {
    setRoutineExercises((prev) =>
      prev.map((item) => (item.id === id ? { ...item, targetReps: reps } : item))
    )
  }

  const updateExerciseRest = (id: string, restSecs: number) => {
    setRoutineExercises((prev) =>
      prev.map((item) => (item.id === id ? { ...item, restSeconds: Math.max(0, restSecs) } : item))
    )
  }

  const handleSaveRoutine = async () => {
    if (!name.trim()) {
      Alert.alert('Nombre requerido', 'Por favor, introduce un nombre para la rutina.')
      return
    }

    if (routineExercises.length === 0) {
      Alert.alert('Añade ejercicios', 'Por favor, añade al menos un ejercicio a esta rutina.')
      return
    }

    setSaving(true)

    try {
      const exercisePayload = routineExercises.map((item) => ({
        id: (item.id.startsWith('ex-') || item.id.startsWith('starter-')) ? undefined : item.id,
        name: item.exercise.name,
        target_sets: item.targetSets,
        target_reps: item.targetReps,
        rest_seconds: item.restSeconds,
      }))

      if (isEditMode && routineToEdit) {
        await updateRoutine(routineToEdit.id, {
          name: name.trim(),
          description: description.trim() || undefined,
          assigned_days: assignedDays,
          exercises: exercisePayload,
        })
      } else {
        await createRoutine(
          name.trim(),
          description.trim() || undefined,
          assignedDays,
          exercisePayload
        )
      }

      setSaving(false)
      onClose()
      if (onRoutineCreated) {
        onRoutineCreated()
      }
    } catch (err) {
      console.log('Error saving routine:', err)
      setSaving(false)
      Alert.alert('Error', 'Ocurrió un error al guardar la rutina.')
    }
  }

  const handleClose = () => {
    onClose()
  }

  const totalEstimatedSets = routineExercises.reduce((sum, e) => sum + e.targetSets, 0)
  const totalEstimatedMins = Math.max(
    15,
    Math.round(totalEstimatedSets * 2.5 + routineExercises.length * 1.5)
  )

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleClose}>
      <View style={styles.container}>
        {/* ── Top Bar Header ── */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={handleClose} activeOpacity={0.7} style={styles.topBarBtn}>
            <Text style={styles.topBarCancelText}>{t('cancel')}</Text>
          </TouchableOpacity>

          <Text style={styles.topBarTitle}>
            {isEditMode ? 'Editar Rutina' : 'Nueva Rutina'}
          </Text>

          <TouchableOpacity
            onPress={handleSaveRoutine}
            activeOpacity={0.8}
            style={styles.topBarSaveBtn}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#38BDF8" size="small" />
            ) : (
              <Text style={styles.topBarSaveText}>Guardar</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* AI Routine Generator Banner */}
          {!isEditMode && (
            <TouchableOpacity
              style={styles.aiBannerBtn}
              onPress={() => setShowAiGenerator(true)}
              activeOpacity={0.85}
            >
              <View style={styles.aiBannerIconBox}>
                <Sparkles size={18} color="#0F172A" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.aiBannerTitle}>Generar Rutina con IA</Text>
                <Text style={styles.aiBannerSub}>
                  Crea una rutina personalizada por objetivo, días y equipamiento.
                </Text>
              </View>
              <ChevronRight size={18} color="#38BDF8" />
            </TouchableOpacity>
          )}

          {/* ── Routine Details Card ── */}
          <View style={styles.card}>
            <Text style={styles.cardLabel}>DETALLES DE LA RUTINA</Text>

            {/* Name Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Nombre de la rutina *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Ej. Pecho & Tríceps Hipertrofia"
                placeholderTextColor="rgba(255,255,255,0.3)"
                value={name}
                onChangeText={setName}
                autoFocus={!isEditMode}
              />
            </View>

            {/* Description Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Descripción / Enfoque (opcional)</Text>
              <TextInput
                style={[styles.textInput, { height: 44 }]}
                placeholder="Ej. Énfasis en empuje, fuerza y congestión muscular"
                placeholderTextColor="rgba(255,255,255,0.3)"
                value={description}
                onChangeText={setDescription}
              />
            </View>
          </View>

          {/* ── Days of the Week Assignment ── */}
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <Calendar color="#38BDF8" size={16} strokeWidth={2} />
              <Text style={styles.cardLabel}>DÍAS DE ENTRENAMIENTO PROGRAMADOS</Text>
            </View>
            <Text style={styles.daysSubtitle}>
              Selecciona qué días de la semana realizarás esta rutina para que aparezca en tu Inicio:
            </Text>

            <View style={styles.daysPillGrid}>
              {DAYS_OF_WEEK.map((day) => {
                const isSelected = assignedDays.includes(day)
                return (
                  <TouchableOpacity
                    key={day}
                    style={[styles.dayPill, isSelected && styles.dayPillActive]}
                    onPress={() => toggleDay(day)}
                    activeOpacity={0.75}
                  >
                    <Text
                      style={[
                        styles.dayPillText,
                        isSelected && styles.dayPillTextActive,
                      ]}
                    >
                      {day}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </View>
          </View>

          {/* ── Summary Stats Pill ── */}
          {routineExercises.length > 0 && (
            <View style={styles.summaryBar}>
              <View style={styles.summaryItem}>
                <Dumbbell color="#38BDF8" size={16} strokeWidth={2} />
                <Text style={styles.summaryText}>
                  {routineExercises.length} {routineExercises.length === 1 ? 'ejercicio' : 'ejercicios'}
                </Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Layers color="#38BDF8" size={16} strokeWidth={2} />
                <Text style={styles.summaryText}>{totalEstimatedSets} series</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Clock color="#38BDF8" size={16} strokeWidth={2} />
                <Text style={styles.summaryText}>~{totalEstimatedMins} min</Text>
              </View>
            </View>
          )}

          {/* ── Exercises Section Header & Add Button ── */}
          <View style={styles.exercisesSectionHeader}>
            <Text style={styles.sectionTitle}>EJERCICIOS DE LA RUTINA</Text>
            <TouchableOpacity
              style={styles.addExerciseHeaderBtn}
              onPress={() => setShowAddExerciseSearch(true)}
              activeOpacity={0.8}
            >
              <Plus color="#38BDF8" size={16} strokeWidth={2.5} />
              <Text style={styles.addExerciseHeaderText}>Añadir</Text>
            </TouchableOpacity>
          </View>

          {/* ── Empty State ── */}
          {routineExercises.length === 0 && (
            <View style={styles.emptyStateBox}>
              <View style={styles.emptyIconCircle}>
                <Dumbbell color="rgba(255,255,255,0.4)" size={32} strokeWidth={1.5} />
              </View>
              <Text style={styles.emptyTitle}>Todavía no hay ejercicios agregados</Text>
              <Text style={styles.emptySubtitle}>
                Añade los ejercicios que formarán parte de esta rutina para poder registrar tus series y progresos.
              </Text>
              <TouchableOpacity
                style={styles.emptyAddBtn}
                onPress={() => setShowAddExerciseSearch(true)}
                activeOpacity={0.85}
              >
                <Plus color="#FFFFFF" size={18} strokeWidth={2.5} />
                <Text style={styles.emptyAddBtnText}>AÑADIR EJERCICIOS</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── List of Exercises in Routine ── */}
          {routineExercises.map((item, index) => (
            <View key={item.id} style={styles.exerciseCard}>
              <View style={styles.exerciseCardTop}>
                {/* Reorder Arrows & Index */}
                <View style={styles.exerciseReorderCol}>
                  <TouchableOpacity
                    onPress={() => handleMoveExercise(index, 'up')}
                    disabled={index === 0}
                    style={[styles.miniReorderBtn, index === 0 && { opacity: 0.2 }]}
                  >
                    <Ionicons name="chevron-up" size={14} color="#38BDF8" />
                  </TouchableOpacity>
                  <View style={styles.exerciseIndexBadge}>
                    <Text style={styles.exerciseIndexText}>{index + 1}</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleMoveExercise(index, 'down')}
                    disabled={index === routineExercises.length - 1}
                    style={[styles.miniReorderBtn, index === routineExercises.length - 1 && { opacity: 0.2 }]}
                  >
                    <Ionicons name="chevron-down" size={14} color="#38BDF8" />
                  </TouchableOpacity>
                </View>

                <ExerciseIllustration
                  exerciseId={item.exercise.id}
                  exerciseName={item.exercise.name}
                  imageUrl={item.exercise.imageUrl}
                  gifUrl={item.exercise.gifUrl}
                  size={42}
                  variant="circle-thumb"
                />

                {/* Title and Category */}
                <View style={styles.exerciseCardInfo}>
                  <Text style={styles.exerciseCardName} numberOfLines={1}>
                    {item.exercise.name}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                    <Text style={styles.exerciseCardMeta} numberOfLines={1}>
                      {item.exercise.category || item.exercise.muscleGroup} · {item.exercise.equipment}
                    </Text>
                    {(() => {
                      const record = getExerciseRecordData(item.exercise.name)
                      if (record.maxWeightOverall > 0) {
                        return (
                          <View style={styles.prMiniBadge}>
                            <Text style={styles.prMiniBadgeText}>PR: {record.maxWeightOverall}kg</Text>
                          </View>
                        )
                      }
                      return null
                    })()}
                  </View>
                </View>

                {/* Info & Delete Buttons */}
                <View style={styles.exerciseActionBtns}>
                  <TouchableOpacity
                    onPress={() => setInfoModalExercise(item.exercise)}
                    style={styles.exerciseIconBtn}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="information-circle-outline" size={20} color="rgba(255,255,255,0.5)" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleRemoveExercise(item.id)}
                    style={styles.exerciseIconBtn}
                    activeOpacity={0.7}
                  >
                    <Trash2 color="#EF4444" size={18} strokeWidth={2} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Controls Row: Sets, Reps, Rest */}
              <View style={styles.controlsRow}>
                {/* Sets Stepper */}
                <View style={styles.controlBox}>
                  <Text style={styles.controlLabel}>Series</Text>
                  <View style={styles.stepper}>
                    <TouchableOpacity
                      onPress={() => updateExerciseSets(item.id, -1)}
                      style={styles.stepperBtn}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.stepperBtnText}>-</Text>
                    </TouchableOpacity>
                    <Text style={styles.stepperVal}>{item.targetSets}</Text>
                    <TouchableOpacity
                      onPress={() => updateExerciseSets(item.id, 1)}
                      style={styles.stepperBtn}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.stepperBtnText}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Target Reps */}
                <View style={styles.controlBox}>
                  <Text style={styles.controlLabel}>Reps Objetivo</Text>
                  <TextInput
                    style={styles.repsInput}
                    value={item.targetReps}
                    onChangeText={(val) => updateExerciseReps(item.id, val)}
                    placeholder="8-10"
                    placeholderTextColor="rgba(255,255,255,0.3)"
                  />
                </View>

                {/* Rest Seconds (Optional & Custom in seconds) */}
                <View style={styles.controlBox}>
                  <Text style={styles.controlLabel}>Descanso</Text>
                  <View style={styles.restStepper}>
                    <TouchableOpacity
                      onPress={() => updateExerciseRest(item.id, Math.max(0, item.restSeconds - 15))}
                      style={styles.restAdjustSmallBtn}
                    >
                      <Text style={styles.restAdjustText}>-15</Text>
                    </TouchableOpacity>
                    <View style={styles.restBadge}>
                      <Clock color="rgba(255,255,255,0.4)" size={11} strokeWidth={2} />
                      <Text style={styles.restBadgeText}>
                        {item.restSeconds > 0 ? `${item.restSeconds}s` : 'Sin desc.'}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => updateExerciseRest(item.id, item.restSeconds + 15)}
                      style={styles.restAdjustSmallBtn}
                    >
                      <Text style={styles.restAdjustText}>+15</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>
          ))}

          {/* Bottom Button if Exercises exist */}
          {routineExercises.length > 0 && (
            <TouchableOpacity
              style={styles.bottomAddExerciseBtn}
              onPress={() => setShowAddExerciseSearch(true)}
              activeOpacity={0.85}
            >
              <Plus color="#38BDF8" size={18} strokeWidth={2.5} />
              <Text style={styles.bottomAddExerciseBtnText}>AÑADIR OTRO EJERCICIO</Text>
            </TouchableOpacity>
          )}
        </ScrollView>

        {/* ── Search Modal to Add Exercises to this Routine ── */}
        <AddExerciseModal
          visible={showAddExerciseSearch}
          onClose={() => setShowAddExerciseSearch(false)}
          onSelectExercise={handleAddExercise}
          onOpenInfo={(ex) => setInfoModalExercise(ex)}
        />

        {/* ── Info / Technique Modal ── */}
        {infoModalExercise && (
          <ExerciseDetailModal
            visible={!!infoModalExercise}
            exercise={infoModalExercise}
            onClose={() => setInfoModalExercise(null)}
          />
        )}

        {/* ── AI Routine Generator Modal (Modulo 3) ── */}
        <AiRoutineGeneratorModal
          visible={showAiGenerator}
          onClose={() => setShowAiGenerator(false)}
          onRoutineCreated={() => {
            onRoutineCreated?.()
            onClose()
          }}
        />
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 52 : 36,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
    backgroundColor: '#0E1017',
  },
  topBarBtn: {
    padding: 6,
  },
  topBarCancelText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 15,
    fontWeight: '600',
  },
  topBarTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
  },
  topBarSaveBtn: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.4)',
  },
  topBarSaveText: {
    color: '#38BDF8',
    fontSize: 14,
    fontWeight: '800',
  },
  scrollContent: {
    padding: 16,
    gap: 16,
    paddingBottom: 60,
  },
  card: {
    backgroundColor: '#12141C',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    gap: 12,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardLabel: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  daysSubtitle: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
    lineHeight: 18,
  },
  daysPillGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  dayPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#181C26',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  dayPillActive: {
    backgroundColor: 'rgba(56, 189, 248, 0.2)',
    borderColor: '#38BDF8',
  },
  dayPillText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    fontWeight: '600',
  },
  dayPillTextActive: {
    color: '#38BDF8',
    fontWeight: '800',
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    fontWeight: '600',
  },
  textInput: {
    backgroundColor: '#181C26',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  summaryBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#12141C',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.2)',
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  summaryDivider: {
    width: 1,
    height: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  summaryText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  exercisesSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  sectionTitle: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  addExerciseHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  addExerciseHeaderText: {
    color: '#38BDF8',
    fontSize: 13,
    fontWeight: '700',
  },
  emptyStateBox: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#12141C',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    gap: 12,
    marginVertical: 8,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.04)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptySubtitle: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 12,
  },
  emptyAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563EB',
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8,
    marginTop: 6,
  },
  emptyAddBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  exerciseCard: {
    backgroundColor: '#12141C',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    gap: 12,
  },
  exerciseCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  exerciseIndexBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  exerciseIndexText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
    fontWeight: '700',
  },
  exerciseCardInfo: {
    flex: 1,
    gap: 2,
  },
  exerciseCardName: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  exerciseCardMeta: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
  },
  prMiniBadge: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  prMiniBadgeText: {
    color: '#38BDF8',
    fontSize: 9,
    fontWeight: '800',
  },
  exerciseActionBtns: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  exerciseIconBtn: {
    padding: 6,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#181C26',
    borderRadius: 12,
    padding: 8,
    gap: 8,
  },
  controlBox: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  controlLabel: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepperBtn: {
    width: 26,
    height: 26,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  stepperVal: {
    color: '#38BDF8',
    fontSize: 15,
    fontWeight: '800',
    minWidth: 16,
    textAlign: 'center',
  },
  repsInput: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    minWidth: 55,
  },
  exerciseReorderCol: {
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 2,
    gap: 1,
  },
  miniReorderBtn: {
    padding: 1,
  },
  restStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  restAdjustSmallBtn: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 5,
    paddingVertical: 3,
    borderRadius: 4,
  },
  restAdjustText: {
    color: '#38BDF8',
    fontSize: 10,
    fontWeight: '800',
  },
  restBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.04)',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
  },
  restBadgeText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    fontWeight: '600',
  },
  bottomAddExerciseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(56, 189, 248, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.25)',
    borderRadius: 14,
    paddingVertical: 12,
    gap: 8,
    borderStyle: 'dashed',
  },
  bottomAddExerciseBtnText: {
    color: '#38BDF8',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  aiBannerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#0284C7',
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
  },
  aiBannerIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#38BDF8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiBannerTitle: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '800',
  },
  aiBannerSub: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 2,
  },
})
