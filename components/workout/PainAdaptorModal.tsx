import React, { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native'
import {
  ShieldAlert,
  Sparkles,
  Check,
  X,
  Zap,
  ArrowRight,
  Activity,
  Dumbbell,
  Info,
} from 'lucide-react-native'
import { aiService } from '@/lib/services/ai'
import { PainAdaptorResult } from '@/lib/services/ai/types'
import { EXERCISE_DATABASE, ExerciseDefinition } from '@/constants/exerciseDatabase'

interface PainAdaptorModalProps {
  visible: boolean
  onClose: () => void
  currentExerciseName: string
  onApplyReplacement: (
    newExercise: ExerciseDefinition,
    sets: number,
    reps: string,
    notes: string
  ) => void
}

const COMMON_PAIN_AREAS = [
  'Hombro',
  'Rodilla',
  'Espalda Baja / Lumbar',
  'Codo',
  'Muñeca',
  'Cadera',
  'Cuello / Cervical',
]

const EQUIPMENT_OPTIONS = [
  'Gimnasio Comercial',
  'Solo Mancuernas',
  'Poleas / Cables',
  'Máquinas Guiadas',
  'Peso Corporal',
]

export default function PainAdaptorModal({
  visible,
  onClose,
  currentExerciseName,
  onApplyReplacement,
}: PainAdaptorModalProps) {
  const [selectedArea, setSelectedArea] = useState('Hombro')
  const [painLevel, setPainLevel] = useState(6)
  const [selectedEquipment, setSelectedEquipment] = useState('Gimnasio Comercial')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<PainAdaptorResult | null>(null)
  const [matchedDbExercise, setMatchedDbExercise] = useState<ExerciseDefinition | null>(null)

  const handleAdapt = async () => {
    setLoading(true)
    try {
      const { data } = await aiService.adaptExerciseForPain({
        exerciseName: currentExerciseName,
        painLocation: selectedArea,
        painIntensity: painLevel,
        availableEquipment: [selectedEquipment],
      })

      setResult(data)

      // Buscar ejercicio en la base de datos local para asociar imagen y detalles
      const suggestedName = data.suggestedExercise.name.toLowerCase()
      const found =
        EXERCISE_DATABASE.find((e) => suggestedName.includes(e.name.toLowerCase())) ||
        EXERCISE_DATABASE.find((e) => e.target.toLowerCase() === data.suggestedExercise.targetMuscles[0]?.toLowerCase()) ||
        EXERCISE_DATABASE[0]

      setMatchedDbExercise(found)
    } catch (err: any) {
      Alert.alert('Error', err.message || 'No se pudo generar la variante de reemplazo.')
    } finally {
      setLoading(false)
    }
  }

  const handleConfirm = () => {
    if (!result) return

    const base = matchedDbExercise || EXERCISE_DATABASE[0]
    const exerciseToUse: ExerciseDefinition = {
      ...base,
      id: `pain-var-${Date.now()}`,
      name: result.suggestedExercise.name || base.name,
      equipment: result.suggestedExercise.equipment || base.equipment,
      target: result.suggestedExercise.targetMuscles[0] || base.target,
      instructions: {
        ...base.instructions,
        setup: result.setupAdjustments[0] || base.instructions.setup,
        execution: result.setupAdjustments[1] || base.instructions.execution,
        tips: result.biomechanicalReason,
        allSteps: result.setupAdjustments?.length ? result.setupAdjustments : base.instructions.allSteps,
      },
      defaultSets: result.replacementSets || 3,
      defaultReps: result.replacementReps || '10-12',
      defaultRestSec: result.suggestedRestSeconds || 90,
    }

    onApplyReplacement(
      exerciseToUse,
      result.replacementSets,
      result.replacementReps,
      result.biomechanicalReason
    )
    handleClose()
  }

  const handleClose = () => {
    setResult(null)
    setMatchedDbExercise(null)
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
                <ShieldAlert size={14} color="#F59E0B" />
                <Text style={styles.badgeText}>PAIN ADAPTOR EN VIVO</Text>
              </View>
              <Text style={styles.headerTitle}>Adaptar por Molestia o Dolor</Text>
              <Text style={styles.currentExSubtitle}>Ejercicio actual: {currentExerciseName}</Text>
            </View>
            <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
              <X size={20} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {!result ? (
              <View>
                {/* 1. Selector de Zona de Molestia */}
                <Text style={styles.sectionLabel}>¿Dónde sientes la molestia?</Text>
                <View style={styles.pillsWrap}>
                  {COMMON_PAIN_AREAS.map((area) => (
                    <TouchableOpacity
                      key={area}
                      style={[styles.pillBtn, selectedArea === area && styles.pillBtnActive]}
                      onPress={() => setSelectedArea(area)}
                    >
                      <Text
                        style={[
                          styles.pillBtnText,
                          selectedArea === area && styles.pillBtnTextActive,
                        ]}
                      >
                        {area}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* 2. Selector de Intensidad de Dolor (1 a 10) */}
                <Text style={[styles.sectionLabel, { marginTop: 18 }]}>
                  Intensidad del dolor: <Text style={styles.painScoreText}>{painLevel} / 10</Text>
                </Text>
                <View style={styles.painLevelsRow}>
                  {[2, 4, 6, 8, 10].map((lvl) => (
                    <TouchableOpacity
                      key={lvl}
                      style={[
                        styles.painLvlBtn,
                        painLevel === lvl && styles.painLvlBtnActive,
                        lvl >= 8 && styles.painLvlHigh,
                      ]}
                      onPress={() => setPainLevel(lvl)}
                    >
                      <Text
                        style={[
                          styles.painLvlText,
                          painLevel === lvl && styles.painLvlTextActive,
                        ]}
                      >
                        {lvl === 2
                          ? 'Leve'
                          : lvl === 4
                          ? 'Moderado'
                          : lvl === 6
                          ? 'Molesto'
                          : lvl === 8
                          ? 'Fuerte'
                          : 'Severo'}
                      </Text>
                      <Text style={styles.painLvlSub}>{lvl}/10</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* 3. Equipamiento Disponible */}
                <Text style={[styles.sectionLabel, { marginTop: 18 }]}>Equipamiento disponible:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.equipScroll}>
                  {EQUIPMENT_OPTIONS.map((eq) => (
                    <TouchableOpacity
                      key={eq}
                      style={[styles.equipPill, selectedEquipment === eq && styles.equipPillActive]}
                      onPress={() => setSelectedEquipment(eq)}
                    >
                      <Dumbbell
                        size={14}
                        color={selectedEquipment === eq ? '#38BDF8' : '#64748B'}
                      />
                      <Text
                        style={[
                          styles.equipPillText,
                          selectedEquipment === eq && styles.equipPillTextActive,
                        ]}
                      >
                        {eq}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {/* Botón de Análisis */}
                <TouchableOpacity
                  style={styles.analyzeBtn}
                  onPress={handleAdapt}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#0F172A" />
                  ) : (
                    <>
                      <Sparkles size={18} color="#0F172A" />
                      <Text style={styles.analyzeBtnText}>Buscar Variante Segura (~300ms)</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              /* ================= RESULTADO DE ADAPTACIÓN ================= */
              <View style={styles.resultContainer}>
                {/* Comparación Visual */}
                <View style={styles.comparisonCard}>
                  <View style={styles.exComparisonBox}>
                    <Text style={styles.exCompLabel}>ANTERIOR (CON MOLESTIA)</Text>
                    <Text style={styles.exCompOldName}>{currentExerciseName}</Text>
                  </View>

                  <View style={styles.arrowDivider}>
                    <ArrowRight size={20} color="#38BDF8" />
                  </View>

                  <View style={[styles.exComparisonBox, styles.exCompNewBox]}>
                    <Text style={[styles.exCompLabel, { color: '#38BDF8' }]}>
                      VARIANTE RECOMENDADA
                    </Text>
                    <Text style={styles.exCompNewName}>
                      {result.suggestedExercise.name}
                    </Text>
                    <Text style={styles.exCompEquipment}>
                      Equipamiento: {result.suggestedExercise.equipment}
                    </Text>
                  </View>
                </View>

                {/* Explicación Biomecánica */}
                <View style={styles.reasonCard}>
                  <View style={styles.reasonTitleRow}>
                    <Activity size={16} color="#38BDF8" />
                    <Text style={styles.reasonTitle}>Por qué esta variante es segura:</Text>
                  </View>
                  <Text style={styles.reasonText}>{result.biomechanicalReason}</Text>
                </View>

                {/* Ajustes de Configuración */}
                <View style={styles.cuesCard}>
                  <Text style={styles.cuesTitle}>Puntos clave de ejecución:</Text>
                  {result.setupAdjustments.map((cue, idx) => (
                    <View key={idx} style={styles.cueItemRow}>
                      <Text style={styles.cueBullet}>•</Text>
                      <Text style={styles.cueText}>{cue}</Text>
                    </View>
                  ))}
                </View>

                {/* Parámetros de Series y Reps Sugeridos */}
                <View style={styles.paramsCard}>
                  <View style={styles.paramBox}>
                    <Text style={styles.paramVal}>{result.replacementSets}</Text>
                    <Text style={styles.paramLabel}>Series</Text>
                  </View>
                  <View style={styles.paramBox}>
                    <Text style={styles.paramVal}>{result.replacementReps}</Text>
                    <Text style={styles.paramLabel}>Reps objetivo</Text>
                  </View>
                  <View style={styles.paramBox}>
                    <Text style={styles.paramVal}>{result.suggestedRestSeconds}s</Text>
                    <Text style={styles.paramLabel}>Descanso</Text>
                  </View>
                </View>

                {/* Botón Aplicar */}
                <TouchableOpacity style={styles.applyBtn} onPress={handleConfirm}>
                  <Check size={20} color="#0F172A" />
                  <Text style={styles.applyBtnText}>Reemplazar Ejercicio en la Sesión</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.retryBtn}
                  onPress={() => setResult(null)}
                >
                  <Text style={styles.retryBtnText}>Modificar Opciones</Text>
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
    maxHeight: '90%',
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
    color: '#F59E0B',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  headerTitle: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '700',
  },
  currentExSubtitle: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 2,
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
    marginBottom: 10,
  },
  painScoreText: {
    color: '#F59E0B',
    fontWeight: '800',
  },
  pillsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
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
    backgroundColor: '#78350F30',
    borderColor: '#F59E0B',
  },
  pillBtnText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  pillBtnTextActive: {
    color: '#FDE68A',
    fontWeight: '700',
  },
  painLevelsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  painLvlBtn: {
    flex: 1,
    backgroundColor: '#0F172A',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  painLvlBtnActive: {
    backgroundColor: '#78350F30',
    borderColor: '#F59E0B',
  },
  painLvlHigh: {
    borderColor: '#EF444430',
  },
  painLvlText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '700',
  },
  painLvlTextActive: {
    color: '#F59E0B',
  },
  painLvlSub: {
    color: '#64748B',
    fontSize: 9,
    marginTop: 2,
  },
  equipScroll: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  equipPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0F172A',
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  equipPillActive: {
    backgroundColor: '#0B2238',
    borderColor: '#0284C7',
  },
  equipPillText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  equipPillTextActive: {
    color: '#38BDF8',
    fontWeight: '700',
  },
  analyzeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#38BDF8',
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 10,
    marginBottom: 20,
  },
  analyzeBtnText: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '800',
  },
  resultContainer: {
    paddingBottom: 20,
  },
  comparisonCard: {
    backgroundColor: '#0F172A',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  exComparisonBox: {
    marginBottom: 10,
  },
  exCompNewBox: {
    marginTop: 10,
    marginBottom: 0,
  },
  exCompLabel: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  exCompOldName: {
    color: '#94A3B8',
    fontSize: 14,
    textDecorationLine: 'line-through',
  },
  exCompNewName: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '800',
  },
  exCompEquipment: {
    color: '#38BDF8',
    fontSize: 12,
    marginTop: 2,
  },
  arrowDivider: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  reasonCard: {
    backgroundColor: '#0B2238',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#0284C740',
  },
  reasonTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  reasonTitle: {
    color: '#38BDF8',
    fontSize: 13,
    fontWeight: '700',
  },
  reasonText: {
    color: '#CBD5E1',
    fontSize: 12,
    lineHeight: 18,
  },
  cuesCard: {
    backgroundColor: '#0F172A',
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  cuesTitle: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },
  cueItemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginBottom: 4,
  },
  cueBullet: {
    color: '#38BDF8',
    fontSize: 14,
    fontWeight: '800',
  },
  cueText: {
    color: '#94A3B8',
    fontSize: 12,
    flex: 1,
    lineHeight: 17,
  },
  paramsCard: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  paramBox: {
    flex: 1,
    backgroundColor: '#1E293B',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  paramVal: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '800',
  },
  paramLabel: {
    color: '#94A3B8',
    fontSize: 10,
    marginTop: 2,
  },
  applyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#38BDF8',
    paddingVertical: 14,
    borderRadius: 14,
    marginBottom: 10,
  },
  applyBtnText: {
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
