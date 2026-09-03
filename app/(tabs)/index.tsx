import React, { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Platform,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useDashboard } from '@/lib/hooks/useDashboard'
import { useAuth } from '@/lib/hooks/useAuth'
import {
  useRoutines,
  useWorkoutHistory,
  parseRoutineDays,
  cleanRoutineDescription,
  DEFAULT_STARTER_ROUTINES,
} from '@/lib/hooks/useWorkout'
import { Ionicons } from '@expo/vector-icons'
import ActivityRings from '@/components/visuals/ActivityRings'
import RoutineAnatomicalCover from '@/components/visuals/RoutineAnatomicalCover'
import Svg, { Polyline } from 'react-native-svg'

import { useNutrition } from '@/lib/hooks/useNutrition'
import { calculateDailyNutritionTargets } from '@/lib/utils/calories'
import { useSleep } from '@/lib/hooks/useSleep'
import { useSteps } from '@/lib/hooks/useSteps'
import { calculateReadinessScore } from '@/lib/services/readinessService'
import ReadinessScoreCard from '@/components/recovery/ReadinessScoreCard'
import MorningSleepCheckinModal from '@/components/sleep/MorningSleepCheckinModal'

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
  const { profile } = useAuth()
  const { metrics, loading, refetch } = useDashboard()
  const { routines } = useRoutines()
  const { history } = useWorkoutHistory()
  const { logs: todayLogs } = useNutrition()

  const todayDateObj = new Date()
  const todayFormatted = todayDateObj.toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
  })

  const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
  const todayDayName = dayNames[todayDateObj.getDay()]

  const hour = todayDateObj.getHours()
  const greeting = hour < 12 ? 'Buenos días' : hour < 19 ? 'Buenas tardes' : 'Buenas noches'

  const defaultTargets = calculateDailyNutritionTargets(profile)
  const consumed = metrics?.consumedCalories ?? 0
  const target = metrics?.targetCalories || defaultTargets.targetCalories
  const protein = metrics?.protein ?? 0
  const proteinTarget = metrics?.proteinTarget || defaultTargets.proteinTarget
  const carbs = metrics?.carbs ?? 0
  const carbsTarget = metrics?.carbsTarget || defaultTargets.carbsTarget
  const fat = metrics?.fat ?? 0
  const fatTarget = metrics?.fatTarget || defaultTargets.fatTarget
  const streak = calculateStreak(history)

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

  // Find routine assigned to today
  const assignedTodayRoutine =
    routines.find((r) => {
      const days = parseRoutineDays(r)
      return days.includes(todayDayName)
    }) || null

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

  return (
    <View style={{ flex: 1, backgroundColor: '#0A0A0A' }}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={loading}
          onRefresh={refetch}
          tintColor="#3B82F6"
        />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.dateText}>{todayFormatted}</Text>
          <Text style={styles.greetingTitle}>{greeting},</Text>
          <Text style={styles.userNameText}>
            {profile?.name || 'Alejandro'}
          </Text>

          {/* Fire Streak Badge */}
          <View style={styles.streakBadge}>
            <Text style={{ fontSize: 13 }}>🔥</Text>
            <Text style={styles.streakBadgeText}>{streak} días de racha</Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={() => router.push('/(tabs)/profile')}
          style={styles.avatarBtn}
          activeOpacity={0.85}
        >
          <Text style={styles.avatarInitial}>
            {(profile?.name || 'A').charAt(0).toUpperCase()}
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── AI Readiness & Recovery Score Card (Sueño, SNC, Muscular, Pasos) ── */}
      <ReadinessScoreCard
        readiness={readiness}
        todaySleep={todaySleep}
        todaySteps={todaySteps}
        onOpenSleepModal={() => setSleepModalVisible(true)}
      />

      {/* ── Activity Rings Card ── */}
      <View style={styles.ringsCard}>
        <Text style={styles.sectionSubtitle}>RESUMEN DEL DÍA</Text>
        <View style={styles.ringsRow}>
          {/* Concentric Rings SVG */}
          <View style={styles.ringsBox}>
            <ActivityRings
              caloriesPct={consumed / target}
              proteinPct={protein / proteinTarget}
              workoutPct={todayCompleted ? 1 : 0}
              size={150}
            />
          </View>

          {/* Ring Legend */}
          <View style={styles.ringLegendCol}>
            {/* Calories */}
            <View>
              <View style={styles.legendHeaderRow}>
                <View style={[styles.legendDot, { backgroundColor: '#3B82F6' }]} />
                <Text style={styles.legendDotLabel}>KCAL</Text>
              </View>
              <Text style={styles.legendValueMain}>
                {consumed.toLocaleString()}{' '}
                <Text style={styles.legendValueSub}>/ {target.toLocaleString()}</Text>
              </Text>
            </View>

            {/* Protein */}
            <View>
              <View style={styles.legendHeaderRow}>
                <View style={[styles.legendDot, { backgroundColor: 'rgba(255,255,255,0.75)' }]} />
                <Text style={styles.legendDotLabel}>PROTEÍNA</Text>
              </View>
              <Text style={styles.legendValueMain}>
                {Math.round(protein)}g{' '}
                <Text style={styles.legendValueSub}>/ {proteinTarget}g</Text>
              </Text>
            </View>

            {/* Workout */}
            <View>
              <View style={styles.legendHeaderRow}>
                <View style={[styles.legendDot, { backgroundColor: '#60A5FA' }]} />
                <Text style={styles.legendDotLabel}>ENTRENO</Text>
              </View>
              <Text style={styles.legendValueMain}>
                {todayCompleted ? '✓ Listo' : 'Pendiente'}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* ── Macros Mini Cards Row ── */}
      <View style={styles.macrosRow}>
        {[
          { label: 'Proteína', val: Math.round(protein), target: proteinTarget, color: '#3B82F6' },
          { label: 'Carbos', val: Math.round(carbs), target: carbsTarget, color: '#60A5FA' },
          { label: 'Grasas', val: Math.round(fat), target: fatTarget, color: '#93C5FD' },
        ].map(({ label, val, target, color }) => {
          const pct = Math.min((val / target) * 100, 100)
          return (
            <View key={label} style={styles.macroCard}>
              <Text style={styles.macroCardVal}>{val}g</Text>
              <Text style={styles.macroCardLabel}>{label}</Text>
              <View style={styles.macroBarBg}>
                <View style={[styles.macroBarFill, { width: `${pct}%`, backgroundColor: color }]} />
              </View>
            </View>
          )
        })}
      </View>

      {/* ── Dynamic Workout Status Card (Today's Scheduled Routine or Completed State) ── */}
      {todayCompleted ? (
        // SCENARIO 1: WORKOUT COMPLETED TODAY
        <View style={[styles.card, styles.todayCompletedCard]}>
          <View style={styles.workoutCompletedHeaderRow}>
            <View style={styles.completedBadgePill}>
              <Ionicons name="checkmark-circle" size={16} color="#10B981" />
              <Text style={styles.completedBadgePillText}>RUTINA DE HOY COMPLETADA</Text>
            </View>
            <Text style={styles.todayDateSmall}>{todayDayName}</Text>
          </View>

          <Text style={styles.todayCompletedTitle}>{todayCompleted.routineName}</Text>

          <View style={styles.workoutStatsRow}>
            <View style={styles.workoutStatBox}>
              <Text style={styles.workoutStatVal}>
                {todayCompleted.volumeKg > 0
                  ? `${(todayCompleted.volumeKg / 1000).toFixed(1)}t`
                  : '0t'}
              </Text>
              <Text style={styles.workoutStatLabel}>Volumen</Text>
            </View>
            <View style={styles.workoutStatBox}>
              <Text style={styles.workoutStatVal}>{todayCompleted.durationMinutes}m</Text>
              <Text style={styles.workoutStatLabel}>Duración</Text>
            </View>
            <View style={styles.workoutStatBox}>
              <Text style={styles.workoutStatVal}>
                {todayCompleted.recordsCount ? `🥇 ${todayCompleted.recordsCount}` : '⚡ 100%'}
              </Text>
              <Text style={styles.workoutStatLabel}>Récords</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.reviewWorkoutBtn}
            onPress={() => router.push('/(tabs)/profile')}
            activeOpacity={0.8}
          >
            <Text style={styles.reviewWorkoutBtnText}>VER EN HISTORIAL</Text>
          </TouchableOpacity>
        </View>
      ) : assignedTodayRoutine ? (
        // SCENARIO 2: ROUTINE ASSIGNED FOR TODAY & NOT YET COMPLETED
        <View style={[styles.card, styles.todayRoutineCardActive]}>
          <View style={styles.todayRoutineHeaderRow}>
            <View style={styles.todayRoutinePill}>
              <Ionicons name="flame" size={14} color="#38BDF8" />
              <Text style={styles.todayRoutinePillText}>
                RUTINA DE HOY · {todayDayName.toUpperCase()}
              </Text>
            </View>
            <View style={styles.pendingDot} />
          </View>

          <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={styles.todayRoutineTitle}>{assignedTodayRoutine.name}</Text>
              {cleanRoutineDescription(assignedTodayRoutine.description) ? (
                <Text style={styles.todayRoutineDesc} numberOfLines={2}>
                  {cleanRoutineDescription(assignedTodayRoutine.description)}
                </Text>
              ) : null}

              {/* Quick Preview of Routine Exercises */}
              <View style={styles.todayExercisePreviewList}>
                {assignedTodayRoutine.exercises?.slice(0, 3).map((ex, idx) => (
                  <View key={idx} style={styles.todayExercisePreviewItem}>
                    <Text style={styles.todayExerciseDot}>•</Text>
                    <Text style={styles.todayExerciseName} numberOfLines={1}>
                      {ex.name}
                    </Text>
                    <Text style={styles.todayExerciseSets}>{ex.target_sets} series</Text>
                  </View>
                ))}
                {(assignedTodayRoutine.exercises?.length || 0) > 3 && (
                  <Text style={styles.todayExerciseMoreText}>
                    + {(assignedTodayRoutine.exercises?.length || 0) - 3} ejercicios más
                  </Text>
                )}
              </View>
            </View>

            {/* Anatomical Model with Active Muscle Glow */}
            <RoutineAnatomicalCover
              exercises={assignedTodayRoutine.exercises}
              width={95}
              height={135}
              showBadge
            />
          </View>

          {/* Big CTA to start today's workout directly */}
          <TouchableOpacity
            style={styles.startTodayWorkoutBtn}
            onPress={() => router.push(`/workout/session/${assignedTodayRoutine.id}`)}
            activeOpacity={0.85}
          >
            <Ionicons name="play" size={16} color="#FFFFFF" />
            <Text style={styles.startTodayWorkoutBtnText}>COMENZAR ENTRENAMIENTO</Text>
          </TouchableOpacity>
        </View>
      ) : (
        // SCENARIO 3: NO ROUTINE ASSIGNED FOR TODAY (REST DAY OR FREE WORKOUT)
        <View style={styles.card}>
          <View style={styles.todayRoutineHeaderRow}>
            <Text style={styles.sectionSubtitle}>ENTRENAMIENTO DE HOY</Text>
            <Text style={styles.todayDateSmall}>{todayDayName}</Text>
          </View>

          <View style={styles.noWorkoutContainer}>
            <View style={styles.noWorkoutIcon}>
              <Ionicons name="barbell-outline" size={24} color="rgba(255,255,255,0.3)" />
            </View>
            <Text style={styles.noWorkoutText}>
              Día libre / descanso.{'\n'}No tienes rutina asignada para los {todayDayName.toLowerCase()}s.
            </Text>
            <TouchableOpacity
              style={styles.startWorkoutBtn}
              onPress={() => router.push('/(tabs)/workout')}
              activeOpacity={0.85}
            >
              <Text style={styles.startWorkoutBtnText}>VER RUTINAS</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ── Recent Meals Card ── */}
      <View style={styles.card}>
        <View style={styles.mealsHeaderRow}>
          <Text style={styles.sectionSubtitle}>COMIDAS DEL DÍA</Text>
          <Text style={styles.mealsCaloriesTotal}>{consumed} kcal</Text>
        </View>

        {todayLogs.length > 0 ? (
          <View style={styles.mealsList}>
            {todayLogs.map((m) => (
              <View key={m.id} style={styles.mealItemRow}>
                <Text style={styles.mealItemName}>{mealLabel[m.meal_type] || 'Comida'}</Text>
                <Text style={styles.mealItemCals}>
                  {m.calories || 0} <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>kcal</Text>
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <View style={{ paddingVertical: 12, alignItems: 'center', gap: 6 }}>
            <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13, textAlign: 'center' }}>
              Sin comidas registradas hoy
            </Text>
            <TouchableOpacity
              onPress={() => router.push('/(tabs)/nutrition')}
              style={{ backgroundColor: 'rgba(56, 189, 248, 0.1)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }}
            >
              <Text style={{ color: '#38BDF8', fontSize: 11, fontWeight: '700' }}>+ REGISTRAR COMIDA</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* ── Body Weight Quick Card ── */}
      <View style={styles.card}>
        <View style={styles.weightCardRow}>
          <View>
            <Text style={styles.sectionSubtitle}>PESO CORPORAL</Text>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4, marginTop: 4 }}>
              <Text style={styles.weightBigNum}>
                {metrics?.currentWeightKg || profile?.initial_weight_kg || '—'}
              </Text>
              <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 16 }}>kg</Text>
            </View>
            <Text style={styles.weightDeltaText}>
              {metrics?.currentWeightKg ? 'Registro activo' : 'Registra tu peso en Perfil'}
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => router.push('/(tabs)/profile')}
            style={{
              backgroundColor: 'rgba(59, 130, 246, 0.12)',
              borderWidth: 1,
              borderColor: 'rgba(59, 130, 246, 0.3)',
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 10,
            }}
          >
            <Text style={{ color: '#38BDF8', fontSize: 11, fontWeight: '800' }}>DETALLES</Text>
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
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  content: {
    padding: 16,
    gap: 16,
    paddingBottom: 60,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingTop: Platform.OS === 'ios' ? 8 : 4,
  },
  dateText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 13,
    textTransform: 'capitalize',
  },
  greetingTitle: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '900',
    marginTop: 2,
    lineHeight: 32,
  },
  userNameText: {
    color: '#3B82F6',
    fontSize: 28,
    fontWeight: '900',
    lineHeight: 32,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(245,158,11,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.25)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  streakBadgeText: {
    color: '#F59E0B',
    fontSize: 12,
    fontWeight: '700',
  },
  avatarBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    color: '#38BDF8',
    fontSize: 18,
    fontWeight: '900',
  },
  ringsCard: {
    backgroundColor: '#12141C',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    gap: 14,
  },
  sectionSubtitle: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  ringsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ringsBox: {
    width: 150,
    height: 150,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringLegendCol: {
    flex: 1,
    paddingLeft: 20,
    gap: 12,
  },
  legendHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  legendDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  legendDotLabel: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  legendValueMain: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },
  legendValueSub: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 12,
    fontWeight: '500',
  },
  macrosRow: {
    flexDirection: 'row',
    gap: 8,
  },
  macroCard: {
    flex: 1,
    backgroundColor: '#12141C',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    gap: 4,
  },
  macroCardVal: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
  },
  macroCardLabel: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
    fontWeight: '600',
  },
  macroBarBg: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 2,
    marginTop: 6,
    overflow: 'hidden',
  },
  macroBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  card: {
    backgroundColor: '#12141C',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    gap: 12,
  },
  todayCompletedCard: {
    borderColor: 'rgba(16, 185, 129, 0.3)',
    backgroundColor: 'rgba(16, 185, 129, 0.04)',
  },
  workoutCompletedHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  completedBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  completedBadgePillText: {
    color: '#10B981',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  todayCompletedTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    marginTop: 2,
  },
  reviewWorkoutBtn: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  reviewWorkoutBtnText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  todayRoutineCardActive: {
    borderColor: 'rgba(56, 189, 248, 0.35)',
    backgroundColor: 'rgba(56, 189, 248, 0.04)',
  },
  todayRoutineHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  todayRoutinePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
  },
  todayRoutinePillText: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  pendingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#38BDF8',
  },
  todayDateSmall: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    fontWeight: '700',
  },
  todayRoutineTitle: {
    color: '#FFFFFF',
    fontSize: 19,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  todayRoutineDesc: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
    lineHeight: 18,
  },
  todayExercisePreviewList: {
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderRadius: 12,
    padding: 10,
    gap: 6,
    marginVertical: 2,
  },
  todayExercisePreviewItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  todayExerciseDot: {
    color: '#38BDF8',
    fontSize: 14,
    fontWeight: '900',
  },
  todayExerciseName: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  todayExerciseSets: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
    fontWeight: '600',
  },
  todayExerciseMoreText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
    fontStyle: 'italic',
    paddingLeft: 14,
  },
  startTodayWorkoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
    borderRadius: 14,
    paddingVertical: 13,
    gap: 8,
    shadowColor: '#2563EB',
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 4,
  },
  startTodayWorkoutBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  workoutStatsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  workoutStatBox: {
    flex: 1,
    backgroundColor: '#181C26',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  workoutStatVal: {
    color: '#38BDF8',
    fontSize: 16,
    fontWeight: '900',
  },
  workoutStatLabel: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 10,
    marginTop: 2,
    textTransform: 'uppercase',
  },
  noWorkoutContainer: {
    alignItems: 'center',
    paddingVertical: 12,
    gap: 10,
  },
  noWorkoutIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#181C26',
    alignItems: 'center',
    justifyContent: 'center',
  },
  noWorkoutText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  startWorkoutBtn: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.35)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 4,
  },
  startWorkoutBtnText: {
    color: '#38BDF8',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  mealsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mealsCaloriesTotal: {
    color: '#38BDF8',
    fontSize: 12,
    fontWeight: '700',
  },
  mealsList: {
    gap: 2,
  },
  mealItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  mealItemName: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    fontWeight: '600',
  },
  mealItemCals: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  weightCardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  weightBigNum: {
    color: '#FFFFFF',
    fontSize: 36,
    fontWeight: '900',
    lineHeight: 40,
  },
  weightDeltaText: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 11,
    marginTop: 2,
  },
  sparklineBox: {
    width: 80,
    height: 40,
    opacity: 0.7,
  },
})
