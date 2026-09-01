import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native'
import { useRouter } from 'expo-router'
import { useDashboard } from '@/lib/hooks/useDashboard'
import { useAuth } from '@/lib/hooks/useAuth'
import { theme } from '@/constants/theme'
import { Ionicons } from '@expo/vector-icons'

export default function DashboardScreen() {
  const router = useRouter()
  const { profile } = useAuth()
  const { metrics, loading, refetch } = useDashboard()

  const todayFormatted = new Date().toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={loading}
          onRefresh={refetch}
          tintColor={theme.colors.primary}
        />
      }
    >
      {/* Header Banner */}
      <View style={styles.header}>
        <View>
          <Text style={styles.dateText}>{todayFormatted.toUpperCase()}</Text>
          <Text style={styles.greetingTitle}>
            ¡A darlo todo, {profile?.name || 'Atleta'}! ⚡
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => router.push('/(tabs)/profile')}
          style={styles.profileBadge}
        >
          <Ionicons name="person" size={18} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      {loading && !metrics ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <>
          {/* Card Principal: Balance Calórico */}
          <View style={styles.heroCard}>
            <View style={styles.heroHeader}>
              <View style={styles.heroBadge}>
                <Ionicons name="flame" size={16} color={theme.colors.primary} />
                <Text style={styles.heroBadgeText}>BALANCE ENERGÉTICO</Text>
              </View>
              {metrics && metrics.burnedCalories > 0 && (
                <View style={styles.burnedBadge}>
                  <Text style={styles.burnedBadgeText}>
                    +{metrics.burnedCalories} kcal entreno
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.calorieDisplay}>
              <View style={styles.calorieBlock}>
                <Text style={styles.calorieMainNumber}>
                  {metrics?.consumedCalories || 0}
                </Text>
                <Text style={styles.calorieLabel}>Consumidas</Text>
              </View>

              <Text style={styles.calorieDivider}>de</Text>

              <View style={styles.calorieBlock}>
                <Text style={[styles.calorieMainNumber, { color: theme.colors.primary }]}>
                  {metrics?.targetCalories || 2000}
                </Text>
                <Text style={styles.calorieLabel}>Objetivo Ajustado</Text>
              </View>
            </View>

            {/* Barra de progreso de calorías */}
            <View style={styles.progressBarBackground}>
              <View
                style={[
                  styles.progressBarFill,
                  {
                    width: `${Math.min(
                      100,
                      ((metrics?.consumedCalories || 0) /
                        (metrics?.targetCalories || 2000)) *
                        100
                    )}%`,
                  },
                ]}
              />
            </View>

            <View style={styles.calorieFooter}>
              <Text style={styles.calorieFooterText}>
                {metrics && metrics.calorieBalance >= 0
                  ? `Superávit actual: +${metrics.calorieBalance} kcal`
                  : `Restante: ${Math.abs(metrics?.calorieBalance || 0)} kcal`}
              </Text>
            </View>
          </View>

          {/* Progreso de Macros */}
          <View style={styles.card}>
            <Text style={styles.cardSectionTitle}>Objetivos de Macronutrientes</Text>

            {/* Proteína */}
            <View style={styles.macroProgressRow}>
              <View style={styles.macroInfo}>
                <Text style={styles.macroName}>🥩 Proteína</Text>
                <Text style={styles.macroValues}>
                  {metrics?.protein || 0} / {metrics?.proteinTarget || 150}g
                </Text>
              </View>
              <View style={styles.macroBarBg}>
                <View
                  style={[
                    styles.macroBarFill,
                    {
                      backgroundColor: theme.colors.primary,
                      width: `${Math.min(
                        100,
                        ((metrics?.protein || 0) / (metrics?.proteinTarget || 150)) * 100
                      )}%`,
                    },
                  ]}
                />
              </View>
            </View>

            {/* Carbohidratos */}
            <View style={styles.macroProgressRow}>
              <View style={styles.macroInfo}>
                <Text style={styles.macroName}>🍚 Carbohidratos</Text>
                <Text style={styles.macroValues}>
                  {metrics?.carbs || 0} / {metrics?.carbsTarget || 220}g
                </Text>
              </View>
              <View style={styles.macroBarBg}>
                <View
                  style={[
                    styles.macroBarFill,
                    {
                      backgroundColor: theme.colors.info,
                      width: `${Math.min(
                        100,
                        ((metrics?.carbs || 0) / (metrics?.carbsTarget || 220)) * 100
                      )}%`,
                    },
                  ]}
                />
              </View>
            </View>

            {/* Grasas */}
            <View style={styles.macroProgressRow}>
              <View style={styles.macroInfo}>
                <Text style={styles.macroName}>🥑 Grasas</Text>
                <Text style={styles.macroValues}>
                  {metrics?.fat || 0} / {metrics?.fatTarget || 65}g
                </Text>
              </View>
              <View style={styles.macroBarBg}>
                <View
                  style={[
                    styles.macroBarFill,
                    {
                      backgroundColor: theme.colors.fat,
                      width: `${Math.min(
                        100,
                        ((metrics?.fat || 0) / (metrics?.fatTarget || 65)) * 100
                      )}%`,
                    },
                  ]}
                />
              </View>
            </View>
          </View>

          {/* Estado del Entrenamiento de Hoy */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardSectionTitle}>Entrenamiento de Hoy</Text>
              {metrics?.todayWorkout && (
                <View style={styles.completedBadge}>
                  <Text style={styles.completedBadgeText}>Completado</Text>
                </View>
              )}
            </View>

            {metrics?.todayWorkout ? (
              <View style={styles.workoutRecap}>
                <View style={styles.recapItem}>
                  <Ionicons name="barbell" size={20} color={theme.colors.primary} />
                  <View>
                    <Text style={styles.recapVal}>
                      {metrics.todayWorkout.total_volume_kg || 0} kg
                    </Text>
                    <Text style={styles.recapSub}>Volumen Total</Text>
                  </View>
                </View>

                <View style={styles.recapItem}>
                  <Ionicons name="time" size={20} color={theme.colors.info} />
                  <View>
                    <Text style={styles.recapVal}>
                      {metrics.todayWorkout.duration_minutes || 0} min
                    </Text>
                    <Text style={styles.recapSub}>Duración</Text>
                  </View>
                </View>

                <View style={styles.recapItem}>
                  <Ionicons name="flame" size={20} color={theme.colors.warning} />
                  <View>
                    <Text style={styles.recapVal}>
                      {metrics.todayWorkout.estimated_calories_burned || 0} kcal
                    </Text>
                    <Text style={styles.recapSub}>Quemadas</Text>
                  </View>
                </View>
              </View>
            ) : (
              <View style={styles.noWorkoutBox}>
                <Text style={styles.noWorkoutText}>
                  Aún no has registrado una sesión hoy.
                </Text>
                <TouchableOpacity
                  style={styles.startWorkoutBtn}
                  onPress={() => router.push('/(tabs)/workout')}
                >
                  <Ionicons name="play" size={16} color="#000" />
                  <Text style={styles.startWorkoutBtnText}>Ir a Entrenar</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Accesos Rápidos */}
          <View style={styles.quickActionsGrid}>
            <TouchableOpacity
              style={styles.quickCard}
              onPress={() => router.push('/(tabs)/nutrition')}
            >
              <Ionicons name="restaurant-outline" size={24} color={theme.colors.primary} />
              <Text style={styles.quickCardTitle}>Nutrición</Text>
              <Text style={styles.quickCardSub}>
                {metrics?.mealCount || 0} comidas registradas
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickCard}
              onPress={() => router.push('/(tabs)/progress')}
            >
              <Ionicons name="trending-up-outline" size={24} color={theme.colors.info} />
              <Text style={styles.quickCardTitle}>Progreso</Text>
              <Text style={styles.quickCardSub}>
                Peso actual: {metrics?.currentWeightKg || '--'} kg
              </Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    padding: theme.spacing.md,
    gap: theme.spacing.lg,
    paddingBottom: theme.spacing.xl * 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: theme.spacing.xs,
  },
  dateText: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 1.5,
  },
  greetingTitle: {
    color: theme.colors.text,
    fontSize: 20,
    fontWeight: '900',
    marginTop: 2,
  },
  profileBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingBox: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  heroCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heroBadgeText: {
    color: theme.colors.primary,
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 1.5,
  },
  burnedBadge: {
    backgroundColor: theme.colors.primaryMuted,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  burnedBadgeText: {
    color: theme.colors.primary,
    fontSize: 11,
    fontWeight: 'bold',
  },
  calorieDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: theme.spacing.xs,
  },
  calorieBlock: {
    alignItems: 'center',
  },
  calorieMainNumber: {
    color: theme.colors.text,
    fontSize: 32,
    fontWeight: '900',
  },
  calorieLabel: {
    color: theme.colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  calorieDivider: {
    color: theme.colors.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },
  progressBarBackground: {
    height: 8,
    backgroundColor: theme.colors.surfaceSubtle,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: theme.colors.primary,
    borderRadius: 4,
  },
  calorieFooter: {
    alignItems: 'center',
  },
  calorieFooterText: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    fontWeight: '500',
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardSectionTitle: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: 'bold',
  },
  completedBadge: {
    backgroundColor: theme.colors.primaryMuted,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  completedBadgeText: {
    color: theme.colors.primary,
    fontSize: 11,
    fontWeight: 'bold',
  },
  macroProgressRow: {
    gap: 6,
  },
  macroInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  macroName: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  macroValues: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: 'bold',
  },
  macroBarBg: {
    height: 6,
    backgroundColor: theme.colors.surfaceSubtle,
    borderRadius: 3,
    overflow: 'hidden',
  },
  macroBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  workoutRecap: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.xs,
  },
  recapItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  recapVal: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: 'bold',
  },
  recapSub: {
    color: theme.colors.textMuted,
    fontSize: 10,
  },
  noWorkoutBox: {
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
  },
  noWorkoutText: {
    color: theme.colors.textMuted,
    fontSize: 13,
  },
  startWorkoutBtn: {
    backgroundColor: theme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: theme.borderRadius.sm,
    gap: 6,
  },
  startWorkoutBtnText: {
    color: '#000',
    fontSize: 13,
    fontWeight: 'bold',
  },
  quickActionsGrid: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  quickCard: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 4,
  },
  quickCardTitle: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: 'bold',
    marginTop: 4,
  },
  quickCardSub: {
    color: theme.colors.textMuted,
    fontSize: 11,
  },
})
