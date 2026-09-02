import React, { useState, useMemo } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native'
import {
  TrendingUp,
  BarChart3,
  Flame,
  Activity,
  Award,
  ChevronRight,
  ArrowRight,
  Sparkles,
  Dumbbell,
} from 'lucide-react-native'
import AnatomicalBodyMap, { muscleVolumeSets } from '@/components/visuals/AnatomicalBodyMap'
import ExerciseIllustration from '@/components/visuals/ExerciseIllustration'
import ExerciseProgressView from '@/components/workout/ExerciseProgressView'
import ExerciseDetailModal from '@/components/workout/ExerciseDetailModal'
import { EXERCISE_DATABASE, ExerciseDefinition } from '@/constants/exerciseDatabase'
import Svg, { Path, Circle, Rect, Defs, LinearGradient, Stop } from 'react-native-svg'

function WeightLineChart({ data, height = 75 }: { data: number[]; height?: number }) {
  if (data.length < 2) return null
  const min = Math.min(...data) - 0.5
  const max = Math.max(...data) + 0.5
  const range = max - min || 1
  const W = 320
  const H = height

  const pts = data.map((v, i) => ({
    x: (i / (data.length - 1)) * (W - 16) + 8,
    y: H - ((v - min) / range) * (H * 0.75) - H * 0.12,
  }))

  const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')
  const areaPath = `${linePath} L ${W - 8} ${H} L 8 ${H} Z`

  return (
    <View style={{ width: '100%', height: H }}>
      <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
        <Defs>
          <LinearGradient id="wGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#38BDF8" stopOpacity="0.25" />
            <Stop offset="100%" stopColor="#38BDF8" stopOpacity="0" />
          </LinearGradient>
        </Defs>
        <Path d={areaPath} fill="url(#wGrad)" />
        <Path
          d={linePath}
          stroke="#38BDF8"
          strokeWidth="2.5"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {pts.map((p, i) => (
          <Circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={i === pts.length - 1 ? 4 : 2}
            fill="#38BDF8"
            opacity={i === pts.length - 1 ? 1 : 0.35}
          />
        ))}
      </Svg>
    </View>
  )
}

import { useBodyMeasurements } from '@/lib/hooks/useBodyMeasurements'
import { useWorkoutHistory } from '@/lib/hooks/useWorkout'
import { useAuth } from '@/lib/hooks/useAuth'

