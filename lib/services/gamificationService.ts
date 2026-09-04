import AsyncStorage from '@react-native-async-storage/async-storage'
import { Alert, Linking, Platform } from 'react-native'
import { UserWorkoutHistoryItem } from '../hooks/useWorkout'

export interface AchievementBadge {
  id: string
  title: string
  description: string
  icon: string
  category: 'workout' | 'streak' | 'nutrition' | 'community' | 'steps'
  unlocked: boolean
  unlockedAt?: string | null
  progress: number // 0 to 1
  currentValue: number
  targetValue: number
  xpReward: number
}

export interface UserGamificationState {
  level: number
  levelTitle: string
  currentXp: number
  xpToNextLevel: number
  levelProgress: number // 0 to 1
  totalWorkouts: number
  totalVolumeKg: number
  currentStreakDays: number
  badges: AchievementBadge[]
  unlockedBadgesCount: number
}

const STORAGE_KEY_GAMIFICATION = '@carga_gamification_state_v1'
const STORAGE_KEY_STORE_REVIEW = '@carga_store_review_prompted_v1'

const LEVEL_TITLES: { minLevel: number; title: string }[] = [
  { minLevel: 20, title: 'Titán Legendario 🏆' },
  { minLevel: 13, title: 'Máster de Hipertrofia ⚡' },
  { minLevel: 8, title: 'Atleta de Élite 💎' },
  { minLevel: 4, title: 'Guerrero de Hierro 🛡️' },
  { minLevel: 1, title: 'Atleta Inicial 🌱' },
]

export function getLevelTitle(level: number): string {
  const found = LEVEL_TITLES.find((t) => level >= t.minLevel)
  return found ? found.title : 'Atleta Inicial 🌱'
}

/**
 * Motor Central de Gamificación y Retención
 */
