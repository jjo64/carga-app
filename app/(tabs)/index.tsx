import React, { useState, useMemo } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Platform,
  Image,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useDashboard } from '@/lib/hooks/useDashboard'
import { useAuth } from '@/lib/hooks/useAuth'
import {
  useRoutines,
  useWorkoutHistory,
  parseRoutineDays,
} from '@/lib/hooks/useWorkout'
import { useNutrition } from '@/lib/hooks/useNutrition'
import { calculateDailyNutritionTargets } from '@/lib/utils/calories'
import { useSleep } from '@/lib/hooks/useSleep'
import { useSteps } from '@/lib/hooks/useSteps'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { calculateReadinessScore } from '@/lib/services/readinessService'
import { useGamification } from '@/lib/hooks/useGamification'
import ReadinessScoreCard from '@/components/recovery/ReadinessScoreCard'
import MorningSleepCheckinModal from '@/components/sleep/MorningSleepCheckinModal'
import MacroProgressRings from '@/components/visuals/MacroProgressRings'
import { CheckCircle2, Utensils, Scale, Flame, Zap } from 'lucide-react-native'
import { typography } from '@/constants/typography'

const mealLabel: Record<string, string> = {
  breakfast: 'Desayuno',
  lunch: 'Almuerzo',
  dinner: 'Cena',
  snack: 'Snack',
}

function calculateStreak(history: { date?: string; finishedAt?: string | null }[]): number {
  if (!history || history.length === 0) return 0
  const dates = Array.from(
    new Set(
      history
        .map((h) => h.date || (h.finishedAt ? h.finishedAt.split('T')[0] : ''))
        .filter(Boolean)
    )
  ).sort((a, b) => new Date(b).getTime() - new Date(a).getTime())

  if (dates.length === 0) return 0

  const today = new Date().toISOString().split('T')[0]
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]

  if (dates[0] !== today && dates[0] !== yesterday) {
    return 0
  }

  let streak = 1
  for (let i = 0; i < dates.length - 1; i++) {
    const curr = new Date(dates[i])
    const prev = new Date(dates[i + 1])
    const diffDays = Math.round((curr.getTime() - prev.getTime()) / (1000 * 3600 * 24))
    if (diffDays === 1) {
      streak++
    } else {
      break
    }
  }
  return streak
}

