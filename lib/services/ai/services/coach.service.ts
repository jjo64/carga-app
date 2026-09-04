import {
  AiChatMessage,
  PainAdaptorResult,
  CoachStructuredResponse,
  AthleteProfileContext,
  AiServiceResponse,
} from '../types'
import {
  PAIN_ADAPTOR_SYSTEM_PROMPT,
  BIOMECHANICAL_COACH_SYSTEM_PROMPT,
} from '../prompts'
import { callAnthropicApi, extractAndParseJson } from '../client'
import {
  getCachedAiResponse,
  setCachedAiResponse,
  simpleHash,
  stableStringify,
} from '../cache'
import { formatAthleteProfileContext } from '../athleteContext'
import {
  painAdaptorResultSchema,
  coachStructuredResponseSchema,
} from '../schemas'

/**
 * Pain Adaptor - Sustituto por Molestias en Vivo (Claude 3.5 Haiku)
 */
export async function adaptExerciseForPain(params: {
  exerciseName: string
  painLocation: string
  painIntensity: number // 1 a 10
  availableEquipment?: string[]
  exerciseNotes?: string
  athleteProfile?: AthleteProfileContext
}): Promise<AiServiceResponse<PainAdaptorResult>> {
  const cacheKey = `pain_v2_${simpleHash(stableStringify(params))}`
  const cached = await getCachedAiResponse<PainAdaptorResult>(cacheKey)

  if (cached) {
    return {
      data: cached,
      metrics: {
        inputTokens: 0,
        outputTokens: 0,
        cacheCreationTokens: 0,
        cacheReadTokens: 0,
        estimatedCostUsd: 0,
        latencyMs: 5,
        modelUsed: 'local-cache-hit',
        fromLocalCache: true,
      },
    }
  }

  const athleteContext = formatAthleteProfileContext(params.athleteProfile)
  const promptText = `
${athleteContext}Ejercicio actual: ${params.exerciseName}
Zona de dolor/molestia: ${params.painLocation}
Intensidad del dolor (1-10): ${params.painIntensity}
Equipamiento disponible: ${params.availableEquipment?.join(', ') || 'Gimnasio comercial completo'}
Detalles adicionales: ${params.exerciseNotes || 'Ninguno'}
  `.trim()

  const { text, metrics } = await callAnthropicApi({
    modelTier: 'haiku',
    actionType: 'adapt_pain',
    system: PAIN_ADAPTOR_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: promptText }],
    temperature: 0.1,
    maxTokens: 600,
  })

  const parsed = extractAndParseJson<PainAdaptorResult>(
    text,
    painAdaptorResultSchema,
    metrics.modelUsed
  )
  await setCachedAiResponse(cacheKey, parsed, 7 * 24 * 60 * 60 * 1000) // 7 días TTL

  return { data: parsed, metrics }
}

/**
 * Asistente Biomecánico y Nutricional en Vivo (Claude Haiku 4.5)
 * Con Contexto en Bloque System (para Prompt Caching)
 */
export async function chatWithCoach(
  conversation: AiChatMessage[],
  context?: {
    athleteProfile?: AthleteProfileContext
    recentWorkoutsSummary?: string
    currentRoutineName?: string
    userGoal?: string
    experienceLevel?: string
  }
): Promise<AiServiceResponse<AiChatMessage>> {
  const athleteBlock = formatAthleteProfileContext(
    context?.athleteProfile || {
      goal: context?.userGoal,
      experienceLevel: (context?.experienceLevel as any) || 'intermedio',
    }
  )
  const historyBlock = context?.recentWorkoutsSummary ? `[Historial de sesiones recientes:\n${context.recentWorkoutsSummary}]\n\n` : ''
  const routineBlock = context?.currentRoutineName ? `[Rutina activa en curso: ${context.currentRoutineName}]\n\n` : ''

  const contextPrefix = `${athleteBlock}${historyBlock}${routineBlock}`.trim()

  const systemBlocks = [
    ...BIOMECHANICAL_COACH_SYSTEM_PROMPT,
  ]
  if (contextPrefix) {
    systemBlocks.push({
      type: 'text' as const,
      text: `CONTEXTO DEL ATLETA Y SESIONES ACTIVAS:\n${contextPrefix}`,
      cache_control: { type: 'ephemeral' as const },
    })
  }

  const formattedMessages = conversation.map((msg) => ({
    role: msg.role === 'user' ? ('user' as const) : ('assistant' as const),
    content: msg.content,
  }))

  const { text, metrics } = await callAnthropicApi({
    modelTier: 'haiku',
    actionType: 'chat_coach',
    system: systemBlocks,
    messages: formattedMessages,
    temperature: 0.2,
    maxTokens: 600,
  })

  let structured: CoachStructuredResponse | undefined
  let mainAnswerText = text
  try {
    structured = extractAndParseJson<CoachStructuredResponse>(
      text,
      coachStructuredResponseSchema,
      metrics.modelUsed
    )
    mainAnswerText = structured.mainAnswer || text
  } catch {
    // Fallback a texto libre
  }

  const assistantMessage: AiChatMessage = {
    id: `ai-msg-${Date.now()}`,
    role: 'assistant',
    content: mainAnswerText,
    structured,
    timestamp: Date.now(),
  }

  return { data: assistantMessage, metrics }
}

export const coachAiService = {
  chatWithCoach,
  adaptExerciseForPain,
}
