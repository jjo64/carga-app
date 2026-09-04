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
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import {
  Plus,
  Trash2,
  Dumbbell,
  Clock,
  Layers,
  Sparkles,
  ChevronUp,
  ChevronDown,
  Info,
  Check,
  X,
  Zap,
} from 'lucide-react-native'
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
  { key: 'Lunes', label: 'L' },
  { key: 'Martes', label: 'M' },
  { key: 'Miércoles', label: 'X' },
  { key: 'Jueves', label: 'J' },
  { key: 'Viernes', label: 'V' },
  { key: 'Sábado', label: 'S' },
  { key: 'Domingo', label: 'D' },
]

const REST_PRESETS = [
  { label: 'Sin descanso (0s)', value: 0 },
  { label: '15 segundos', value: 15 },
  { label: '30 segundos', value: 30 },
  { label: '45 segundos', value: 45 },
  { label: '60 segundos (1 min)', value: 60 },
  { label: '75 segundos', value: 75 },
  { label: '90 segundos (1.5 min)', value: 90 },
  { label: '105 segundos', value: 105 },
  { label: '120 segundos (2 min)', value: 120 },
  { label: '150 segundos (2.5 min)', value: 150 },
  { label: '180 segundos (3 min)', value: 180 },
  { label: '240 segundos (4 min)', value: 240 },
  { label: '300 segundos (5 min)', value: 300 },
]