export default function ProgressScreen() {
  const { profile } = useAuth()
  const { measurements } = useBodyMeasurements()
  const { history } = useWorkoutHistory()

  const [selectedMuscle, setSelectedMuscle] = useState<string>('Pecho')
  const [activeExerciseForPR, setActiveExerciseForPR] = useState<ExerciseDefinition | null>(null)
  const [activeExerciseForInfo, setActiveExerciseForInfo] = useState<ExerciseDefinition | null>(null)

  // Only include exercises that the user has performed at least once in their workout history
  const userCompletedExercisesForMuscle = useMemo(() => {
    return EXERCISE_DATABASE.filter((ex) => {
      const matchesMuscle =
        ex.category.toLowerCase().includes(selectedMuscle.toLowerCase()) ||
        ex.muscleGroup.toLowerCase().includes(selectedMuscle.toLowerCase())

      if (!matchesMuscle) return false

      // Check if user has at least one recorded workout containing this exercise
      const exName = ex.name.toLowerCase().trim()
      const exId = ex.id.toLowerCase().trim()
      return history.some((w) =>
        w.exercises?.some((e) => {
          const eName = (e.name || '').toLowerCase().trim()
          return eName === exName || eName === exId || eName.includes(exName) || exName.includes(eName)
        })
      )
    })
  }, [selectedMuscle, history])

  // Real weight progression from measurements or initial onboarding weight
  const weightsFromMeasurements = measurements
    .map((m) => m.weightKg)
    .filter((w): w is number => typeof w === 'number' && w > 0)
    .reverse()

  const weightList = weightsFromMeasurements.length > 0
    ? weightsFromMeasurements
    : profile?.initial_weight_kg
    ? [profile.initial_weight_kg]
    : []

  const latestWeight = weightList.length > 0 ? weightList[weightList.length - 1] : 0
  const previousWeight = weightList.length > 1 ? weightList[0] : latestWeight
  const weeklyChange = weightList.length > 1 ? latestWeight - previousWeight : 0

  // Real weekly volume calculated from completed workout history (last 4 weeks)
  const now = new Date().getTime()
  const oneWeekMs = 7 * 24 * 60 * 60 * 1000

  const weeklyVolume = [
    { label: 'S-4', value: 0 },
    { label: 'S-3', value: 0 },
    { label: 'S-2', value: 0 },
    { label: 'Esta', value: 0 },
  ]

  // Real sets per muscle in the last 7 days
  const userMuscleVolumeSets: Record<string, { sets: number; status: 'optimal' | 'moderate' | 'low' | 'none' }> = {
    'Pecho': { sets: 0, status: 'none' },
    'Dorsales': { sets: 0, status: 'none' },
    'Hombros': { sets: 0, status: 'none' },
    'Bíceps': { sets: 0, status: 'none' },
    'Tríceps': { sets: 0, status: 'none' },
    'Cuádriceps': { sets: 0, status: 'none' },
    'Isquiotibiales': { sets: 0, status: 'none' },
    'Glúteos': { sets: 0, status: 'none' },
    'Gemelos': { sets: 0, status: 'none' },
    'Abdomen': { sets: 0, status: 'none' },
    'Trapecios': { sets: 0, status: 'none' },
    'Espalda Baja': { sets: 0, status: 'none' },
  }

  history.forEach((w) => {
    const wDate = new Date(w.finishedAt || w.date).getTime()
    const diffWeeks = Math.floor((now - wDate) / oneWeekMs)
    const vol = w.volumeKg || 0
    if (diffWeeks === 0) weeklyVolume[3].value += vol
    else if (diffWeeks === 1) weeklyVolume[2].value += vol
    else if (diffWeeks === 2) weeklyVolume[1].value += vol
    else if (diffWeeks === 3) weeklyVolume[0].value += vol

    // Accumulate sets in last 7 days
    if (now - wDate <= oneWeekMs) {
      w.exercises?.forEach((ex) => {
        const mg = ex.muscleGroup || 'Pecho'
        let targetKey = 'Pecho'
        if (mg.includes('Pecho')) targetKey = 'Pecho'
        else if (mg.includes('Espalda') || mg.includes('Dorsal')) targetKey = 'Dorsales'
        else if (mg.includes('Hombro')) targetKey = 'Hombros'
        else if (mg.includes('Bícep')) targetKey = 'Bíceps'
        else if (mg.includes('Trícep')) targetKey = 'Tríceps'
        else if (mg.includes('Cuádricep') || mg.includes('Pierna')) targetKey = 'Cuádriceps'
        else if (mg.includes('Isquio') || mg.includes('Femoral')) targetKey = 'Isquiotibiales'
        else if (mg.includes('Glúteo')) targetKey = 'Glúteos'
        else if (mg.includes('Gemelo') || mg.includes('Pantorrilla')) targetKey = 'Gemelos'
        else if (mg.includes('Abdomen') || mg.includes('Abs')) targetKey = 'Abdomen'
        else if (mg.includes('Trapecio')) targetKey = 'Trapecios'
        else if (mg.includes('Lumba')) targetKey = 'Espalda Baja'

        if (userMuscleVolumeSets[targetKey]) {
          userMuscleVolumeSets[targetKey].sets += ex.sets || 0
        }
      })
    }
  })

  // Update status
  Object.keys(userMuscleVolumeSets).forEach((k) => {
    const s = userMuscleVolumeSets[k].sets
    if (s >= 12) userMuscleVolumeSets[k].status = 'optimal'
    else if (s >= 6) userMuscleVolumeSets[k].status = 'moderate'
    else if (s >= 1) userMuscleVolumeSets[k].status = 'low'
    else userMuscleVolumeSets[k].status = 'none'
  })

  const currentMuscleStats = userMuscleVolumeSets[selectedMuscle] || { sets: 0, status: 'none' }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerSub}>ANALÍTICA DE RENDIMIENTO</Text>
          <Text style={styles.headerTitle}>Progreso</Text>
        </View>

        {/* ── Anatomical Body Map Card (Frente / Espalda) ── */}
        <View style={styles.bodyMapCard}>
          <View style={styles.bodyMapCardHeader}>
            <Text style={styles.bodyMapTitle}>VOLUMEN MUSCULAR SEMANAL</Text>
            <Text style={styles.bodyMapSub}>
              Toca un grupo muscular para ver sus ejercicios y récords
            </Text>
          </View>

          {/* Volume Status Legend */}
          <View style={styles.volumeLegendRow}>
            {[
              { label: 'Óptimo (≥12 series)', color: '#EF4444' },
              { label: 'Moderado (6-11)', color: '#F59E0B' },
              { label: 'Bajo (1-5)', color: '#6B7280' },
            ].map(({ label, color }) => (
              <View key={label} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: color }]} />
                <Text style={styles.legendLabel}>{label}</Text>
              </View>
            ))}
          </View>

          {/* Body Map SVG Dual: Frente y Espalda Side-by-Side */}
          <View style={styles.bodyMapCenter}>
            <AnatomicalBodyMap
              selectedMuscle={selectedMuscle}
              onMuscleSelect={(m) => setSelectedMuscle(m)}
              userVolumeSets={userMuscleVolumeSets}
            />
          </View>

          {/* Selected Muscle Header & Sets info */}
          <View style={styles.selectedMuscleBanner}>
            <View>
              <Text style={styles.selectedMuscleTitle}>{selectedMuscle}</Text>
              <Text style={styles.selectedMuscleSub}>
                {currentMuscleStats.sets} series efectivas esta semana
              </Text>
            </View>

            <View
              style={[
                styles.optimalPill,
                currentMuscleStats.status === 'optimal'
                  ? { backgroundColor: 'rgba(239,68,68,0.12)', borderColor: 'rgba(239,68,68,0.3)' }
                  : currentMuscleStats.status === 'moderate'
                  ? { backgroundColor: 'rgba(245,158,11,0.12)', borderColor: 'rgba(245,158,11,0.3)' }
                  : currentMuscleStats.status === 'low'
                  ? { backgroundColor: 'rgba(107,114,128,0.12)', borderColor: 'rgba(107,114,128,0.3)' }
                  : { backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' },
              ]}
            >
              <Text
                style={[
                  styles.optimalPillText,
                  currentMuscleStats.status === 'optimal'
                    ? { color: '#EF4444' }
                    : currentMuscleStats.status === 'moderate'
                    ? { color: '#F59E0B' }
                    : currentMuscleStats.status === 'low'
                    ? { color: '#9CA3AF' }
                    : { color: 'rgba(255,255,255,0.4)' },
                ]}
              >
                {currentMuscleStats.status === 'optimal'
                  ? 'Óptimo'
                  : currentMuscleStats.status === 'moderate'
                  ? 'Moderado'
                  : currentMuscleStats.status === 'low'
                  ? 'Bajo'
                  : '0 series'}
              </Text>
            </View>
          </View>

          {/* Exercises for the selected muscle (Only completed at least once) */}
          <View style={styles.muscleExercisesList}>
            {userCompletedExercisesForMuscle.length === 0 ? (
              <View style={styles.emptyMuscleBox}>
                <View style={styles.emptyMuscleIconBox}>
                  <Dumbbell size={22} color="#38BDF8" />
                </View>
                <Text style={styles.emptyMuscleTitle}>Sin ejercicios registrados</Text>
                <Text style={styles.emptyMuscleSub}>
                  Los récords y estadísticas de {selectedMuscle.toLowerCase()} aparecerán aquí una vez que completes tu primer entrenamiento con este grupo muscular.
                </Text>
              </View>
            ) : (
              userCompletedExercisesForMuscle.map((ex) => (
                <TouchableOpacity
                  key={ex.id}
                  style={styles.muscleExCard}
                  onPress={() => setActiveExerciseForPR(ex)}
                  activeOpacity={0.8}
                >
                  <ExerciseIllustration
                    exerciseId={ex.id}
                    exerciseName={ex.name}
                    imageUrl={ex.imageUrl}
                    size={42}
                    variant="circle-thumb"
                  />

                  <View style={styles.muscleExLeft}>
                    <Text style={styles.muscleExName}>{ex.name}</Text>
                    <Text style={styles.muscleExMeta}>
                      Récord registrado · Toca para ver marcas
                    </Text>
                  </View>

                  <View style={styles.muscleExRight}>
                    <View style={styles.viewPRBadge}>
                      <Text style={styles.viewPRBadgeText}>Ver Progreso</Text>
                      <ArrowRight size={13} color="#38BDF8" />
                    </View>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
        </View>

        {/* ── Weight Progression Card ── */}
        <View style={styles.chartCard}>
          <View style={styles.chartCardHeader}>
            <Text style={styles.chartTitle}>PESO CORPORAL</Text>
            <Text
              style={[
                styles.chartBadge,
                { color: weeklyChange >= 0 ? '#38BDF8' : '#EF4444' },
              ]}
            >
              {weeklyChange >= 0 ? '+' : ''}
              {weeklyChange.toFixed(1)} kg esta semana
            </Text>
          </View>

          <View style={styles.weightNumberRow}>
            <Text style={styles.weightNumber}>{latestWeight > 0 ? latestWeight : '—'}</Text>
            {latestWeight > 0 && <Text style={styles.weightUnit}>kg</Text>}
          </View>

          {weightList.length >= 2 ? (
            <>
              <WeightLineChart data={weightList} height={75} />
              <View style={styles.chartFooter}>
                <Text style={styles.chartFooterText}>Primer registro</Text>
                <Text style={styles.chartFooterText}>Actual</Text>
              </View>
            </>
          ) : (
            <View style={{ paddingVertical: 14, alignItems: 'center' }}>
              <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>
                {latestWeight > 0
                  ? 'Registra un nuevo peso en Perfil para ver tu curva de evolución'
                  : 'Sin registros de peso corporal aún'}
              </Text>
            </View>
          )}
        </View>

        {/* ── Weekly Volume Bars ── */}
        <View style={styles.chartCard}>
          <View style={styles.chartCardHeader}>
            <Text style={styles.chartTitle}>VOLUMEN SEMANAL</Text>
            <Text style={styles.volumeBadge}>
              {(weeklyVolume[3].value / 1000).toFixed(1)}t
            </Text>
          </View>

          <View style={styles.volumeBarContainer}>
            <Svg width="100%" height="80" viewBox="0 0 280 80">
              {weeklyVolume.map((d, i) => {
                const max = Math.max(...weeklyVolume.map((v) => v.value)) * 1.15
                const bh = (d.value / max) * 70
                const bw = 46
                const gap = (280 - bw * weeklyVolume.length) / (weeklyVolume.length + 1)
                const x = gap + i * (bw + gap)
                const isLast = i === weeklyVolume.length - 1

                return (
                  <Rect
                    key={i}
                    x={x}
                    y={80 - bh}
                    width={bw}
                    height={bh}
                    rx="8"
                    fill={isLast ? '#2563EB' : 'rgba(37,99,235,0.25)'}
                  />
                )
              })}
            </Svg>

            <View style={styles.volumeLabelsRow}>
              {weeklyVolume.map((d, i) => (
                <View key={i} style={{ alignItems: 'center' }}>
                  <Text style={styles.volumeLabelText}>{d.label}</Text>
                  <Text
                    style={[
                      styles.volumeValText,
                      i === weeklyVolume.length - 1 && { color: '#38BDF8' },
                    ]}
                  >
                    {(d.value / 1000).toFixed(1)}t
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>

      {/* ── Exercise Progress View (Matching "Visualiza tu progreso" reference) ── */}
      <ExerciseProgressView
        exercise={activeExerciseForPR}
        visible={!!activeExerciseForPR}
        onClose={() => setActiveExerciseForPR(null)}
      />

      {/* ── Exercise Detail Modal ── */}
      <ExerciseDetailModal
        exercise={activeExerciseForInfo}
        visible={!!activeExerciseForInfo}
        onClose={() => setActiveExerciseForInfo(null)}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#080A10',
  },
  content: {
    padding: 16,
    gap: 16,
    paddingBottom: 60,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 8 : 4,
  },
  headerSub: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '900',
    marginTop: 2,
  },
  bodyMapCard: {
    backgroundColor: '#10131E',
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    gap: 14,
  },
  bodyMapCardHeader: {
    gap: 2,
  },
  bodyMapTitle: {
    color: '#38BDF8',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  bodyMapSub: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
  },
  volumeLegendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendLabel: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 10.5,
    fontWeight: '600',
  },
  bodyMapCenter: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  selectedMuscleBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#161B28',
    borderRadius: 16,
    padding: 14,
    marginTop: 6,
  },
  selectedMuscleTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
  },
  selectedMuscleSub: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
    marginTop: 2,
  },
  optimalPill: {
    backgroundColor: 'rgba(56,189,248,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(56,189,248,0.3)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  optimalPillText: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '800',
  },
  muscleExercisesList: {
    gap: 8,
  },
  emptyMuscleBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    padding: 24,
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  emptyMuscleIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyMuscleTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptyMuscleSub: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 12.5,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 290,
  },
  muscleExCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#141824',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
  },
  muscleExLeft: {
    flex: 1,
    gap: 2,
  },
  muscleExName: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  muscleExMeta: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 11,
  },
  muscleExRight: {},
  viewPRBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(56,189,248,0.1)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  viewPRBadgeText: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '700',
  },
  chartCard: {
    backgroundColor: '#10131E',
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    gap: 8,
  },
  chartCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chartTitle: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  chartBadge: {
    fontSize: 11,
    fontWeight: '700',
  },
  weightNumberRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginVertical: 4,
  },
  weightNumber: {
    color: '#FFFFFF',
    fontSize: 38,
    fontWeight: '900',
    lineHeight: 42,
  },
  weightUnit: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 16,
  },
  chartFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  chartFooterText: {
    color: 'rgba(255,255,255,0.2)',
    fontSize: 10,
  },
  volumeBadge: {
    color: '#38BDF8',
    fontSize: 13,
    fontWeight: '800',
  },
  volumeBarContainer: {
    marginTop: 8,
  },
  volumeLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 6,
  },
  volumeLabelText: {
    color: 'rgba(255,255,255,0.25)',
    fontSize: 10,
  },
  volumeValText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
})
