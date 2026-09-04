import React, { useState, useMemo } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native'
import { Image } from 'expo-image'
import {
  TrendingUp,
  BarChart3,
  Flame,
  Activity,
  Award,
  ChevronRight,
  ChevronLeft,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Dumbbell,
  Plus,
  Scale,
  X,
  Check,
  Calendar,
  Percent,
} from 'lucide-react-native'
import AnatomicalBodyMap, { muscleVolumeSets } from '@/components/visuals/AnatomicalBodyMap'
import ExerciseIllustration from '@/components/visuals/ExerciseIllustration'
import ExerciseProgressView from '@/components/workout/ExerciseProgressView'
import ExerciseDetailModal from '@/components/workout/ExerciseDetailModal'
import { EXERCISE_DATABASE, ExerciseDefinition } from '@/constants/exerciseDatabase'
import Svg, { Path, Circle, Rect, Defs, LinearGradient, Stop } from 'react-native-svg'
import { useBodyMeasurements } from '@/lib/hooks/useBodyMeasurements'
import { useWorkoutHistory } from '@/lib/hooks/useWorkout'
import { useAuth } from '@/lib/hooks/useAuth'

const MUSCLE_LIST = [
  'Pecho',
  'Dorsales',
  'Hombros',
  'Bíceps',
  'Tríceps',
  'Cuádriceps',
  'Isquiotibiales',
  'Glúteos',
  'Gemelos',
  'Abdomen',
  'Trapecios',
  'Espalda Baja',
]

const MUSCLE_SYNONYMS: Record<string, string[]> = {
  Pecho: ['pecho', 'pectoral', 'chest'],
  Dorsales: ['espalda', 'dorsal', 'dorsales', 'back', 'lats'],
  Hombros: ['hombro', 'hombros', 'deltoides', 'shoulders'],
  Bíceps: ['bícep', 'biceps', 'bicep', 'brazo'],
  Tríceps: ['trícep', 'triceps', 'tricep'],
  Cuádriceps: ['cuádricep', 'cuadriceps', 'pierna', 'quads', 'quadriceps'],
  Isquiotibiales: ['isquio', 'isquiotibiales', 'femoral', 'hamstrings'],
  Glúteos: ['glúteo', 'gluteo', 'gluteos', 'glúteos', 'glutes'],
  Gemelos: ['gemelo', 'gemelos', 'pantorrilla', 'pantorrillas', 'calves'],
  Abdomen: ['abdomen', 'abdominales', 'abs', 'core'],
  Trapecios: ['trapecio', 'trapecios', 'traps'],
  'Espalda Baja': ['espalda baja', 'lumbar', 'lumbares', 'lower back'],
}

const matchesSelectedMuscle = (category: string, muscleGroup: string, selected: string) => {
  const syns = MUSCLE_SYNONYMS[selected] || [selected.toLowerCase()]
  const c = (category || '').toLowerCase()
  const m = (muscleGroup || '').toLowerCase()
  return syns.some((s) => c.includes(s) || m.includes(s))
}

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