export default function DashboardScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { profile } = useAuth()
  const { metrics, loading, refetch } = useDashboard()
  const { routines } = useRoutines()
  const { history } = useWorkoutHistory()
  const { logs: todayLogs } = useNutrition()
  const { level } = useGamification()

  const todayDateObj = new Date()
  const rawWeekday = todayDateObj.toLocaleDateString('es-ES', { weekday: 'long' })
  const rawMonth = todayDateObj.toLocaleDateString('es-ES', { month: 'short' })
  const dayNum = todayDateObj.getDate()

  // Format: "Viernes, 18 Oct"
  const weekdayCap = rawWeekday.charAt(0).toUpperCase() + rawWeekday.slice(1)
  const monthCap = rawMonth.charAt(0).toUpperCase() + rawMonth.slice(1).replace('.', '')
  const todayFormatted = `${weekdayCap}, ${dayNum} ${monthCap}`

  const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
  const todayDayName = dayNames[todayDateObj.getDay()]

  const defaultTargets = calculateDailyNutritionTargets(profile)
  const consumed = metrics?.consumedCalories ?? 0
  const target = metrics?.targetCalories || defaultTargets.targetCalories
  const protein = metrics?.protein ?? 0
  const proteinTarget = metrics?.proteinTarget || defaultTargets.proteinTarget
  const carbs = metrics?.carbs ?? 0
  const carbsTarget = metrics?.carbsTarget || defaultTargets.carbsTarget
  const fat = metrics?.fat ?? 0
  const fatTarget = metrics?.fatTarget || defaultTargets.fatTarget

  // Check if completed workout today
  const todayDateStr = todayDateObj.toISOString().split('T')[0]
  const todayCompletedHistory = history.find(
    (w) => w.dateLabel === 'Hoy' || w.date === todayDateStr
  )

  const todayCompleted =
    todayCompletedHistory ||
    (metrics?.todayWorkout
      ? {
          routineName: metrics.todayWorkout.notes || 'Entrenamiento completado',
          durationMinutes: metrics.todayWorkout.duration_minutes || 45,
          volumeKg: metrics.todayWorkout.total_volume_kg || 0,
          recordsCount: 0,
        }
      : null)

  // ── Calculate Streak & Weekly Consistency Strip ──
  // ── Calculate Streak ──
  const currentStreak = useMemo(() => calculateStreak(history), [history])

  // Find routine assigned to today or first available
  const assignedTodayRoutine =
    routines.find((r) => {
      const days = parseRoutineDays(r)
      return days.includes(todayDayName)
    }) || (routines.length > 0 ? routines[0] : null)

  // Sleep & Steps & Readiness evaluation
  const { todayRecord: todaySleep, estimatedSleep, logSleep } = useSleep()
  const { todayRecord: todaySteps } = useSteps()
  const [sleepModalVisible, setSleepModalVisible] = useState(false)

  const readiness = calculateReadinessScore({
    todaySleep,
    estimatedSleepHours: todaySleep ? todaySleep.durationMinutes / 60 : 7.5,
    recentWorkouts: history,
    yesterdaySteps: todaySteps?.steps || 7000,
    yesterdayNutritionMet: true,
  })

  const handleSaveSleep = async (data: any) => {
    const today = new Date().toISOString().split('T')[0]
    await logSleep({
      date: today,
      bedtime: data.bedtime,
      wakeTime: data.wakeTime,
      durationMinutes: data.durationMinutes,
      qualityScore: data.qualityScore,
      awakeningsCount: data.awakeningsCount,
      deepSleepMinutes: data.deepSleepMinutes,
      remSleepMinutes: data.remSleepMinutes,
      source: 'manual_checkin',
    })
    setSleepModalVisible(false)
  }

  const userName = profile?.name || 'Diego'
  const userInitial = (profile?.name || 'D').charAt(0).toUpperCase()
  const exerciseCount = assignedTodayRoutine?.exercises?.length || 6
  const estimatedMinutes = Math.max(30, exerciseCount * 8 + 2)

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + 8,
            paddingBottom: insets.bottom + 48,
          },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={refetch}
            tintColor="#FAFAFA"
          />
        }
      >
        {/* ── 1. Header (Saludo + Fecha + Racha Badge + Avatar 40x40) ── */}
        <View style={styles.header}>
          <View style={styles.headerTextCol}>
            <Text style={styles.greetingTitle}>¡Hola, {userName}!</Text>
            <Text style={styles.dateSubtitle}>{todayFormatted}</Text>
          </View>

          <View style={styles.headerRightRow}>
            {/* Level Pill Badge */}
            <TouchableOpacity
              onPress={() => router.push('/(tabs)/profile')}
              style={styles.headerLevelBadge}
              activeOpacity={0.8}
            >
              <Zap size={13} color="#38BDF8" fill="#38BDF8" />
              <Text style={styles.headerLevelText}>Nv. {level}</Text>
            </TouchableOpacity>

            {/* Quick Streak Pill Badge */}
            <TouchableOpacity
              onPress={() => router.push('/(tabs)/profile')}
              style={[
                styles.headerStreakBadge,
                currentStreak > 0 && styles.headerStreakBadgeActive,
              ]}
              activeOpacity={0.8}
            >
              <Flame
                size={14}
                color={currentStreak > 0 ? '#F97316' : '#71717A'}
                fill={currentStreak > 0 ? '#F97316' : 'transparent'}
              />
              <Text
                style={[
                  styles.headerStreakText,
                  currentStreak > 0 && styles.headerStreakTextActive,
                ]}
              >
                {currentStreak} {currentStreak === 1 ? 'día' : 'días'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push('/(tabs)/profile')}
              style={styles.avatarBtn}
              activeOpacity={0.85}
            >
              {profile?.avatar_url ? (
                <Image source={{ uri: profile.avatar_url }} style={styles.avatarImg} />
              ) : (
                <Text style={styles.avatarInitial}>{userInitial}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* ── 2. Tarjeta Readiness & Recuperación ── */}
        <ReadinessScoreCard
          readiness={readiness}
          todaySleep={todaySleep}
          todaySteps={todaySteps}
          onOpenSleepModal={() => setSleepModalVisible(true)}
        />

        {/* ── 3. Tarjeta de Entrenamiento Activo (Monocromática) ── */}
        {todayCompleted ? (
          <View style={styles.sessionCardOuter}>
            <View style={styles.sessionLightBanner}>
              <View style={styles.completedHeaderRow}>
                <Text style={styles.sessionEyebrow}>SESIÓN COMPLETADA</Text>
                <CheckCircle2 size={16} color="#10B981" />
              </View>
              <Text style={styles.sessionTitle}>{todayCompleted.routineName}</Text>
              <Text style={styles.sessionMeta}>
                {todayCompleted.durationMinutes} mins • {(todayCompleted.volumeKg / 1000).toFixed(1)}t volumen
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.startSessionBtn, { backgroundColor: '#27272A' }]}
              onPress={() => router.push('/(tabs)/profile')}
              activeOpacity={0.85}
            >
              <Text style={[styles.startSessionBtnText, { color: '#FAFAFA' }]}>
                VER EN HISTORIAL
              </Text>
            </TouchableOpacity>
          </View>
        ) : assignedTodayRoutine ? (
          <View style={styles.sessionCardOuter}>
            {/* Top Chalk Banner with Dark Text */}
            <View style={styles.sessionLightBanner}>
              <Text style={styles.sessionEyebrow}>Siguiente Sesión:</Text>
              <Text style={styles.sessionTitle}>{assignedTodayRoutine.name}</Text>
              <Text style={styles.sessionMeta}>
                {exerciseCount} ejercicios • {estimatedMinutes} mins
              </Text>
            </View>

            {/* Solid Chalk White CTA Button */}
            <TouchableOpacity
              style={styles.startSessionBtn}
              onPress={() => router.push(`/workout/session/${assignedTodayRoutine.id}`)}
              activeOpacity={0.9}
            >
              <Text style={styles.startSessionBtnText}>COMENZAR ENTRENAMIENTO</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.sessionCardOuter}>
            <View style={styles.sessionLightBanner}>
              <Text style={styles.sessionEyebrow}>Siguiente Sesión:</Text>
              <Text style={styles.sessionTitle}>Día libre / Descanso</Text>
              <Text style={styles.sessionMeta}>Recuperación o entrenamiento libre</Text>
            </View>

            <TouchableOpacity
              style={styles.startSessionBtn}
              onPress={() => router.push('/(tabs)/workout')}
              activeOpacity={0.9}
            >
              <Text style={styles.startSessionBtnText}>VER RUTINAS</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── 4. Tarjeta Nutrición Progreso ── */}
        <MacroProgressRings
          calories={consumed}
          caloriesTarget={target}
          protein={protein}
          proteinTarget={proteinTarget}
          carbs={carbs}
          carbsTarget={carbsTarget}
          fat={fat}
          fatTarget={fatTarget}
          onPress={() => router.push('/(tabs)/nutrition')}
        />

        {/* ── 5. Comidas del Día ── */}
        <View style={styles.zincCard}>
          <View style={styles.cardHeaderRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Utensils size={15} color="#A1A1AA" />
              <Text style={styles.cardTitle}>Comidas del día</Text>
            </View>
            <Text style={styles.cardHeaderRightText}>{consumed} kcal</Text>
          </View>

          {todayLogs.length > 0 ? (
            <View style={styles.mealsList}>
              {todayLogs.slice(0, 3).map((m) => (
                <View key={m.id} style={styles.mealItemRow}>
                  <Text style={styles.mealItemName}>{mealLabel[m.meal_type] || 'Comida'}</Text>
                  <Text style={styles.mealItemCals}>{m.calories || 0} kcal</Text>
                </View>
              ))}
              {todayLogs.length > 3 && (
                <Text style={styles.moreMealsText}>
                  + {todayLogs.length - 3} comidas más
                </Text>
              )}
            </View>
          ) : (
            <View style={styles.emptyMealsBox}>
              <Text style={styles.emptyMealsText}>Sin comidas registradas hoy</Text>
              <TouchableOpacity
                onPress={() => router.push('/(tabs)/nutrition')}
                style={styles.quickAddMealBtn}
                activeOpacity={0.8}
              >
                <Text style={styles.quickAddMealBtnText}>+ REGISTRAR COMIDA</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* ── 6. Peso Corporal ── */}
        <View style={styles.zincCard}>
          <View style={styles.weightRow}>
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Scale size={15} color="#A1A1AA" />
                <Text style={styles.cardTitle}>Peso corporal</Text>
              </View>
              <View style={styles.weightNumRow}>
                <Text style={styles.weightBigNum}>
                  {profile?.weight_kg || profile?.initial_weight_kg || metrics?.currentWeightKg || '--'}
                </Text>
                <Text style={styles.weightUnit}>kg</Text>
              </View>
              <Text style={styles.weightSub}>
                {profile?.weight_kg || metrics?.currentWeightKg ? 'Registro activo' : 'Toca para registrar en Perfil'}
              </Text>
            </View>

            <TouchableOpacity
              onPress={() => router.push('/(tabs)/profile')}
              style={styles.weightDetailBtn}
              activeOpacity={0.8}
            >
              <Text style={styles.weightDetailBtnText}>DETALLES</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Morning Sleep Check-in Modal */}
      <MorningSleepCheckinModal
        visible={sleepModalVisible || !!estimatedSleep}
        estimated={estimatedSleep}
        onClose={() => setSleepModalVisible(false)}
        onSave={handleSaveSleep}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#09090B', // Zinc 950
  },
  container: {
    flex: 1,
    backgroundColor: '#09090B',
  },
  content: {
    paddingHorizontal: 20,
    gap: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  headerTextCol: {
    gap: 3,
  },
  greetingTitle: {
    ...typography.greeting,
  },
  dateSubtitle: {
    ...typography.headerDate,
  },
  headerRightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerLevelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 7,
  },
  headerLevelText: {
    color: '#38BDF8',
    fontSize: 12,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  headerStreakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#18181B',
    borderWidth: 1,
    borderColor: '#27272A',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  headerStreakBadgeActive: {
    borderColor: 'rgba(249, 115, 22, 0.35)',
    backgroundColor: 'rgba(249, 115, 22, 0.08)',
  },
  headerStreakText: {
    color: '#71717A',
    fontSize: 12,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  headerStreakTextActive: {
    color: '#FAFAFA',
    fontWeight: '800',
  },
  avatarBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#18181B',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
  },
  avatarInitial: {
    color: '#FAFAFA',
    fontSize: 16,
    fontWeight: '700',
  },
  sessionCardOuter: {
    backgroundColor: '#18181B', // Zinc 900
    borderRadius: 20,
    padding: 12,
    borderWidth: 1,
    borderColor: '#27272A',
  },
  sessionLightBanner: {
    backgroundColor: '#E4E4E7', // Chalk Light Texture background
    borderRadius: 14,
    padding: 16,
    gap: 4,
  },
  completedHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sessionEyebrow: {
    ...typography.workoutEyebrow,
  },
  sessionTitle: {
    ...typography.workoutTitle,
  },
  sessionMeta: {
    ...typography.workoutMeta,
  },
  startSessionBtn: {
    height: 48,
    borderRadius: 14,
    backgroundColor: '#FAFAFA', // Pure Chalk White
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  startSessionBtnText: {
    ...typography.buttonText,
  },
  zincCard: {
    backgroundColor: '#18181B',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#27272A',
    gap: 14,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTitle: {
    ...typography.cardTitle,
  },
  cardHeaderRightText: {
    color: '#A1A1AA',
    fontSize: 14,
    fontWeight: '600',
  },
  mealsList: {
    gap: 8,
  },
  mealItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  mealItemName: {
    color: '#FAFAFA',
    fontSize: 14,
    fontWeight: '600',
  },
  mealItemCals: {
    color: '#A1A1AA',
    fontSize: 13,
    fontWeight: '600',
  },
  moreMealsText: {
    color: '#71717A',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  emptyMealsBox: {
    alignItems: 'center',
    paddingVertical: 12,
    gap: 10,
  },
  emptyMealsText: {
    color: '#71717A',
    fontSize: 13,
  },
  quickAddMealBtn: {
    backgroundColor: '#27272A',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#3F3F46',
  },
  quickAddMealBtnText: {
    color: '#FAFAFA',
    fontSize: 12,
    fontWeight: '700',
  },
  weightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  weightNumRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginTop: 4,
  },
  weightBigNum: {
    color: '#FAFAFA',
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -0.5,
    fontVariant: ['tabular-nums'],
  },
  weightUnit: {
    color: '#71717A',
    fontSize: 16,
    fontWeight: '600',
  },
  weightSub: {
    color: '#71717A',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  weightDetailBtn: {
    backgroundColor: '#27272A',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#3F3F46',
  },
  weightDetailBtnText: {
    color: '#FAFAFA',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
})
