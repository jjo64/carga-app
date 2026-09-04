import {
  LoadAdvisorResult,
  DeloadAdviceResult,
  MesocyclePlan,
  MesocycleParams,
  AthleteProfileContext,
  AiServiceResponse,
} from '../types'
import {
  LOAD_ADVISOR_SYSTEM_PROMPT,
  DELOAD_ADVISOR_SYSTEM_PROMPT,
  MESOCYCLE_BUILDER_SYSTEM_PROMPT,
} from '../prompts'
import { callAnthropicApi, extractAndParseJson } from '../client'
import { formatAthleteProfileContext } from '../athleteContext'
import {
  loadAdvisorResultSchema,
  deloadAdviceResultSchema,
  mesocyclePlanSchema,
} from '../schemas'

/**
 * Motor de Sobrecarga Progresiva (Claude 3.5 Haiku)
 */
export async function recommendNextLoad(params: {
  exerciseName: string
  lastWeightKg: number
  lastReps: number
  lastRpe: number
  targetRpe?: number
  isUpperBody?: boolean
  athleteProfile?: AthleteProfileContext
}): Promise<AiServiceResponse<LoadAdvisorResult>> {
  const athleteContext = formatAthleteProfileContext(params.athleteProfile)
  const promptText = `
${athleteContext}Ejercicio: ${params.exerciseName}
Última serie realizada: ${params.lastWeightKg} kg x ${params.lastReps} reps @ RPE ${params.lastRpe}
RPE Objetivo: ${params.targetRpe || 8.5}
Tipo de movimiento: ${params.isUpperBody ? 'Torso / Tren Superior' : 'Pierna / Tren Inferior'}
  `.trim()

  const { text, metrics } = await callAnthropicApi({
    modelTier: 'haiku',
    actionType: 'recommend_load',
    system: LOAD_ADVISOR_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: promptText }],
    temperature: 0.1,
    maxTokens: 400,
  })

  const parsed = extractAndParseJson<LoadAdvisorResult>(
    text,
    loadAdvisorResultSchema,
    metrics.modelUsed
  )
  return { data: parsed, metrics }
}

/**
 * Smart Deload Advisor - Predicción de Fatiga (Claude Haiku 4.5)
 */
export async function evaluateDeload(params: {
  weeksTrainingConsecutive: number
  averageRpeLast2Weeks: number
  recentWorkoutsCount: number
  hasJointPain: boolean
  subjectiveFatigueScore: number // 1-10
  isPerformanceStalled: boolean
  athleteProfile?: AthleteProfileContext
}): Promise<AiServiceResponse<DeloadAdviceResult>> {
  const athleteContext = formatAthleteProfileContext(params.athleteProfile)
  const promptText = `
${athleteContext}Historial de entrenamiento reciente:
- Semanas consecutivas entrenando: ${params.weeksTrainingConsecutive}
- RPE promedio últimas 2 semanas: ${params.averageRpeLast2Weeks}
- Sesiones completadas recientemente: ${params.recentWorkoutsCount}
- Presencia de molestias articulares: ${params.hasJointPain ? 'Sí' : 'No'}
- Fatiga subjetiva / calidad de sueño (1-10): ${params.subjectiveFatigueScore}
- Estancamiento o bajada en cargas/reps: ${params.isPerformanceStalled ? 'Sí' : 'No'}
  `.trim()

  const { text, metrics } = await callAnthropicApi({
    modelTier: 'haiku',
    actionType: 'evaluate_deload',
    system: DELOAD_ADVISOR_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: promptText }],
    temperature: 0.1,
    maxTokens: 500,
  })

  const parsed = extractAndParseJson<DeloadAdviceResult>(
    text,
    deloadAdviceResultSchema,
    metrics.modelUsed
  )
  return { data: parsed, metrics }
}

/**
 * Generador de Mesociclos Periodizados (Claude Sonnet 5)
 * Con Validación Post-Parse de Semana de Deload
 */
export async function generateMesocycle(
  params: MesocycleParams
): Promise<AiServiceResponse<MesocyclePlan>> {
  const athleteContext = formatAthleteProfileContext(params.athleteProfile)
  const duration = params.durationWeeks || 5
  const split = params.splitType || 'push_pull_legs'
  const days = params.daysPerWeek || 4

  const promptText = `
${athleteContext}SOLICITUD DE MESOCICLO PERIODIZADO:
- Split deseado: ${split}
- Días de entrenamiento por semana: ${days} días
- Duración total del mesociclo: ${duration} semanas (${duration - 1} semanas de sobrecarga progresiva + 1 semana final de Deload obligatorio)
- Músculos de especialización / foco prioritario: ${params.focusMuscles?.join(', ') || 'Equilibrado en todo el cuerpo'}
- Equipamiento disponible: ${params.equipmentAvailable?.join(', ') || 'Gimnasio comercial completo'}
- Distribución de volumen actual: ${params.currentVolumePerMuscle ? JSON.stringify(params.currentVolumePerMuscle) : 'Estándar para nivel'}
- Notas personalizadas del atleta: ${params.customNotes || 'Ninguna'}
  `.trim()

  const { text, metrics } = await callAnthropicApi({
    modelTier: 'sonnet',
    actionType: 'generate_mesocycle',
    system: MESOCYCLE_BUILDER_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: promptText }],
    temperature: 0.2,
    maxTokens: 4000,
  })

  const parsed = extractAndParseJson<MesocyclePlan>(
    text,
    mesocyclePlanSchema,
    metrics.modelUsed
  )

  // Validación post-parse estricta: asegurar que la última semana sea deload con targetRir >= 3
  if (parsed.weeks && parsed.weeks.length > 0) {
    const lastWeek = parsed.weeks[parsed.weeks.length - 1]
    lastWeek.phase = 'deload'
    lastWeek.isDeload = true
    if (typeof lastWeek.targetRir !== 'number' || lastWeek.targetRir < 3) {
      lastWeek.targetRir = 3
    }
  }

  return { data: parsed, metrics }
}

export const recommendLoad = recommendNextLoad

export const trainingAiService = {
  recommendNextLoad,
  recommendLoad,
  evaluateDeload,
  generateMesocycle,
}