export default function CreateRoutineModal({
  visible,
  onClose,
  onRoutineCreated,
  routineToEdit,
}: Props) {
  const insets = useSafeAreaInsets()
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

  // Rest Picker State
  const [restPickerExerciseId, setRestPickerExerciseId] = useState<string | null>(null)
  const [selectedRestSecs, setSelectedRestSecs] = useState<number>(90)

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
            defaultSets: e.target_sets || 4,
            defaultReps: e.target_reps || '8',
            defaultRestSec: e.rest_seconds !== undefined ? e.rest_seconds : 90,
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
            targetSets: e.target_sets || 4,
            targetReps: e.target_reps || '8',
            restSeconds: e.rest_seconds !== undefined ? e.rest_seconds : 90,
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

  // Single-day selection logic: toggle on or off (max 1 day)
  const handleSelectDay = (dayKey: string) => {
    setAssignedDays((prev) => (prev.includes(dayKey) ? [] : [dayKey]))
  }

  const handleAddExercise = (ex: ExerciseDefinition) => {
    const newEntry: SelectedRoutineExercise = {
      id: `ex-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      exercise: ex,
      targetSets: ex.defaultSets || 4,
      targetReps: ex.defaultReps ? String(ex.defaultReps) : '8',
      restSeconds: ex.defaultRestSec !== undefined ? ex.defaultRestSec : 90,
    }
    setRoutineExercises((prev) => [...prev, newEntry])
    setShowAddExerciseSearch(false)
  }

  const handleAddExercises = (exercisesList: ExerciseDefinition[]) => {
    const newEntries: SelectedRoutineExercise[] = exercisesList.map((ex, i) => ({
      id: `ex-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 4)}`,
      exercise: ex,
      targetSets: ex.defaultSets || 4,
      targetReps: ex.defaultReps ? String(ex.defaultReps) : '8',
      restSeconds: ex.defaultRestSec !== undefined ? ex.defaultRestSec : 90,
    }))
    setRoutineExercises((prev) => [...prev, ...newEntries])
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
          const newSets = Math.max(1, Math.min(12, item.targetSets + delta))
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

  const openRestPicker = (id: string, currentSecs: number) => {
    setRestPickerExerciseId(id)
    setSelectedRestSecs(currentSecs)
  }

  const applyRestPicker = () => {
    if (restPickerExerciseId) {
      setRoutineExercises((prev) =>
        prev.map((item) =>
          item.id === restPickerExerciseId ? { ...item, restSeconds: selectedRestSecs } : item
        )
      )
    }
    setRestPickerExerciseId(null)
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
        id: item.id.startsWith('ex-') || item.id.startsWith('starter-') ? undefined : item.id,
        name: item.exercise.name,
        target_sets: item.targetSets,
        target_reps: item.targetReps || '8',
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

  const totalEstimatedSets = routineExercises.reduce((sum, e) => sum + e.targetSets, 0)
  const totalEstimatedMins = Math.max(
    15,
    Math.round(totalEstimatedSets * 2.5 + routineExercises.length * 1.5)
  )

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* ── Top Header ── */}
        <View style={styles.header}>
          <View style={styles.headerTitleCol}>
            <View style={styles.headerBadge}>
              <Zap size={11} color="#A1A1AA" />
              <Text style={styles.headerBadgeText}>RUTINAS & ENTRENAMIENTO</Text>
            </View>
            <Text style={styles.headerTitle}>
              {isEditMode ? 'Editar Rutina' : 'Crear Rutina'}
            </Text>
          </View>

          <View style={styles.headerActions}>
            {!isEditMode && (
              <TouchableOpacity
                style={styles.aiHeaderBtn}
                onPress={() => setShowAiGenerator(true)}
                activeOpacity={0.8}
              >
                <Sparkles size={14} color="#FAFAFA" />
                <Text style={styles.aiHeaderBtnText}>Generar con IA</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <X size={18} color="#A1A1AA" />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Scrollable Body ── */}
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Routine Name Input Card */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionLabel}>NOMBRE DE LA RUTINA</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Ej. Torso - Hipertrofia & Fuerza"
              placeholderTextColor="#52525B"
              value={name}
              onChangeText={setName}
              autoFocus={!isEditMode && name.length === 0}
            />
          </View>

          {/* Single Day Selection Card */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionLabel}>DÍA ASIGNADO</Text>
              <Text style={styles.sectionOptionalText}>1 día por rutina</Text>
            </View>

            <View style={styles.daysRow}>
              {DAYS_OF_WEEK.map((item) => {
                const isSelected = assignedDays.includes(item.key)
                return (
                  <TouchableOpacity
                    key={item.key}
                    style={[styles.dayCircle, isSelected && styles.dayCircleActive]}
                    onPress={() => handleSelectDay(item.key)}
                    activeOpacity={0.75}
                  >
                    <Text style={[styles.dayCircleText, isSelected && styles.dayCircleTextActive]}>
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </View>
          </View>

          {/* Stats Bar if Exercises exist */}
          {routineExercises.length > 0 && (
            <View style={styles.summaryBar}>
              <View style={styles.summaryItem}>
                <Dumbbell color="#FAFAFA" size={14} />
                <Text style={styles.summaryText}>
                  {routineExercises.length} {routineExercises.length === 1 ? 'ejercicio' : 'ejercicios'}
                </Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Layers color="#FAFAFA" size={14} />
                <Text style={styles.summaryText}>{totalEstimatedSets} series</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Clock color="#FAFAFA" size={14} />
                <Text style={styles.summaryText}>~{totalEstimatedMins} min</Text>
              </View>
            </View>
          )}

          {/* ── Exercises Section ── */}
          <View style={styles.exercisesHeaderRow}>
            <Text style={styles.sectionLabel}>EJERCICIOS ({routineExercises.length})</Text>
            {routineExercises.length > 0 && (
              <TouchableOpacity
                style={styles.addMiniBtn}
                onPress={() => setShowAddExerciseSearch(true)}
                activeOpacity={0.8}
              >
                <Plus size={14} color="#FAFAFA" />
                <Text style={styles.addMiniBtnText}>Añadir</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* ── Empty State if no exercises ── */}
          {routineExercises.length === 0 && (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconBox}>
                <Dumbbell size={30} color="#71717A" strokeWidth={1.5} />
              </View>
              <Text style={styles.emptyTitle}>Rutina sin ejercicios aún</Text>
              <Text style={styles.emptySub}>
                Añade los ejercicios que formarán parte de este entrenamiento o genera una estructura completa con IA.
              </Text>

              <TouchableOpacity
                style={styles.emptyActionBtn}
                onPress={() => setShowAddExerciseSearch(true)}
                activeOpacity={0.85}
              >
                <Plus size={18} color="#09090B" strokeWidth={2.5} />
                <Text style={styles.emptyActionBtnText}>Añadir Primer Ejercicio</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── Exercises List ── */}
          {routineExercises.map((item, index) => {
            const record = getExerciseRecordData(item.exercise.name)
            return (
              <View key={item.id} style={styles.exerciseCard}>
                {/* Exercise Header Row */}
                <View style={styles.exerciseCardTop}>
                  {/* Left Thumbnail Illustration */}
                  <View style={styles.exerciseThumbContainer}>
                    <ExerciseIllustration
                      exerciseId={item.exercise.id}
                      exerciseName={item.exercise.name}
                      imageUrl={item.exercise.imageUrl}
                      gifUrl={item.exercise.gifUrl}
                      size={46}
                      variant="circle-thumb"
                    />
                  </View>

                  {/* Title & Muscle Tag */}
                  <View style={styles.exerciseMetaCol}>
                    <Text style={styles.exerciseName} numberOfLines={1}>
                      {item.exercise.name}
                    </Text>
                    <View style={styles.exerciseSubRow}>
                      <Text style={styles.exerciseCategory} numberOfLines={1}>
                        {item.exercise.muscleGroup || item.exercise.category || 'General'}
                        {item.exercise.equipment ? ` · ${item.exercise.equipment}` : ''}
                      </Text>
                      {record.maxWeightOverall > 0 && (
                        <View style={styles.prBadge}>
                          <Text style={styles.prBadgeText}>PR: {record.maxWeightOverall}kg</Text>
                        </View>
                      )}
                    </View>
                  </View>

                  {/* Actions: Info, Up/Down, Delete */}
                  <View style={styles.exerciseActionsRow}>
                    <TouchableOpacity
                      onPress={() => setInfoModalExercise(item.exercise)}
                      style={styles.iconBtn}
                      activeOpacity={0.7}
                    >
                      <Info size={16} color="#71717A" />
                    </TouchableOpacity>

                    <View style={styles.reorderCol}>
                      <TouchableOpacity
                        onPress={() => handleMoveExercise(index, 'up')}
                        disabled={index === 0}
                        style={[styles.microReorderBtn, index === 0 && { opacity: 0.2 }]}
                      >
                        <ChevronUp size={14} color="#A1A1AA" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleMoveExercise(index, 'down')}
                        disabled={index === routineExercises.length - 1}
                        style={[
                          styles.microReorderBtn,
                          index === routineExercises.length - 1 && { opacity: 0.2 },
                        ]}
                      >
                        <ChevronDown size={14} color="#A1A1AA" />
                      </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                      onPress={() => handleRemoveExercise(item.id)}
                      style={styles.deleteBtn}
                      activeOpacity={0.7}
                    >
                      <Trash2 size={16} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Controls Bar: SERIES | REPS OBJETIVO | DESCANSO */}
                <View style={styles.controlsBar}>
                  {/* SERIES */}
                  <View style={styles.controlBlock}>
                    <Text style={styles.controlHeader}>SERIES</Text>
                    <View style={styles.stepperContainer}>
                      <TouchableOpacity
                        onPress={() => updateExerciseSets(item.id, -1)}
                        style={styles.stepperBtn}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.stepperBtnText}>-</Text>
                      </TouchableOpacity>
                      <Text style={styles.stepperValue}>{item.targetSets}</Text>
                      <TouchableOpacity
                        onPress={() => updateExerciseSets(item.id, 1)}
                        style={styles.stepperBtn}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.stepperBtnText}>+</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* REPS OBJETIVO (Default 8, fully editable) */}
                  <View style={styles.controlBlock}>
                    <Text style={styles.controlHeader}>REPS OBJETIVO</Text>
                    <TextInput
                      style={styles.repsPillInput}
                      value={item.targetReps}
                      onChangeText={(val) => updateExerciseReps(item.id, val)}
                      placeholder="8"
                      placeholderTextColor="#71717A"
                      keyboardType="default"
                    />
                  </View>

                  {/* DESCANSO (Selector modal) */}
                  <View style={styles.controlBlock}>
                    <Text style={styles.controlHeader}>DESCANSO</Text>
                    <TouchableOpacity
                      style={styles.restPickerBtn}
                      onPress={() => openRestPicker(item.id, item.restSeconds)}
                      activeOpacity={0.75}
                    >
                      <Clock size={12} color="#A1A1AA" />
                      <Text style={styles.restPickerBtnText}>
                        {item.restSeconds > 0 ? `${item.restSeconds}s` : '0s'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )
          })}

          {/* Add Another Exercise Button */}
          {routineExercises.length > 0 && (
            <TouchableOpacity
              style={styles.bottomAddBtn}
              onPress={() => setShowAddExerciseSearch(true)}
              activeOpacity={0.8}
            >
              <Plus size={16} color="#FAFAFA" />
              <Text style={styles.bottomAddBtnText}>Añadir Ejercicio</Text>
            </TouchableOpacity>
          )}
        </ScrollView>

        {/* ── Sticky Bottom CTA Button ── */}
        <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <TouchableOpacity
            style={styles.primarySaveBtn}
            onPress={handleSaveRoutine}
            activeOpacity={0.85}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#09090B" size="small" />
            ) : (
              <>
                <Check size={18} color="#09090B" strokeWidth={2.5} />
                <Text style={styles.primarySaveBtnText}>
                  {isEditMode ? 'GUARDAR CAMBIOS' : 'GUARDAR RUTINA'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* ── Rest Time Selector Modal ── */}
        <Modal
          visible={restPickerExerciseId !== null}
          transparent
          animationType="fade"
          onRequestClose={() => setRestPickerExerciseId(null)}
        >
          <View style={styles.pickerOverlay}>
            <View style={[styles.pickerSheet, { paddingBottom: Math.max(insets.bottom, 20) }]}>
              {/* Header */}
              <View style={styles.pickerHeader}>
                <View>
                  <Text style={styles.pickerTitle}>Tiempo de Descanso</Text>
                  <Text style={styles.pickerSub}>
                    Selecciona el intervalo entre cada serie de este ejercicio
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setRestPickerExerciseId(null)}
                  style={styles.pickerCloseBtn}
                >
                  <X size={18} color="#A1A1AA" />
                </TouchableOpacity>
              </View>

              {/* Current Rest Display & Quick Steppers */}
              <View style={styles.pickerCurrentRow}>
                <TouchableOpacity
                  onPress={() => setSelectedRestSecs((prev) => Math.max(0, prev - 15))}
                  style={styles.pickerQuickBtn}
                >
                  <Text style={styles.pickerQuickBtnText}>-15s</Text>
                </TouchableOpacity>

                <View style={styles.pickerDisplayBadge}>
                  <Clock size={20} color="#FAFAFA" />
                  <Text style={styles.pickerDisplayText}>
                    {selectedRestSecs > 0 ? `${selectedRestSecs} seg` : 'Sin Descanso (0s)'}
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={() => setSelectedRestSecs((prev) => Math.min(360, prev + 15))}
                  style={styles.pickerQuickBtn}
                >
                  <Text style={styles.pickerQuickBtnText}>+15s</Text>
                </TouchableOpacity>
              </View>

              {/* Presets List */}
              <ScrollView
                style={styles.presetsList}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ gap: 8, paddingVertical: 8 }}
              >
                {REST_PRESETS.map((p) => {
                  const isCur = selectedRestSecs === p.value
                  return (
                    <TouchableOpacity
                      key={p.value}
                      style={[styles.presetRow, isCur && styles.presetRowActive]}
                      onPress={() => setSelectedRestSecs(p.value)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.presetRowText, isCur && styles.presetRowTextActive]}>
                        {p.label}
                      </Text>
                      {isCur && <Check size={16} color="#FAFAFA" strokeWidth={2.5} />}
                    </TouchableOpacity>
                  )
                })}
              </ScrollView>

              {/* Confirm Selection */}
              <TouchableOpacity
                style={styles.pickerConfirmBtn}
                onPress={applyRestPicker}
                activeOpacity={0.85}
              >
                <Check size={18} color="#09090B" strokeWidth={2.5} />
                <Text style={styles.pickerConfirmBtnText}>APLICAR DESCANSO</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* ── Search Modal to Add Exercises to this Routine ── */}
        <AddExerciseModal
          visible={showAddExerciseSearch}
          onClose={() => setShowAddExerciseSearch(false)}
          onSelectExercise={handleAddExercise}
          onAddExercises={handleAddExercises}
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

        {/* ── AI Routine Generator Modal ── */}
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
    backgroundColor: '#09090B',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#18181B',
  },
  headerTitleCol: {
    gap: 4,
  },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  headerBadgeText: {
    color: '#71717A',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  headerTitle: {
    color: '#FAFAFA',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  aiHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#18181B',
    borderWidth: 1,
    borderColor: '#27272A',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
  },
  aiHeaderBtnText: {
    color: '#FAFAFA',
    fontSize: 12,
    fontWeight: '700',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#18181B',
    borderWidth: 1,
    borderColor: '#27272A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: 16,
    gap: 16,
  },
  sectionCard: {
    backgroundColor: '#121214',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#27272A',
    gap: 10,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionLabel: {
    color: '#71717A',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  sectionOptionalText: {
    color: '#52525B',
    fontSize: 11,
    fontWeight: '600',
  },
  textInput: {
    backgroundColor: '#18181B',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#FAFAFA',
    fontSize: 15,
    fontWeight: '600',
    borderWidth: 1,
    borderColor: '#27272A',
  },
  daysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
    marginTop: 4,
  },
  dayCircle: {
    flex: 1,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#18181B',
    borderWidth: 1,
    borderColor: '#27272A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCircleActive: {
    backgroundColor: '#FAFAFA',
    borderColor: '#FAFAFA',
  },
  dayCircleText: {
    color: '#71717A',
    fontSize: 14,
    fontWeight: '700',
  },
  dayCircleTextActive: {
    color: '#09090B',
    fontWeight: '900',
  },
  summaryBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#121214',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#27272A',
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  summaryDivider: {
    width: 1,
    height: 14,
    backgroundColor: '#27272A',
  },
  summaryText: {
    color: '#D4D4D8',
    fontSize: 12,
    fontWeight: '700',
  },
  exercisesHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  addMiniBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#18181B',
    borderWidth: 1,
    borderColor: '#27272A',
  },
  addMiniBtnText: {
    color: '#FAFAFA',
    fontSize: 12,
    fontWeight: '700',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#121214',
    borderRadius: 18,
    padding: 28,
    borderWidth: 1,
    borderColor: '#27272A',
    borderStyle: 'dashed',
    gap: 12,
    marginVertical: 4,
  },
  emptyIconBox: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#18181B',
    borderWidth: 1,
    borderColor: '#27272A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    color: '#FAFAFA',
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
  emptySub: {
    color: '#71717A',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 280,
  },
  emptyActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8,
    marginTop: 6,
  },
  emptyActionBtnText: {
    color: '#09090B',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  exerciseCard: {
    backgroundColor: '#121214',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#27272A',
    gap: 12,
  },
  exerciseCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  exerciseThumbContainer: {
    width: 46,
    height: 46,
    borderRadius: 10,
    backgroundColor: '#18181B',
    borderWidth: 1,
    borderColor: '#27272A',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  exerciseMetaCol: {
    flex: 1,
    gap: 3,
  },
  exerciseName: {
    color: '#FAFAFA',
    fontSize: 14,
    fontWeight: '800',
  },
  exerciseSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  exerciseCategory: {
    color: '#71717A',
    fontSize: 12,
    fontWeight: '500',
  },
  prBadge: {
    backgroundColor: '#27272A',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  prBadgeText: {
    color: '#A1A1AA',
    fontSize: 9,
    fontWeight: '800',
  },
  exerciseActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  iconBtn: {
    padding: 6,
  },
  reorderCol: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  microReorderBtn: {
    padding: 1,
  },
  deleteBtn: {
    padding: 6,
  },
  controlsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#18181B',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: '#27272A',
  },
  controlBlock: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  controlHeader: {
    color: '#71717A',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stepperBtn: {
    width: 26,
    height: 26,
    borderRadius: 7,
    backgroundColor: '#27272A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperBtnText: {
    color: '#FAFAFA',
    fontSize: 15,
    fontWeight: '700',
  },
  stepperValue: {
    color: '#FAFAFA',
    fontSize: 14,
    fontWeight: '900',
    minWidth: 16,
    textAlign: 'center',
  },
  repsPillInput: {
    backgroundColor: '#27272A',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    color: '#FAFAFA',
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
    minWidth: 52,
  },
  restPickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#27272A',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  restPickerBtnText: {
    color: '#FAFAFA',
    fontSize: 12,
    fontWeight: '800',
  },
  bottomAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#121214',
    borderWidth: 1,
    borderColor: '#27272A',
    borderStyle: 'dashed',
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 4,
  },
  bottomAddBtnText: {
    color: '#FAFAFA',
    fontSize: 13,
    fontWeight: '800',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#09090B',
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#18181B',
  },
  primarySaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FAFAFA',
    borderRadius: 16,
    paddingVertical: 16,
    width: '100%',
  },
  primarySaveBtnText: {
    color: '#09090B',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
  },
  pickerSheet: {
    backgroundColor: '#121214',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: '#27272A',
    gap: 16,
  },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  pickerTitle: {
    color: '#FAFAFA',
    fontSize: 18,
    fontWeight: '900',
  },
  pickerSub: {
    color: '#71717A',
    fontSize: 12,
    marginTop: 2,
  },
  pickerCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#18181B',
    borderWidth: 1,
    borderColor: '#27272A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerCurrentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    backgroundColor: '#18181B',
    padding: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#27272A',
  },
  pickerQuickBtn: {
    backgroundColor: '#27272A',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  pickerQuickBtnText: {
    color: '#FAFAFA',
    fontSize: 12,
    fontWeight: '800',
  },
  pickerDisplayBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pickerDisplayText: {
    color: '#FAFAFA',
    fontSize: 16,
    fontWeight: '900',
  },
  presetsList: {
    maxHeight: 220,
  },
  presetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#18181B',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#27272A',
  },
  presetRowActive: {
    backgroundColor: '#27272A',
    borderColor: '#FAFAFA',
  },
  presetRowText: {
    color: '#A1A1AA',
    fontSize: 14,
    fontWeight: '600',
  },
  presetRowTextActive: {
    color: '#FAFAFA',
    fontWeight: '800',
  },
  pickerConfirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FAFAFA',
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 4,
  },
  pickerConfirmBtnText: {
    color: '#09090B',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
})
