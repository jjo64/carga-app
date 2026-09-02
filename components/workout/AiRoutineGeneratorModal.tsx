import React, { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native'
import {
  Sparkles,
  Dumbbell,
  Clock,
  Calendar,
  Layers,
  Flame,
  Check,
  X,
  Target,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react-native'
import { callAnthropicApi, extractAndParseJson } from '@/lib/services/ai/client'
import { AnthropicSystemBlock } from '@/lib/services/ai/types'
import { EXERCISE_DATABASE, ExerciseDefinition } from '@/constants/exerciseDatabase'
import { useRoutines } from '@/lib/hooks/useWorkout'

interface Props {
  visible: boolean
  onClose: () => void
  onRoutineCreated?: () => void
}

interface GeneratedAiRoutine {
  name: string
  description: string
  target: string
  durationMinutes: number
  assignedDays: string[]
  exercises: Array<{
    name: string
    targetSets: number
    targetReps: string
    restSeconds: number
    notes?: string
  }>
}

const AI_ROUTINE_SYSTEM_PROMPT: AnthropicSystemBlock[] = [
  {
    type: 'text',
    text: `Eres el Arquitecto de Programación de Entrenamiento de 'Carga App'.
Diseñas rutinas científicas basadas en hipertrofia y fuerza según los parámetros exactos del usuario.

Reglas:
- Selecciona entre 4 y 7 ejercicios efectivos.
- Prioriza compuestos al inicio y aislamiento al final.
- Ajusta series (3-4), repeticiones (ej. '6-8' fuerza/compuestos, '10-12' hipertrofia) y descansos (60-120s).
- Si el usuario especificó molestias o equipamiento limitado, respétalo estrictamente.

Responde ÚNICAMENTE un JSON con este esquema exacto:
{
  "name": string,
  "description": string,
  "target": string,
  "durationMinutes": number,
  "assignedDays": string[],
  "exercises": [
    {
      "name": string,
      "targetSets": number,
      "targetReps": string,
      "restSeconds": number,
      "notes": string
    }
  ]
}`,
    cache_control: { type: 'ephemeral' },
  },
]

export default function AiRoutineGeneratorModal({ visible, onClose, onRoutineCreated }: Props) {
  const { createRoutine } = useRoutines()

  const [goal, setGoal] = useState<'hypertrophy' | 'strength' | 'fat_loss' | 'recomp'>('hypertrophy')
  const [level, setLevel] = useState<'beginner' | 'intermediate' | 'advanced'>('intermediate')
  const [daysCount, setDaysCount] = useState(4)
  const [durationMins, setDurationMins] = useState(60)
  const [equipment, setEquipment] = useState('Gimnasio Comercial')
  const [focusMuscles, setFocusMuscles] = useState('Torso / Pecho y Espalda')
  const [avoidInjuries, setAvoidInjuries] = useState('')

  const [loading, setLoading] = useState(false)
  const [generatedRoutine, setGeneratedRoutine] = useState<GeneratedAiRoutine | null>(null)
  const [saving, setSaving] = useState(false)

  const handleGenerate = async () => {
    setLoading(true)
    try {
      const prompt = `
Parámetros del usuario:
- Objetivo: ${goal === 'hypertrophy' ? 'Hipertrofia / Masa Muscular' : goal === 'strength' ? 'Fuerza Máxima' : goal === 'fat_loss' ? 'Pérdida de Grasa' : 'Recomposición Corporal'}
- Nivel: ${level}
- Días por semana: ${daysCount} días
- Tiempo disponible por sesión: ${durationMins} minutos
- Equipamiento: ${equipment}
- Enfoque muscular: ${focusMuscles}
- Molestias / Ejercicios a evitar: ${avoidInjuries || 'Ninguna'}
      `.trim()

      const { text } = await callAnthropicApi({
        modelTier: 'haiku',
        system: AI_ROUTINE_SYSTEM_PROMPT,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
        maxTokens: 1000,
      })

      const parsed = extractAndParseJson<GeneratedAiRoutine>(text)
      setGeneratedRoutine(parsed)
    } catch (err: any) {
      Alert.alert('Error', err.message || 'No se pudo generar la rutina con IA.')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveRoutine = async () => {
    if (!generatedRoutine) return
    setSaving(true)
    try {
      // Mapear los ejercicios a la estructura esperada
      const mappedExercises = generatedRoutine.exercises.map((ex) => {
        const matched = EXERCISE_DATABASE.find(
          (db) => db.name.toLowerCase() === ex.name.toLowerCase()
        )
        return {
          name: matched ? matched.name : ex.name,
          target_sets: ex.targetSets,
          target_reps: ex.targetReps,
          rest_seconds: ex.restSeconds,
        }
      })

      await createRoutine(
        generatedRoutine.name,
        generatedRoutine.description,
        generatedRoutine.assignedDays?.length ? generatedRoutine.assignedDays : ['Lunes'],
        mappedExercises
      )

      Alert.alert('¡Rutina Creada!', 'La rutina ha sido guardada en tu lista de rutinas personalizadas.')
      onRoutineCreated?.()
      handleClose()
    } catch (err: any) {
      Alert.alert('Error al guardar', err.message || 'No se pudo guardar la rutina.')
    } finally {
      setSaving(false)
    }
  }

  const handleClose = () => {
    setGeneratedRoutine(null)
    onClose()
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <View style={styles.badgeRow}>
                <Sparkles size={14} color="#38BDF8" />
                <Text style={styles.badgeText}>GENERADOR DE RUTINAS IA</Text>
              </View>
              <Text style={styles.headerTitle}>Diseñar Rutina a Medida</Text>
            </View>
            <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
              <X size={20} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {!generatedRoutine ? (
              <View>
                {/* 1. Objetivo */}
                <Text style={styles.sectionLabel}>Objetivo Principal</Text>
                <View style={styles.pillsGrid}>
                  {[
                    { id: 'hypertrophy', label: 'Hipertrofia' },
                    { id: 'strength', label: 'Fuerza' },
                    { id: 'fat_loss', label: 'Definición' },
                    { id: 'recomp', label: 'Recomposición' },
                  ].map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      style={[styles.pillBtn, goal === item.id && styles.pillBtnActive]}
                      onPress={() => setGoal(item.id as any)}
                    >
                      <Text
                        style={[styles.pillBtnText, goal === item.id && styles.pillBtnTextActive]}
                      >
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* 2. Días y Duración */}
                <View style={styles.rowTwoCols}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.sectionLabel}>Días por semana</Text>
                    <View style={styles.counterRow}>
                      {[3, 4, 5, 6].map((d) => (
                        <TouchableOpacity
                          key={d}
                          style={[styles.numPill, daysCount === d && styles.numPillActive]}
                          onPress={() => setDaysCount(d)}
                        >
                          <Text
                            style={[
                              styles.numPillText,
                              daysCount === d && styles.numPillTextActive,
                            ]}
                          >
                            {d}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  <View style={{ flex: 1.2 }}>
                    <Text style={styles.sectionLabel}>Tiempo disponible</Text>
                    <View style={styles.counterRow}>
                      {[30, 45, 60, 75].map((m) => (
                        <TouchableOpacity
                          key={m}
                          style={[styles.numPill, durationMins === m && styles.numPillActive]}
                          onPress={() => setDurationMins(m)}
                        >
                          <Text
                            style={[
                              styles.numPillText,
                              durationMins === m && styles.numPillTextActive,
                            ]}
                          >
                            {m}m
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                </View>

                {/* 3. Equipamiento */}
                <Text style={[styles.sectionLabel, { marginTop: 16 }]}>Equipamiento</Text>
                <View style={styles.pillsWrap}>
                  {[
                    'Gimnasio Comercial',
                    'Solo Mancuernas',
                    'Casa / Peso Corporal',
                    'Bandas & Mancuernas',
                  ].map((eq) => (
                    <TouchableOpacity
                      key={eq}
                      style={[styles.pillBtn, equipment === eq && styles.pillBtnActive]}
                      onPress={() => setEquipment(eq)}
                    >
                      <Text
                        style={[
                          styles.pillBtnText,
                          equipment === eq && styles.pillBtnTextActive,
                        ]}
                      >
                        {eq}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* 4. Enfoque Muscular */}
                <Text style={[styles.sectionLabel, { marginTop: 16 }]}>Enfoque / Énfasis</Text>
                <View style={styles.pillsWrap}>
                  {[
                    'Torso (Pecho y Espalda)',
                    'Pierna Completa & Glúteo',
                    'Empuje (Pecho, Hombro, Tríceps)',
                    'Tracción (Espalda, Bíceps)',
                    'Full Body Equilibrado',
                  ].map((f) => (
                    <TouchableOpacity
                      key={f}
                      style={[styles.pillBtn, focusMuscles === f && styles.pillBtnActive]}
                      onPress={() => setFocusMuscles(f)}
                    >
                      <Text
                        style={[
                          styles.pillBtnText,
                          focusMuscles === f && styles.pillBtnTextActive,
                        ]}
                      >
                        {f}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* 5. Limitaciones / Molestias */}
                <Text style={[styles.sectionLabel, { marginTop: 16 }]}>
                  Limitaciones o molestias (Opcional)
                </Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Ej. Molestia en hombro con barra, sin sentadillas pesadas"
                  placeholderTextColor="#64748B"
                  value={avoidInjuries}
                  onChangeText={setAvoidInjuries}
                />

                {/* Botón Generar */}
                <TouchableOpacity
                  style={styles.generateBtn}
                  onPress={handleGenerate}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#0F172A" />
                  ) : (
                    <>
                      <Sparkles size={18} color="#0F172A" />
                      <Text style={styles.generateBtnText}>Generar Rutina con IA (~300ms)</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              /* ================= VISTA PREVIA DE RUTINA GENERADA ================= */
              <View style={styles.previewContainer}>
                <View style={styles.routineHeaderCard}>
                  <Text style={styles.routineTitle}>{generatedRoutine.name}</Text>
                  <Text style={styles.routineDesc}>{generatedRoutine.description}</Text>

                  <View style={styles.routineMetaRow}>
                    <View style={styles.metaBadge}>
                      <Clock size={13} color="#38BDF8" />
                      <Text style={styles.metaText}>{generatedRoutine.durationMinutes} min</Text>
                    </View>
                    <View style={styles.metaBadge}>
                      <Layers size={13} color="#38BDF8" />
                      <Text style={styles.metaText}>
                        {generatedRoutine.exercises.length} Ejercicios
                      </Text>
                    </View>
                  </View>
                </View>

                <Text style={styles.exercisesListTitle}>Ejercicios Programados:</Text>
                {generatedRoutine.exercises.map((ex, idx) => (
                  <View key={idx} style={styles.exerciseCard}>
                    <View style={styles.exCardTop}>
                      <Text style={styles.exIndexText}>{idx + 1}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.exName}>{ex.name}</Text>
                        {ex.notes && <Text style={styles.exNotes}>{ex.notes}</Text>}
                      </View>
                    </View>

                    <View style={styles.exParamsRow}>
                      <View style={styles.exParamBadge}>
                        <Text style={styles.exParamVal}>{ex.targetSets}</Text>
                        <Text style={styles.exParamLabel}>series</Text>
                      </View>
                      <View style={styles.exParamBadge}>
                        <Text style={styles.exParamVal}>{ex.targetReps}</Text>
                        <Text style={styles.exParamLabel}>reps</Text>
                      </View>
                      <View style={styles.exParamBadge}>
                        <Text style={styles.exParamVal}>{ex.restSeconds}s</Text>
                        <Text style={styles.exParamLabel}>descanso</Text>
                      </View>
                    </View>
                  </View>
                ))}

                <TouchableOpacity
                  style={styles.saveRoutineBtn}
                  onPress={handleSaveRoutine}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator color="#0F172A" />
                  ) : (
                    <>
                      <Check size={20} color="#0F172A" />
                      <Text style={styles.saveRoutineBtnText}>Guardar en Mis Rutinas</Text>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.retryBtn}
                  onPress={() => setGeneratedRoutine(null)}
                >
                  <Text style={styles.retryBtnText}>Modificar Parámetros</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#090D16',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '92%',
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  badgeText: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  headerTitle: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '700',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    padding: 20,
  },
  sectionLabel: {
    color: '#CBD5E1',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },
  pillsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  pillsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  pillBtn: {
    backgroundColor: '#0F172A',
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  pillBtnActive: {
    backgroundColor: '#0B2238',
    borderColor: '#0284C7',
  },
  pillBtnText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  pillBtnTextActive: {
    color: '#38BDF8',
    fontWeight: '700',
  },
  rowTwoCols: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  counterRow: {
    flexDirection: 'row',
    gap: 6,
  },
  numPill: {
    flex: 1,
    backgroundColor: '#0F172A',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  numPillActive: {
    backgroundColor: '#0B2238',
    borderColor: '#0284C7',
  },
  numPillText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '700',
  },
  numPillTextActive: {
    color: '#38BDF8',
  },
  textInput: {
    backgroundColor: '#0F172A',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#F8FAFC',
    fontSize: 13,
    borderWidth: 1,
    borderColor: '#1E293B',
    marginBottom: 20,
  },
  generateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#38BDF8',
    paddingVertical: 14,
    borderRadius: 14,
    marginBottom: 20,
  },
  generateBtnText: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '800',
  },
  previewContainer: {
    paddingBottom: 20,
  },
  routineHeaderCard: {
    backgroundColor: '#0F172A',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  routineTitle: {
    color: '#F8FAFC',
    fontSize: 17,
    fontWeight: '800',
  },
  routineDesc: {
    color: '#94A3B8',
    fontSize: 13,
    marginTop: 4,
    lineHeight: 18,
  },
  routineMetaRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0B2238',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  metaText: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '700',
  },
  exercisesListTitle: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 10,
  },
  exerciseCard: {
    backgroundColor: '#0F172A',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  exCardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 10,
  },
  exIndexText: {
    color: '#38BDF8',
    fontSize: 13,
    fontWeight: '800',
    backgroundColor: '#0B2238',
    width: 24,
    height: 24,
    borderRadius: 12,
    textAlign: 'center',
    lineHeight: 24,
  },
  exName: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '700',
  },
  exNotes: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 2,
  },
  exParamsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  exParamBadge: {
    flex: 1,
    backgroundColor: '#1E293B',
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
  },
  exParamVal: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '700',
  },
  exParamLabel: {
    color: '#94A3B8',
    fontSize: 9,
    marginTop: 1,
  },
  saveRoutineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#38BDF8',
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 10,
    marginBottom: 10,
  },
  saveRoutineBtnText: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '800',
  },
  retryBtn: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  retryBtnText: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '600',
  },
})