export const gamificationService = {
  /**
   * Calcula el estado completo de niveles, XP y medallas desbloqueadas
   */
  calculateGamificationState(params: {
    history: UserWorkoutHistoryItem[]
    currentStreakDays: number
    todaySteps?: number
    verifiedCount?: number
  }): UserGamificationState {
    const { history, currentStreakDays, todaySteps = 0, verifiedCount = 0 } = params

    const totalWorkouts = history.length
    const totalVolumeKg = history.reduce((acc, curr) => acc + (curr.volumeKg || 0), 0)

    // Definición de Medallas
    const badges: AchievementBadge[] = [
      {
        id: 'first_workout',
        title: 'Primer Paso',
        description: 'Completa tu primer entrenamiento',
        icon: '🏋️',
        category: 'workout',
        unlocked: totalWorkouts >= 1,
        unlockedAt: totalWorkouts >= 1 ? history[history.length - 1]?.date : null,
        progress: Math.min(1, totalWorkouts / 1),
        currentValue: totalWorkouts,
        targetValue: 1,
        xpReward: 100,
      },
      {
        id: 'streak_3',
        title: 'Fuego Encendido',
        description: 'Mantén una racha de 3 días consecutivos',
        icon: '🔥',
        category: 'streak',
        unlocked: currentStreakDays >= 3,
        progress: Math.min(1, currentStreakDays / 3),
        currentValue: currentStreakDays,
        targetValue: 3,
        xpReward: 150,
      },
      {
        id: 'streak_7',
        title: 'Hábito de Acero',
        description: 'Alcanza una semana completa de racha (7 días)',
        icon: '⚡',
        category: 'streak',
        unlocked: currentStreakDays >= 7,
        progress: Math.min(1, currentStreakDays / 7),
        currentValue: currentStreakDays,
        targetValue: 7,
        xpReward: 300,
      },
      {
        id: 'volume_10k',
        title: '10 Toneladas',
        description: 'Levanta más de 10.000 kg de volumen acumulado',
        icon: '🧱',
        category: 'workout',
        unlocked: totalVolumeKg >= 10000,
        progress: Math.min(1, totalVolumeKg / 10000),
        currentValue: totalVolumeKg,
        targetValue: 10000,
        xpReward: 250,
      },
      {
        id: 'volume_100k',
        title: 'Club de las 100T',
        description: 'Levanta más de 100.000 kg de volumen acumulado',
        icon: '🏆',
        category: 'workout',
        unlocked: totalVolumeKg >= 100000,
        progress: Math.min(1, totalVolumeKg / 100000),
        currentValue: totalVolumeKg,
        targetValue: 100000,
        xpReward: 600,
      },
      {
        id: 'steps_10k',
        title: 'Club 10K',
        description: 'Supera los 10.000 pasos en un solo día',
        icon: '👟',
        category: 'steps',
        unlocked: todaySteps >= 10000,
        progress: Math.min(1, todaySteps / 10000),
        currentValue: todaySteps,
        targetValue: 10000,
        xpReward: 120,
      },
      {
        id: 'community_guardian',
        title: 'Guardián Comunitario',
        description: 'Valida la precisión de productos en la comunidad',
        icon: '🛡️',
        category: 'community',
        unlocked: verifiedCount >= 1,
        progress: Math.min(1, verifiedCount / 1),
        currentValue: verifiedCount,
        targetValue: 1,
        xpReward: 150,
      },
    ]

    // Cálculo de Experiencia (XP)
    let totalXp = 0
    totalXp += totalWorkouts * 100 // 100 XP por entreno
    totalXp += currentStreakDays * 25 // 25 XP por día de racha
    totalXp += verifiedCount * 50 // 50 XP por producto verificado
    badges.forEach((b) => {
      if (b.unlocked) totalXp += b.xpReward
    })

    // Nivel: Cada nivel requiere N * 350 XP
    const xpPerLevelBase = 350
    const level = Math.max(1, Math.floor(Math.sqrt(totalXp / xpPerLevelBase)) + 1)
    const currentLevelBaseXp = Math.pow(level - 1, 2) * xpPerLevelBase
    const nextLevelBaseXp = Math.pow(level, 2) * xpPerLevelBase
    const xpEarnedInCurrentLevel = totalXp - currentLevelBaseXp
    const xpNeededForCurrentLevel = nextLevelBaseXp - currentLevelBaseXp
    const levelProgress = Math.min(1, Math.max(0, xpEarnedInCurrentLevel / (xpNeededForCurrentLevel || 1)))
    const xpToNextLevel = Math.max(0, nextLevelBaseXp - totalXp)

    return {
      level,
      levelTitle: getLevelTitle(level),
      currentXp: totalXp,
      xpToNextLevel,
      levelProgress,
      totalWorkouts,
      totalVolumeKg,
      currentStreakDays,
      badges,
      unlockedBadgesCount: badges.filter((b) => b.unlocked).length,
    }
  },

  /**
   * Verifica inteligentemente si es momento de solicitar valoración en App Store / Play Store
   */
  async checkAndPromptStoreReview(totalWorkouts: number, streakDays: number): Promise<boolean> {
    try {
      const alreadyPrompted = await AsyncStorage.getItem(STORAGE_KEY_STORE_REVIEW)
      if (alreadyPrompted === 'true') return false

      // Momentos de alta satisfacción: 3º entrenamiento completado o 7 días de racha
      if (totalWorkouts >= 3 || streakDays >= 7) {
        await AsyncStorage.setItem(STORAGE_KEY_STORE_REVIEW, 'true')

        Alert.alert(
          '⭐ ¿Te está gustando Carga App?',
          'Tu constancia es increíble. Dejar una reseña positiva en la tienda nos ayuda a seguir mejorando la app y mantener las funciones gratuitas.',
          [
            { text: 'Más tarde', style: 'cancel' },
            {
              text: 'Valorar App ⭐⭐⭐⭐⭐',
              onPress: () => {
                // Link a la Store
                const storeUrl =
                  Platform.OS === 'ios'
                    ? 'https://apps.apple.com'
                    : 'https://play.google.com/store'
                Linking.openURL(storeUrl).catch(() => {})
              },
            },
          ]
        )
        return true
      }
    } catch {}
    return false
  },
}
