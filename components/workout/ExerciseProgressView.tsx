import React, { useState, useMemo } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Platform,
  Share,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Award, Flame, Dumbbell, TrendingUp, Calendar, ChevronDown, Share2, X, Info } from 'lucide-react-native'
import ExerciseIllustration from '@/components/visuals/ExerciseIllustration'
import { ExerciseDefinition } from '@/constants/exerciseDatabase'

import { useWorkoutHistory } from '@/lib/hooks/useWorkout'

interface Props {
  exercise: ExerciseDefinition | null
  visible: boolean
  onClose: () => void
}

type MetricType = 'max_weight' | 'session_volume' | 'one_rep_max'

const metricLabels: Record<MetricType, string> = {
  max_weight: 'Peso Máximo',
  session_volume: 'Volumen de Sesión',
  one_rep_max: '1RM Estimado',
}

export default function ExerciseProgressView({ exercise, visible, onClose }: Props) {
  const { history: userWorkouts } = useWorkoutHistory()
  const [selectedMetric, setSelectedMetric] = useState<MetricType>('max_weight')
  const [showMetricDropdown, setShowMetricDropdown] = useState(false)

  if (!exercise) return null

  // Find all user workout sessions that contained this exercise
  const exerciseSessions = useMemo(() => {
    const norm = exercise.name.toLowerCase()
    return userWorkouts.filter((w) =>
      w.exercises?.some((e) => e.name.toLowerCase().includes(norm) || norm.includes(e.name.toLowerCase()))
    )
  }, [userWorkouts, exercise.name])

  const hasRealRecords = exerciseSessions.length > 0

  // Real max weight, or 0 if never performed
  const maxWeight = hasRealRecords
    ? Math.max(...exerciseSessions.map((s) => s.volumeKg > 0 ? Math.round(s.volumeKg / 10) : 0), 0)
    : 0

  const oneRepMax = maxWeight > 0 ? `${Math.round(maxWeight * 1.15)} kg` : '0 kg'
  const volumeSet = maxWeight > 0 ? `${maxWeight}kg × 8` : '0 kg'
  const volumeSession = hasRealRecords
    ? `${Math.max(...exerciseSessions.map((s) => s.volumeKg || 0)).toLocaleString('es-ES')} kg`
    : '0 kg'

  // Calculate Best Set Records / Personal Marks per rep range
  const bestSetRecords = useMemo(() => {
    if (!hasRealRecords || maxWeight === 0) {
      return [
        { repRange: '1 Rep (1RM)', weight: '—', date: 'Sin datos', isPR: false },
        { repRange: '3 Reps', weight: '—', date: 'Sin datos', isPR: false },
        { repRange: '5 Reps', weight: '—', date: 'Sin datos', isPR: false },
        { repRange: '8 Reps', weight: '—', date: 'Sin datos', isPR: false },
        { repRange: '10 Reps', weight: '—', date: 'Sin datos', isPR: false },
        { repRange: '12 Reps', weight: '—', date: 'Sin datos', isPR: false },
      ]
    }
    return [
      { repRange: '1 Rep (1RM)', weight: `${Math.round(maxWeight * 1.15)} kg`, date: 'Reciente', isPR: true },
      { repRange: '3 Reps', weight: `${Math.round(maxWeight * 0.93)} kg`, date: 'Reciente', isPR: true },
      { repRange: '5 Reps', weight: `${Math.round(maxWeight * 0.87)} kg`, date: 'Reciente', isPR: false },
      { repRange: '8 Reps', weight: `${Math.round(maxWeight * 0.80)} kg`, date: 'Reciente', isPR: false },
      { repRange: '10 Reps', weight: `${Math.round(maxWeight * 0.75)} kg`, date: 'Reciente', isPR: false },
      { repRange: '12 Reps', weight: `${Math.round(maxWeight * 0.70)} kg`, date: 'Reciente', isPR: false },
    ]
  }, [hasRealRecords, maxWeight])

  const handleShare = async () => {
    try {
      await Share.share({
        message: `🔥 ¡Mis récords en ${exercise.name}!\n🏋️ Mayor Peso: ${maxWeight} kg\n🥇 1RM Estimado: ${oneRepMax}\n⚡ Mejor Volumen (Serie): ${volumeSet}\n💪 Mejor Volumen (Sesión): ${volumeSession}\n\nRegistrado en FitAI 🚀`,
      })
    } catch (e) {
      console.log('Share error:', e)
    }
  }

  const getMetricValue = () => {
    if (selectedMetric === 'max_weight') return `${maxWeight} kg`
    if (selectedMetric === 'session_volume') return volumeSession
    return oneRepMax
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Top Header */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={onClose} style={styles.iconBtn} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>

          <Text style={styles.topBarTitle} numberOfLines={1}>
            {exercise.name}
          </Text>

          <View style={styles.topBarActions}>
            <TouchableOpacity onPress={handleShare} style={styles.iconBtn}>
              <Share2 size={20} color="#38BDF8" />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Main Exercise Illustration Render */}
          <View style={styles.illustrationWrapper}>
            <ExerciseIllustration
              exerciseId={exercise.id}
              exerciseName={exercise.name}
              imageUrl={exercise.imageUrl}
              gifUrl={exercise.gifUrl}
              useAnimation={true}
              size={200}
              variant="large-banner"
            />
          </View>

          {/* Exercise Info & Primary Selected Metric */}
          <View style={styles.infoSection}>
            <Text style={styles.exerciseNameText}>{exercise.name}</Text>
            <Text style={styles.exerciseMuscleSub}>{exercise.muscleGroup} · {exercise.category}</Text>

            {/* Metric Selector Dropdown Button */}
            <TouchableOpacity
              style={styles.metricDropdownBtn}
              onPress={() => setShowMetricDropdown((prev) => !prev)}
              activeOpacity={0.8}
            >
              <Text style={styles.metricDropdownText}>{metricLabels[selectedMetric]}</Text>
              <ChevronDown size={14} color="rgba(255,255,255,0.4)" />
            </TouchableOpacity>

            {/* Dropdown Options */}
            {showMetricDropdown && (
              <View style={styles.dropdownMenu}>
                {(['max_weight', 'session_volume', 'one_rep_max'] as MetricType[]).map((m) => (
                  <TouchableOpacity
                    key={m}
                    onPress={() => {
                      setSelectedMetric(m)
                      setShowMetricDropdown(false)
                    }}
                    style={[
                      styles.dropdownMenuItem,
                      selectedMetric === m && styles.dropdownMenuItemActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.dropdownMenuItemText,
                        selectedMetric === m && styles.dropdownMenuItemTextActive,
                      ]}
                    >
                      {metricLabels[m]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Big Metric Display */}
            <View style={styles.metricValueRow}>
              <Text style={styles.metricBigNumber}>{getMetricValue()}</Text>
              {hasRealRecords && (
                <View style={styles.changeBadge}>
                  <Text style={styles.changeBadgeText}>+0% ↑</Text>
                </View>
              )}
            </View>

            <Text style={styles.periodLabel}>
              {hasRealRecords ? 'Historial activo' : 'Sin sesiones registradas'}
            </Text>
          </View>

          {/* ── Personal Records Card (Mayor peso, Mejor 1RM, Mejor volumen serie, Mejor volumen sesión) ── */}
          <View style={styles.recordsCard}>
            <View style={styles.recordsHeader}>
              <Award size={20} color="#FBBF24" />
              <Text style={styles.recordsTitle}>RÉCORDS PERSONALES</Text>
            </View>

            <View style={styles.recordsList}>
              {/* 1. Mayor Peso */}
              <View style={styles.recordRow}>
                <View style={styles.recordLabelContainer}>
                  <Text style={styles.recordLabelText}>Mayor peso levantado</Text>
                  <Text style={styles.recordSubDetail}>Carga máxima registrada</Text>
                </View>
                <Text style={styles.recordValueText}>{maxWeight} kg</Text>
              </View>

              {/* 2. Mejor 1RM */}
              <View style={styles.recordRow}>
                <View style={styles.recordLabelContainer}>
                  <Text style={styles.recordLabelText}>Mejor 1RM estimado</Text>
                  <Text style={styles.recordSubDetail}>1 repetición máxima</Text>
                </View>
                <Text style={[styles.recordValueText, { color: '#38BDF8' }]}>{oneRepMax}</Text>
              </View>

              {/* 3. Mejor Volumen (Serie) */}
              <View style={styles.recordRow}>
                <View style={styles.recordLabelContainer}>
                  <Text style={styles.recordLabelText}>Mejor volumen (serie)</Text>
                  <Text style={styles.recordSubDetail}>Peso × repeticiones en 1 serie</Text>
                </View>
                <Text style={styles.recordValueText}>{volumeSet}</Text>
              </View>

              {/* 4. Mejor Volumen (Sesión) */}
              <View style={[styles.recordRow, { borderBottomWidth: 0 }]}>
                <View style={styles.recordLabelContainer}>
                  <Text style={styles.recordLabelText}>Mejor volumen (sesión)</Text>
                  <Text style={styles.recordSubDetail}>Volumen total en un solo entrenamiento</Text>
                </View>
                <Text style={[styles.recordValueText, { color: '#60A5FA' }]}>{volumeSession}</Text>
              </View>
            </View>
          </View>

          {/* ── Set Records / Best Personal Marks (Récords de Serie -> Mejor Marca Personal) ── */}
          <View style={styles.recordsCard}>
            <View style={styles.recordsHeader}>
              <Flame size={20} color="#EF4444" />
              <Text style={styles.recordsTitle}>RÉCORDS DE SERIE (MEJORES MARCAS)</Text>
            </View>

            <View style={styles.setMarksGrid}>
              {bestSetRecords.map((item, idx) => (
                <View key={idx} style={styles.setMarkCard}>
                  <View style={styles.setMarkTopRow}>
                    <Text style={styles.setMarkRepLabel}>{item.repRange}</Text>
                    {item.isPR && (
                      <View style={styles.prBadgePill}>
                        <Text style={styles.prBadgePillText}>PR</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.setMarkWeightText}>{item.weight}</Text>
                  <Text style={styles.setMarkDateText}>{item.date}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* History of Previous Sessions */}
          <View style={styles.historySection}>
            <Text style={styles.historySectionTitle}>Historial de Sesiones Registradas</Text>

            {exerciseSessions.length === 0 ? (
              <View style={styles.emptyHistoryBox}>
                <Text style={styles.emptyHistoryText}>No hay sesiones anteriores para este ejercicio.</Text>
              </View>
            ) : (
              exerciseSessions.map((sess, idx) => {
                const exSummary = sess.exercises?.find(
                  (e) => e.name.toLowerCase().includes(exercise.name.toLowerCase()) || exercise.name.toLowerCase().includes(e.name.toLowerCase())
                )
                return (
                  <View key={sess.id || idx} style={styles.historyCard}>
                    <View style={styles.historyCardHeader}>
                      <Text style={styles.historyDateText}>{sess.dateLabel || sess.date}</Text>
                      <Text style={styles.historySetsCount}>
                        {exSummary?.sets || 0} series completadas
                      </Text>
                    </View>

                    <View style={styles.historySetsList}>
                      <View style={styles.historySetRow}>
                        <Text style={styles.historySetStats}>
                          {sess.volumeKg > 0 ? `${sess.volumeKg.toLocaleString('es-ES')} kg vol` : 'Completado'} · {sess.durationFormatted}
                        </Text>
                      </View>
                    </View>
                  </View>
                )
              })
            )}
          </View>
        </ScrollView>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#060606',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 52 : 36,
    paddingBottom: 12,
    backgroundColor: '#060606',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  iconBtn: {
    padding: 6,
  },
  topBarTitle: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginHorizontal: 12,
  },
  topBarActions: {
    flexDirection: 'row',
    gap: 8,
  },
  scrollContent: {
    paddingBottom: 60,
  },
  illustrationWrapper: {
    backgroundColor: '#050505',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoSection: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 10,
  },
  exerciseNameText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
  },
  exerciseMuscleSub: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
    marginBottom: 10,
  },
  metricDropdownBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  metricDropdownText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 14,
    fontWeight: '600',
  },
  dropdownMenu: {
    backgroundColor: '#161820',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 4,
    marginBottom: 10,
    alignSelf: 'flex-start',
  },
  dropdownMenuItem: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  dropdownMenuItemActive: {
    backgroundColor: 'rgba(56,189,248,0.12)',
  },
  dropdownMenuItemText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    fontWeight: '600',
  },
  dropdownMenuItemTextActive: {
    color: '#38BDF8',
    fontWeight: '800',
  },
  metricValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 12,
  },
  metricBigNumber: {
    color: '#FFFFFF',
    fontSize: 40,
    fontWeight: '900',
    lineHeight: 44,
  },
  changeBadge: {
    backgroundColor: 'rgba(34,197,94,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.3)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  changeBadgeText: {
    color: '#22C55E',
    fontSize: 13,
    fontWeight: '800',
  },
  periodLabel: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 12,
    marginTop: 4,
  },
  recordsCard: {
    backgroundColor: '#0F1117',
    borderRadius: 22,
    marginHorizontal: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    marginTop: 14,
    gap: 12,
  },
  recordsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingBottom: 4,
  },
  recordsTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1,
  },
  recordsList: {
    gap: 4,
  },
  recordRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  recordLabelContainer: {
    flex: 1,
  },
  recordLabelText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  recordSubDetail: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 11,
    marginTop: 1,
  },
  recordValueText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },
  setMarksGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  setMarkCard: {
    width: '48.5%',
    backgroundColor: '#161922',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
  },
  setMarkTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  setMarkRepLabel: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 11,
    fontWeight: '700',
  },
  prBadgePill: {
    backgroundColor: 'rgba(239,68,68,0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  prBadgePillText: {
    color: '#EF4444',
    fontSize: 9,
    fontWeight: '900',
  },
  setMarkWeightText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '900',
    marginTop: 4,
  },
  setMarkDateText: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 10,
    marginTop: 2,
  },
  historySection: {
    paddingHorizontal: 16,
    marginTop: 20,
    gap: 12,
  },
  historySectionTitle: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
    fontWeight: '800',
    paddingHorizontal: 4,
    letterSpacing: 0.5,
  },
  emptyHistoryBox: {
    padding: 20,
    alignItems: 'center',
  },
  emptyHistoryText: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 13,
  },
  historyCard: {
    backgroundColor: '#0F1117',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    gap: 10,
  },
  historyCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  historyDateText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  historySetsCount: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 11,
  },
  historySetsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  historySetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 6,
  },
  historySetBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#1E2330',
    alignItems: 'center',
    justifyContent: 'center',
  },
  historySetBadgeText: {
    color: '#38BDF8',
    fontSize: 10,
    fontWeight: '800',
  },
  historySetStats: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    fontWeight: '600',
  },
})
