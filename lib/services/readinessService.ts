import { SleepRecord } from './sleepService'
import { UserWorkoutHistoryItem } from '../hooks/useWorkout'

export interface ReadinessEvaluation {
  score: number // 0 to 100
  status: 'optimal' | 'moderate' | 'fatigued'
  title: string
  message: string
  actionTip: string
  cnsRecoveryPct: number
  muscularRecoveryPct: number
  breakdown: {
    sleepComponent: number // max 40
    trainingLoadComponent: number // max 35
    nutritionComponent: number // max 15
    activityComponent: number // max 10
  }
}

/**
 * Calcula el índice de preparación y recuperación neuromuscular (Readiness Score)
 */
export function calculateReadinessScore(params: {
  todaySleep?: SleepRecord | null
  estimatedSleepHours?: number
  recentWorkouts?: UserWorkoutHistoryItem[]
  yesterdaySteps?: number
  yesterdayNutritionMet?: boolean
}): ReadinessEvaluation {
  const {
    todaySleep,
    estimatedSleepHours = 7.5,
    recentWorkouts = [],
    yesterdaySteps = 7000,
    yesterdayNutritionMet = true,
  } = params

  // 1. FACTOR SUEÑO (Hasta 40 puntos)
  let sleepScore = 30
  let deepMin = 80
  let remMin = 90
  let awakenings = 1
  let sleepHours = estimatedSleepHours

  if (todaySleep) {
    sleepHours = todaySleep.durationMinutes / 60
    deepMin = todaySleep.deepSleepMinutes
    remMin = todaySleep.remSleepMinutes
    awakenings = todaySleep.awakeningsCount

    // Duración
    if (sleepHours >= 8) sleepScore = 20
    else if (sleepHours >= 7) sleepScore = 17
    else if (sleepHours >= 6) sleepScore = 12
    else if (sleepHours >= 5) sleepScore = 7
    else sleepScore = 3

    // Calidad y Fases (Sueño Profundo + REM)
    if (deepMin >= 75 && remMin >= 80) sleepScore += 12
    else if (deepMin >= 50) sleepScore += 8
    else sleepScore += 4

    // Penalización por despertares
    if (awakenings === 0) sleepScore += 8
    else if (awakenings === 1) sleepScore += 6
    else if (awakenings === 2) sleepScore += 3
    else sleepScore += 0
  } else {
    // Estimación basal
    if (sleepHours >= 7.5) sleepScore = 32
    else if (sleepHours >= 6.5) sleepScore = 26
    else sleepScore = 18
  }

  // 2. FACTOR CARGA DE ENTRENAMIENTO PREVIO (Hasta 35 puntos)
  let trainingScore = 32
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = yesterday.toISOString().split('T')[0]

  const yesterdayWorkout = recentWorkouts.find((w) => w.date === yesterdayStr)
  if (yesterdayWorkout) {
    const vol = yesterdayWorkout.volumeKg || 0
    if (vol > 15000) {
      trainingScore = 20 // Gran fatiga acumulada
    } else if (vol > 8000) {
      trainingScore = 26
    } else {
      trainingScore = 31
    }
  }

  // 3. FACTOR NUTRICIÓN PREVIA (Hasta 15 puntos)
  const nutritionScore = yesterdayNutritionMet ? 14 : 9

  // 4. FACTOR ACTIVIDAD / NEAT (Hasta 10 puntos)
  let activityScore = 8
  if (yesterdaySteps >= 10000) activityScore = 10
  else if (yesterdaySteps >= 6000) activityScore = 8
  else activityScore = 6

  const totalScore = Math.min(
    100,
    Math.max(25, Math.round(sleepScore + trainingScore + nutritionScore + activityScore))
  )

  // Recuperación SNC y Muscular
  const cnsRecoveryPct = Math.min(
    100,
    Math.round((remMin / 100) * 50 + (sleepHours / 8) * 50)
  )
  const muscularRecoveryPct = Math.min(
    100,
    Math.round((deepMin / 90) * 50 + (trainingScore / 35) * 50)
  )

  let status: 'optimal' | 'moderate' | 'fatigued' = 'moderate'
  let title = 'Recuperación Favorable'
  let message =
    'Tu cuerpo ha asimilado bien el estímulo. Estás en un punto óptimo para mantener las cargas programadas.'
  let actionTip = 'Mantén tu hidratación y enfócate en la técnica en tus series de aproximación.'

  if (totalScore >= 80) {
    status = 'optimal'
    title = 'Máxima Predisposición (PR Ready)'
    message =
      'Excelente recuperación de sueño profundo y equilibrio neuromuscular. Tu sistema nervioso está listo para alta intensidad.'
    actionTip = 'Hoy es un día ideal para intentar batir marcas (PR) o subir peso en tus primeros ejercicios.'
  } else if (totalScore < 60) {
    status = 'fatigued'
    title = 'Fatiga Residual Detectada'
    message =
      'Déficit de sueño o alta fatiga acumulada de sesiones recientes. Tu recuperación neuromuscular está por debajo del 60%.'
    actionTip =
      'Recomendación IA: Reduce 1 serie en ejercicios accesorios y aumenta 30s el descanso entre series pesadas.'
  }

  return {
    score: totalScore,
    status,
    title,
    message,
    actionTip,
    cnsRecoveryPct,
    muscularRecoveryPct,
    breakdown: {
      sleepComponent: sleepScore,
      trainingLoadComponent: trainingScore,
      nutritionComponent: nutritionScore,
      activityComponent: activityScore,
    },
  }
}