export default function ProgressScreen() {
  const { profile } = useAuth()
  const { measurements, addMeasurement } = useBodyMeasurements()
  const { history } = useWorkoutHistory()

  const [selectedMuscle, setSelectedMuscle] = useState<string>('Pecho')
  const [exerciseTab, setExerciseTab] = useState<'completed' | 'all'>('completed')
  const [activeExerciseForPR, setActiveExerciseForPR] = useState<ExerciseDefinition | null>(null)
  const [activeExerciseForInfo, setActiveExerciseForInfo] = useState<ExerciseDefinition | null>(null)

  // Weight Logging Modal State
  const [showLogWeightModal, setShowLogWeightModal] = useState(false)
  const [weightInput, setWeightInput] = useState('')
  const [fatInput, setFatInput] = useState('')
  const [muscleInput, setMuscleInput] = useState('')
  const [notesInput, setNotesInput] = useState('')
  const [isSavingWeight, setIsSavingWeight] = useState(false)

  // Exercises completed by user for the selected muscle
  const userCompletedExercisesForMuscle = useMemo(() => {
    return EXERCISE_DATABASE.filter((ex) => {
      const matchesMuscle = matchesSelectedMuscle(ex.category, ex.muscleGroup, selectedMuscle)
      if (!matchesMuscle) return false

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

  // All catalog exercises for the selected muscle
  const allExercisesForMuscle = useMemo(() => {
    return EXERCISE_DATABASE.filter((ex) =>
      matchesSelectedMuscle(ex.category, ex.muscleGroup, selectedMuscle)
    )
  }, [selectedMuscle])

  // Real weight progression from measurements or initial onboarding weight
  const weightsFromMeasurements = measurements
    .map((m) => m.weightKg)
    .filter((w): w is number => typeof w === 'number' && w > 0)
    .reverse()

  const weightList =
    weightsFromMeasurements.length > 0
      ? weightsFromMeasurements
      : profile?.initial_weight_kg
      ? [profile.initial_weight_kg]
      : []

  const latestMeasurement = measurements.length > 0 ? measurements[0] : null
  const latestWeight = latestMeasurement?.weightKg || (weightList.length > 0 ? weightList[weightList.length - 1] : 0)
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
    Pecho: { sets: 0, status: 'none' },
    Dorsales: { sets: 0, status: 'none' },
    Hombros: { sets: 0, status: 'none' },
    Bíceps: { sets: 0, status: 'none' },
    Tríceps: { sets: 0, status: 'none' },
    Cuádriceps: { sets: 0, status: 'none' },
    Isquiotibiales: { sets: 0, status: 'none' },
    Glúteos: { sets: 0, status: 'none' },
    Gemelos: { sets: 0, status: 'none' },
    Abdomen: { sets: 0, status: 'none' },
    Trapecios: { sets: 0, status: 'none' },
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

  const handleSaveWeight = async () => {
    const wVal = parseFloat(weightInput.replace(',', '.'))
    if (isNaN(wVal) || wVal <= 20 || wVal >= 350) {
      Alert.alert('Peso inválido', 'Por favor ingresa un peso válido en kg (ej: 75.5)')
      return
    }

    setIsSavingWeight(true)
    const fatVal = fatInput ? parseFloat(fatInput.replace(',', '.')) : null
    const muscleVal = muscleInput ? parseFloat(muscleInput.replace(',', '.')) : null

    await addMeasurement({
      date: new Date().toISOString().split('T')[0],
      weightKg: wVal,
      bodyFatPct: !isNaN(fatVal as number) ? fatVal : null,
      muscleMassPct: !isNaN(muscleVal as number) ? muscleVal : null,
      notes: notesInput.trim() || null,
    })

    setIsSavingWeight(false)
    setShowLogWeightModal(false)
    setWeightInput('')
    setFatInput('')
    setMuscleInput('')
    setNotesInput('')
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerSub}>ANALÍTICA DE RENDIMIENTO</Text>
          <Text style={styles.headerTitle}>Progreso</Text>
        </View>

        {/* ── 1. Anatomical Body Map Card (Frente / Espalda) ── */}
        <View style={styles.bodyMapCard}>
          <View style={styles.bodyMapCardHeader}>
            <Text style={styles.bodyMapTitle}>VOLUMEN MUSCULAR SEMANAL</Text>
            <Text style={styles.bodyMapSub}>
              Toca un músculo en el mapa o en las etiquetas para analizar su rendimiento
            </Text>
          </View>

          {/* Interactive Muscle Pills Selector Row */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.musclePillsScroll}
          >
            {MUSCLE_LIST.map((m) => {
              const isSelected = selectedMuscle === m
              const setsCount = userMuscleVolumeSets[m]?.sets || 0
              return (
                <TouchableOpacity
                  key={m}
                  style={[styles.musclePill, isSelected && styles.musclePillActive]}
                  onPress={() => setSelectedMuscle(m)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.musclePillText, isSelected && styles.musclePillTextActive]}>
                    {m}
                    {setsCount > 0 ? (
                      <Text
                        style={[
                          styles.musclePillSets,
                          isSelected && styles.musclePillSetsActive,
                        ]}
                      >
                        {` ${setsCount}s`}
                      </Text>
                    ) : null}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </ScrollView>

          {/* Volume Status Legend (Exact 3-column layout) */}
          <View style={styles.volumeLegendRow}>
            <View style={styles.legendColumn}>
              <View style={styles.legendDotRow}>
                <View style={[styles.legendDot, { backgroundColor: '#38BDF8' }]} />
                <Text style={styles.legendTitle}>Óptimo</Text>
              </View>
              <Text style={styles.legendSub}>(≥12 series)</Text>
            </View>

            <View style={styles.legendColumn}>
              <View style={styles.legendDotRow}>
                <View style={[styles.legendDot, { backgroundColor: '#F59E0B' }]} />
                <Text style={styles.legendTitle}>Moderado</Text>
              </View>
              <Text style={styles.legendSub}>(6-11)</Text>
            </View>

            <View style={styles.legendColumn}>
              <View style={styles.legendDotRow}>
                <View style={[styles.legendDot, { backgroundColor: '#71717A' }]} />
                <Text style={styles.legendTitle}>Bajo</Text>
              </View>
              <Text style={styles.legendSub}>(1-5)</Text>
            </View>
          </View>

          {/* Body Map SVG Dual: Frente y Espalda Side-by-Side */}
          <View style={styles.bodyMapCenter}>
            <AnatomicalBodyMap
              selectedMuscle={selectedMuscle}
              onMuscleSelect={(m) => setSelectedMuscle(m)}
              userVolumeSets={userMuscleVolumeSets}
            />
          </View>
        </View>

        {/* ── 2. Muscle Detail & Exercise Catalog (Image 2 style, directly below anatomical models) ── */}
        <View style={styles.muscleDetailSection}>
          {/* Muscle Summary Card */}
          <View style={styles.detailSummaryCard}>
            <View style={styles.detailSummaryTop}>
              <Text style={styles.detailMuscleName}>{selectedMuscle}</Text>
              <View
                style={[
                  styles.optimalPill,
                  currentMuscleStats.status === 'optimal'
                    ? { backgroundColor: 'rgba(56,189,248,0.12)', borderColor: 'rgba(56,189,248,0.35)' }
                    : currentMuscleStats.status === 'moderate'
                    ? { backgroundColor: 'rgba(245,158,11,0.12)', borderColor: 'rgba(245,158,11,0.35)' }
                    : currentMuscleStats.status === 'low'
                    ? { backgroundColor: 'rgba(113,113,122,0.15)', borderColor: 'rgba(113,113,122,0.35)' }
                    : { backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' },
                ]}
              >
                <Text
                  style={[
                    styles.optimalPillText,
                    currentMuscleStats.status === 'optimal'
                      ? { color: '#38BDF8' }
                      : currentMuscleStats.status === 'moderate'
                      ? { color: '#F59E0B' }
                      : currentMuscleStats.status === 'low'
                      ? { color: '#A1A1AA' }
                      : { color: 'rgba(255,255,255,0.4)' },
                  ]}
                >
                  {currentMuscleStats.status === 'optimal'
                    ? 'Óptimo (≥12)'
                    : currentMuscleStats.status === 'moderate'
                    ? 'Moderado (6-11)'
                    : currentMuscleStats.status === 'low'
                    ? 'Bajo (1-5)'
                    : '0 series'}
                </Text>
              </View>
            </View>

            <Text style={styles.detailSetsText}>
              <Text style={styles.detailSetsBold}>{currentMuscleStats.sets}</Text> series efectivas esta semana
            </Text>
          </View>

          {/* Segmented Control Tabs (Mis Ejercicios vs Todos) */}
          <View style={styles.segmentedTabsContainer}>
            <TouchableOpacity
              style={[
                styles.segmentedTab,
                exerciseTab === 'completed' && styles.segmentedTabActive,
              ]}
              onPress={() => setExerciseTab('completed')}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.segmentedTabText,
                  exerciseTab === 'completed' && styles.segmentedTabTextActive,
                ]}
              >
                Mis Ejercicios ({userCompletedExercisesForMuscle.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.segmentedTab,
                exerciseTab === 'all' && styles.segmentedTabActive,
              ]}
              onPress={() => setExerciseTab('all')}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.segmentedTabText,
                  exerciseTab === 'all' && styles.segmentedTabTextActive,
                ]}
              >
                Todos ({allExercisesForMuscle.length})
              </Text>
            </TouchableOpacity>
          </View>

          {/* Exercise List */}
          <View style={styles.muscleExercisesList}>
            {exerciseTab === 'completed' ? (
              userCompletedExercisesForMuscle.length === 0 ? (
                <View style={styles.emptyMuscleBox}>
                  <View style={styles.emptyMuscleIconBox}>
                    <Dumbbell size={24} color="#38BDF8" />
                  </View>
                  <Text style={styles.emptyMuscleTitle}>Sin ejercicios registrados</Text>
                  <Text style={styles.emptyMuscleSub}>
                    Los ejercicios de {selectedMuscle.toLowerCase()} aparecerán aquí en cuanto registres un entrenamiento. Explora las variantes en la pestaña "Todos".
                  </Text>
                </View>
              ) : (
                userCompletedExercisesForMuscle.map((ex) => {
                  const thumbUri =
                    ex.imageUrl ||
                    'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/images/0001-2gPfomN.jpg'

                  return (
                    <TouchableOpacity
                      key={ex.id}
                      style={styles.exerciseCard}
                      onPress={() => setActiveExerciseForPR(ex)}
                      activeOpacity={0.85}
                    >
                      <View style={styles.exerciseThumbBox}>
                        <Image
                          source={{ uri: thumbUri }}
                          style={styles.exerciseThumbImage}
                          contentFit="contain"
                          transition={150}
                          cachePolicy="memory-disk"
                        />
                      </View>

                      <View style={styles.exerciseCardContent}>
                        <Text style={styles.exerciseCardTitle} numberOfLines={1}>
                          {ex.name}
                        </Text>
                        <Text style={styles.exerciseCardSubtitle} numberOfLines={1}>
                          {ex.equipment || 'Mancuerna'} · Ver marcas y PRs
                        </Text>
                      </View>

                      <View style={styles.exerciseCardRight}>
                        <View style={styles.viewProgressPill}>
                          <Text style={styles.viewProgressText}>Ver Progreso</Text>
                          <ChevronRight size={14} color="#38BDF8" />
                        </View>
                      </View>
                    </TouchableOpacity>
                  )
                })
              )
            ) : (
              allExercisesForMuscle.map((ex) => {
                const thumbUri =
                  ex.imageUrl ||
                  'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/images/0001-2gPfomN.jpg'

                return (
                  <TouchableOpacity
                    key={ex.id}
                    style={styles.exerciseCard}
                    onPress={() => setActiveExerciseForPR(ex)}
                    activeOpacity={0.85}
                  >
                    <View style={styles.exerciseThumbBox}>
                      <Image
                        source={{ uri: thumbUri }}
                        style={styles.exerciseThumbImage}
                        contentFit="contain"
                        transition={150}
                        cachePolicy="memory-disk"
                      />
                    </View>

                    <View style={styles.exerciseCardContent}>
                      <Text style={styles.exerciseCardTitle} numberOfLines={1}>
                        {ex.name}
                      </Text>
                      <Text style={styles.exerciseCardSubtitle} numberOfLines={1}>
                        {ex.category} · {ex.equipment || 'General'}
                      </Text>
                    </View>

                    <View style={styles.exerciseCardRight}>
                      <View style={styles.viewProgressPill}>
                        <Text style={styles.viewProgressText}>Ver Progreso</Text>
                        <ChevronRight size={14} color="#38BDF8" />
                      </View>
                    </View>
                  </TouchableOpacity>
                )
              })
            )}
          </View>
        </View>

        {/* ── 3. Weight Progression Card ── */}
        <View style={styles.chartCard}>
          <View style={styles.chartCardHeader}>
            <View>
              <Text style={styles.chartTitle}>PESO CORPORAL & COMPOSICIÓN</Text>
              <Text
                style={[
                  styles.chartBadge,
                  { color: weeklyChange >= 0 ? '#38BDF8' : '#10B981' },
                ]}
              >
                {weeklyChange >= 0 ? '+' : ''}
                {weeklyChange.toFixed(1)} kg evolución
              </Text>
            </View>

            <TouchableOpacity
              style={styles.logWeightBtn}
              onPress={() => {
                setWeightInput(latestWeight > 0 ? latestWeight.toString() : '')
                setFatInput(latestMeasurement?.bodyFatPct ? latestMeasurement.bodyFatPct.toString() : '')
                setMuscleInput(latestMeasurement?.muscleMassPct ? latestMeasurement.muscleMassPct.toString() : '')
                setShowLogWeightModal(true)
              }}
              activeOpacity={0.8}
            >
              <Plus size={14} color="#000000" strokeWidth={2.5} />
              <Text style={styles.logWeightBtnText}>Registrar Peso</Text>
            </TouchableOpacity>
          </View>

          {/* Metric Stats Highlights */}
          <View style={styles.weightHighlightsRow}>
            <View style={styles.weightHighlightBox}>
              <Text style={styles.weightNumber}>
                {latestWeight > 0 ? latestWeight : '—'}
                {latestWeight > 0 && <Text style={styles.weightUnit}> kg</Text>}
              </Text>
              <Text style={styles.weightHighlightLabel}>Peso Actual</Text>
            </View>

            {latestMeasurement?.bodyFatPct ? (
              <View style={styles.weightHighlightBox}>
                <Text style={[styles.weightNumber, { color: '#F59E0B' }]}>
                  {latestMeasurement.bodyFatPct}%
                </Text>
                <Text style={styles.weightHighlightLabel}>Grasa Corporal</Text>
              </View>
            ) : null}

            {latestMeasurement?.muscleMassPct ? (
              <View style={styles.weightHighlightBox}>
                <Text style={[styles.weightNumber, { color: '#10B981' }]}>
                  {latestMeasurement.muscleMassPct}%
                </Text>
                <Text style={styles.weightHighlightLabel}>Masa Muscular</Text>
              </View>
            ) : null}
          </View>

          {weightList.length >= 2 ? (
            <>
              <WeightLineChart data={weightList} height={85} />
              <View style={styles.chartFooter}>
                <Text style={styles.chartFooterText}>Primer registro ({weightList[0]} kg)</Text>
                <Text style={styles.chartFooterText}>Actual ({latestWeight} kg)</Text>
              </View>
            </>
          ) : (
            <View style={{ paddingVertical: 14, alignItems: 'center' }}>
              <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12 }}>
                {latestWeight > 0
                  ? 'Registra un 2º peso para visualizar tu gráfica de evolución temporal'
                  : 'Sin registros de peso corporal aún. Toca "+ Registrar Peso"'}
              </Text>
            </View>
          )}
        </View>

        {/* ── 4. Weekly Volume Bars ── */}
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
                const max = Math.max(...weeklyVolume.map((v) => v.value)) * 1.15 || 1
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
                    fill={isLast ? '#38BDF8' : 'rgba(56,189,248,0.25)'}
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

      {/* ── Modal: Registrar Peso Corporal y Composición ── */}
      <Modal
        visible={showLogWeightModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowLogWeightModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />

            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Scale size={20} color="#38BDF8" />
                <Text style={styles.modalTitle}>Registrar Peso Corporal</Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowLogWeightModal(false)}
                style={styles.closeBtn}
              >
                <X size={18} color="rgba(255,255,255,0.6)" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
              {/* Peso (kg) Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Peso Corporal (kg) *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="ej: 78.5"
                  placeholderTextColor="rgba(255,255,255,0.25)"
                  keyboardType="numeric"
                  value={weightInput}
                  onChangeText={setWeightInput}
                />
              </View>

              {/* % Grasa y % Músculo */}
              <View style={styles.inputRow}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>% Grasa (opcional)</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="ej: 14.5"
                    placeholderTextColor="rgba(255,255,255,0.25)"
                    keyboardType="numeric"
                    value={fatInput}
                    onChangeText={setFatInput}
                  />
                </View>

                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>% Músculo (opcional)</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="ej: 42.0"
                    placeholderTextColor="rgba(255,255,255,0.25)"
                    keyboardType="numeric"
                    value={muscleInput}
                    onChangeText={setMuscleInput}
                  />
                </View>
              </View>

              {/* Notas Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Notas (opcional)</Text>
                <TextInput
                  style={[styles.textInput, { height: 60, textAlignVertical: 'top' }]}
                  placeholder="ej: En ayunas al despertar"
                  placeholderTextColor="rgba(255,255,255,0.25)"
                  multiline
                  value={notesInput}
                  onChangeText={setNotesInput}
                />
              </View>

              <TouchableOpacity
                style={styles.saveWeightBtn}
                onPress={handleSaveWeight}
                disabled={isSavingWeight}
                activeOpacity={0.85}
              >
                {isSavingWeight ? (
                  <ActivityIndicator color="#000000" />
                ) : (
                  <>
                    <Check size={18} color="#000000" strokeWidth={3} />
                    <Text style={styles.saveWeightBtnText}>GUARDAR REGISTRO</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

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
    backgroundColor: '#09090B',
  },
  content: {
    padding: 16,
    gap: 16,
    paddingBottom: 60,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 8 : 4,
    marginBottom: 4,
  },
  headerSub: {
    color: '#71717A',
    fontSize: 11.5,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  headerTitle: {
    color: '#FAFAFA',
    fontSize: 34,
    fontWeight: '900',
    marginTop: 2,
  },
  bodyMapCard: {
    backgroundColor: '#18181B',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#27272A',
    gap: 16,
  },
  bodyMapCardHeader: {
    gap: 4,
  },
  bodyMapTitle: {
    color: '#71717A',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  bodyMapSub: {
    color: '#A1A1AA',
    fontSize: 13.5,
    fontWeight: '500',
    lineHeight: 19,
  },
  musclePillsScroll: {
    gap: 8,
    paddingVertical: 2,
  },
  musclePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#27272A',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  musclePillActive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FFFFFF',
  },
  musclePillText: {
    color: '#A1A1AA',
    fontSize: 13.5,
    fontWeight: '600',
  },
  musclePillTextActive: {
    color: '#000000',
    fontWeight: '700',
  },
  musclePillSets: {
    color: '#71717A',
    fontSize: 13,
    fontWeight: '400',
  },
  musclePillSetsActive: {
    color: 'rgba(0,0,0,0.65)',
    fontWeight: '500',
  },
  volumeLegendRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 18,
    marginTop: 2,
    marginBottom: 4,
  },
  legendColumn: {
    alignItems: 'flex-start',
    gap: 2,
  },
  legendDotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  legendTitle: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 12.5,
    fontWeight: '600',
  },
  legendSub: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 11.5,
    fontWeight: '400',
    paddingLeft: 13,
  },
  bodyMapCenter: {
    alignItems: 'center',
    paddingVertical: 6,
  },

  /* ── Muscle Detail Section (Image 2 style) ── */
  muscleDetailSection: {
    gap: 12,
  },
  detailSummaryCard: {
    backgroundColor: '#18181B',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#27272A',
    gap: 10,
  },
  detailSummaryTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailMuscleName: {
    color: '#FAFAFA',
    fontSize: 24,
    fontWeight: '900',
  },
  optimalPill: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  optimalPillText: {
    fontSize: 11,
    fontWeight: '800',
  },
  detailSetsText: {
    color: '#A1A1AA',
    fontSize: 13,
  },
  detailSetsBold: {
    color: '#FAFAFA',
    fontWeight: '800',
  },
  segmentedTabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#18181B',
    borderRadius: 14,
    padding: 4,
    gap: 6,
    borderWidth: 1,
    borderColor: '#27272A',
  },
  segmentedTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  segmentedTabActive: {
    backgroundColor: '#FFFFFF',
  },
  segmentedTabText: {
    color: '#71717A',
    fontSize: 13,
    fontWeight: '700',
  },
  segmentedTabTextActive: {
    color: '#000000',
    fontWeight: '900',
  },
  muscleExercisesList: {
    gap: 10,
  },
  exerciseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#18181B',
    borderRadius: 18,
    padding: 12,
    borderWidth: 1,
    borderColor: '#27272A',
    gap: 12,
  },
  exerciseThumbBox: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  exerciseThumbImage: {
    width: '100%',
    height: '100%',
  },
  exerciseCardContent: {
    flex: 1,
    gap: 3,
  },
  exerciseCardTitle: {
    color: '#FAFAFA',
    fontSize: 15,
    fontWeight: '700',
  },
  exerciseCardSubtitle: {
    color: '#71717A',
    fontSize: 12,
    fontWeight: '500',
  },
  exerciseCardRight: {},
  viewProgressPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.25)',
  },
  viewProgressText: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '800',
  },
  emptyMuscleBox: {
    backgroundColor: '#18181B',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#27272A',
    padding: 28,
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  emptyMuscleIconBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyMuscleTitle: {
    color: '#FAFAFA',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptyMuscleSub: {
    color: '#71717A',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 290,
  },

  /* ── Weight & Volume Cards ── */
  chartCard: {
    backgroundColor: '#18181B',
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: '#27272A',
    gap: 12,
  },
  chartCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chartTitle: {
    color: '#A1A1AA',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  chartBadge: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  logWeightBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#38BDF8',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  logWeightBtnText: {
    color: '#000000',
    fontSize: 12,
    fontWeight: '800',
  },
  weightHighlightsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  weightHighlightBox: {
    flex: 1,
    backgroundColor: '#27272A',
    borderRadius: 14,
    padding: 10,
    alignItems: 'center',
  },
  weightNumber: {
    color: '#FAFAFA',
    fontSize: 22,
    fontWeight: '900',
  },
  weightUnit: {
    color: '#71717A',
    fontSize: 13,
  },
  weightHighlightLabel: {
    color: '#A1A1AA',
    fontSize: 10.5,
    fontWeight: '600',
    marginTop: 2,
  },
  chartFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  chartFooterText: {
    color: '#71717A',
    fontSize: 11,
    fontWeight: '600',
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
    color: '#71717A',
    fontSize: 10,
  },
  volumeValText: {
    color: '#A1A1AA',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },

  /* ── Modal: Registrar Peso ── */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#18181B',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 22,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    borderTopWidth: 1,
    borderColor: '#27272A',
    maxHeight: '90%',
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#27272A',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    color: '#FAFAFA',
    fontSize: 18,
    fontWeight: '800',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#27272A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputGroup: {
    marginBottom: 14,
    gap: 6,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
  },
  inputLabel: {
    color: '#A1A1AA',
    fontSize: 12,
    fontWeight: '600',
  },
  textInput: {
    backgroundColor: '#27272A',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    color: '#FAFAFA',
    fontSize: 15,
    fontWeight: '600',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  saveWeightBtn: {
    backgroundColor: '#38BDF8',
    borderRadius: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
    marginBottom: 10,
  },
  saveWeightBtnText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1,
  },
})
