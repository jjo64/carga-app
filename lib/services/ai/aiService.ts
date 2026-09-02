import {
  VoiceLogResult,
  PainAdaptorResult,
  MacroCloserResult,
  DeloadAdviceResult,
  NutritionalLabelResult,
  FoodVisionResult,
  NaturalMealParseResult,
  LoadAdvisorResult,
  AiChatMessage,
  AiUsageMetrics,
} from './types'
import {
  VOICE_LOGGER_SYSTEM_PROMPT,
  PAIN_ADAPTOR_SYSTEM_PROMPT,
  MACRO_CLOSER_SYSTEM_PROMPT,
  DELOAD_ADVISOR_SYSTEM_PROMPT,
  NUTRITION_LABEL_SYSTEM_PROMPT,
  FOOD_VISION_SYSTEM_PROMPT,
  NATURAL_MEAL_PARSER_SYSTEM_PROMPT,
  LOAD_ADVISOR_SYSTEM_PROMPT,
  BIOMECHANICAL_COACH_SYSTEM_PROMPT,
} from './prompts'
import { callAnthropicApi, extractAndParseJson } from './client'
import {
  getCachedAiResponse,
  setCachedAiResponse,
  simpleHash,
  getLifetimeStats,
  clearAiCache,
} from './cache'
import { optimizeImageForVision } from './imageOptimizer'

export interface AiServiceResponse<T> {
  data: T
  metrics: AiUsageMetrics
}

/**
 * Servicio Central de Inteligencia Artificial para Carga App.
 * Integra Model Tiering (Haiku/Sonnet), Prompt Caching, Caché Local y Visión Optimizada.
 */
export const aiService = {
  // =========================================================================
  // 1. Hands-Free Voice Logger (Claude 3.5 Haiku - ~300ms)
  // =========================================================================
  async parseVoiceLog(
    transcript: string,
    currentExerciseName?: string
  ): Promise<AiServiceResponse<VoiceLogResult>> {
    const promptText = `Transcripción de voz: "${transcript}"\nEjercicio en curso: ${currentExerciseName || 'No especificado'}`

    const { text, metrics } = await callAnthropicApi({
      modelTier: 'haiku',
      system: VOICE_LOGGER_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: promptText }],
      temperature: 0.0,
      maxTokens: 300,
    })

    const parsed = extractAndParseJson<VoiceLogResult>(text)
    parsed.rawTranscript = transcript
    if (!parsed.exerciseName && currentExerciseName) {
      parsed.exerciseName = currentExerciseName
    }

    return { data: parsed, metrics }
  },

  // =========================================================================
  // 2. Pain Adaptor - Sustituto por Molestias en Vivo (Claude 3.5 Haiku)
  // =========================================================================
  async adaptExerciseForPain(params: {
    exerciseName: string
    painLocation: string
    painIntensity: number // 1 a 10
    availableEquipment?: string[]
    exerciseNotes?: string
  }): Promise<AiServiceResponse<PainAdaptorResult>> {
    const cacheKey = `pain_${simpleHash(JSON.stringify(params))}`
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

    const promptText = `
Ejercicio actual: ${params.exerciseName}
Zona de dolor/molestia: ${params.painLocation}
Intensidad del dolor (1-10): ${params.painIntensity}
Equipamiento disponible: ${params.availableEquipment?.join(', ') || 'Gimnasio comercial completo'}
Detalles adicionales: ${params.exerciseNotes || 'Ninguno'}
    `.trim()

    const { text, metrics } = await callAnthropicApi({
      modelTier: 'haiku',
      system: PAIN_ADAPTOR_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: promptText }],
      temperature: 0.1,
      maxTokens: 600,
    })

    const parsed = extractAndParseJson<PainAdaptorResult>(text)
    await setCachedAiResponse(cacheKey, parsed, 7 * 24 * 60 * 60 * 1000) // 7 días TTL

    return { data: parsed, metrics }
  },

  // =========================================================================
  // 3. Smart Macro Closer - Cierra tus Macros (Claude 3.5 Haiku)
  // =========================================================================
  async closeMacros(params: {
    remainingCalories: number
    remainingProtein: number
    remainingCarbs: number
    remainingFat: number
    dietaryPreference?: string // ej. vegano, sin lactosa, keto
    availableTimeMinutes?: number
  }): Promise<AiServiceResponse<MacroCloserResult>> {
    const cacheKey = `macro_closer_${simpleHash(JSON.stringify(params))}`
    const cached = await getCachedAiResponse<MacroCloserResult>(cacheKey)

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

    const promptText = `
Macros y calorías restantes hoy:
- Calorías: ${Math.round(params.remainingCalories)} kcal
- Proteína: ${Math.round(params.remainingProtein)} g
- Carbohidratos: ${Math.round(params.remainingCarbs)} g
- Grasas: ${Math.round(params.remainingFat)} g
Preferencia dietaria: ${params.dietaryPreference || 'Estándar'}
Tiempo disponible: ${params.availableTimeMinutes || 10} minutos
    `.trim()

    const { text, metrics } = await callAnthropicApi({
      modelTier: 'haiku',
      system: MACRO_CLOSER_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: promptText }],
      temperature: 0.2,
      maxTokens: 800,
    })

    const parsed = extractAndParseJson<MacroCloserResult>(text)
    await setCachedAiResponse(cacheKey, parsed, 12 * 60 * 60 * 1000) // 12 horas TTL

    return { data: parsed, metrics }
  },

  // =========================================================================
  // 4. Smart Deload Advisor - Predicción de Fatiga (Claude 3.5 Haiku)
  // =========================================================================
  async evaluateDeload(params: {
    weeksTrainingConsecutive: number
    averageRpeLast2Weeks: number
    recentWorkoutsCount: number
    hasJointPain: boolean
    subjectiveFatigueScore: number // 1-10
    isPerformanceStalled: boolean
  }): Promise<AiServiceResponse<DeloadAdviceResult>> {
    const promptText = `
Historial de entrenamiento reciente:
- Semanas consecutivas entrenando: ${params.weeksTrainingConsecutive}
- RPE promedio últimas 2 semanas: ${params.averageRpeLast2Weeks}
- Sesiones completadas recientemente: ${params.recentWorkoutsCount}
- Presencia de molestias articulares: ${params.hasJointPain ? 'Sí' : 'No'}
- Fatiga subjetiva / calidad de sueño (1-10): ${params.subjectiveFatigueScore}
- Estancamiento o bajada en cargas/reps: ${params.isPerformanceStalled ? 'Sí' : 'No'}
    `.trim()

    const { text, metrics } = await callAnthropicApi({
      modelTier: 'haiku',
      system: DELOAD_ADVISOR_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: promptText }],
      temperature: 0.1,
      maxTokens: 500,
    })

    const parsed = extractAndParseJson<DeloadAdviceResult>(text)
    return { data: parsed, metrics }
  },

  // =========================================================================
  // 5. Escáner de Tablas Nutricionales y Calidad (Claude 3.5 Sonnet Vision)
  // =========================================================================
  async scanNutritionLabel(
    imageUriOrBase64: string
  ): Promise<AiServiceResponse<NutritionalLabelResult>> {
    // 1. Optimizar y comprimir imagen en cliente a 1024x1024 / JPEG 0.7
    const optimized = await optimizeImageForVision(imageUriOrBase64, 1024, 1024, 0.7)

    const { text, metrics } = await callAnthropicApi({
      modelTier: 'sonnet',
      system: NUTRITION_LABEL_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: optimized.mediaType,
                data: optimized.base64,
              },
            },
            {
              type: 'text',
              text: 'Transcribe fielmente los valores nutricionales de la columna Por 100g/ml y el tamaño de envase/porción visible. Si no hay lista de ingredientes visible, no inventes ingredientes.',
            },
          ],
        },
      ],
      temperature: 0.1,
      maxTokens: 2000,
    })

    const parsed = extractAndParseJson<NutritionalLabelResult>(text)
    return { data: parsed, metrics }
  },

  // =========================================================================
  // 6. Escáner de Plato de Comida (Claude Haiku 4.5 Vision)
  // =========================================================================
  async scanMealPlate(imageUriOrBase64: string): Promise<AiServiceResponse<FoodVisionResult>> {
    const optimized = await optimizeImageForVision(imageUriOrBase64, 1024, 1024, 0.7)

    const { text, metrics } = await callAnthropicApi({
      modelTier: 'haiku',
      system: FOOD_VISION_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: optimized.mediaType,
                data: optimized.base64,
              },
            },
            {
              type: 'text',
              text: 'Identifica los alimentos de este plato, calcula sus gramos y macros.',
            },
          ],
        },
      ],
      temperature: 0.2,
      maxTokens: 2000,
    })

    const parsed = extractAndParseJson<FoodVisionResult>(text)
    return { data: parsed, metrics }
  },

  // =========================================================================
  // 7. Natural Meal Parser - Voz / Texto Libre (Claude 3.5 Haiku)
  // =========================================================================
  async parseNaturalMeal(textDescription: string): Promise<AiServiceResponse<NaturalMealParseResult>> {
    const cacheKey = `meal_parse_${simpleHash(textDescription.toLowerCase().trim())}`
    const cached = await getCachedAiResponse<NaturalMealParseResult>(cacheKey)

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

    const { text, metrics } = await callAnthropicApi({
      modelTier: 'haiku',
      system: NATURAL_MEAL_PARSER_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: textDescription }],
      temperature: 0.0,
      maxTokens: 500,
    })

    const parsed = extractAndParseJson<NaturalMealParseResult>(text)
    parsed.rawText = textDescription
    await setCachedAiResponse(cacheKey, parsed, 30 * 24 * 60 * 60 * 1000) // 30 días TTL

    return { data: parsed, metrics }
  },

  // =========================================================================
  // 8. Motor de Sobrecarga Progresiva (Claude 3.5 Haiku)
  // =========================================================================
  async recommendNextLoad(params: {
    exerciseName: string
    lastWeightKg: number
    lastReps: number
    lastRpe: number
    targetRpe?: number
    isUpperBody?: boolean
  }): Promise<AiServiceResponse<LoadAdvisorResult>> {
    const promptText = `
Ejercicio: ${params.exerciseName}
Última serie realizada: ${params.lastWeightKg} kg x ${params.lastReps} reps @ RPE ${params.lastRpe}
RPE Objetivo: ${params.targetRpe || 8.5}
Tipo de movimiento: ${params.isUpperBody ? 'Torso / Tren Superior' : 'Pierna / Tren Inferior'}
    `.trim()

    const { text, metrics } = await callAnthropicApi({
      modelTier: 'haiku',
      system: LOAD_ADVISOR_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: promptText }],
      temperature: 0.1,
      maxTokens: 400,
    })

    const parsed = extractAndParseJson<LoadAdvisorResult>(text)
    return { data: parsed, metrics }
  },

  // =========================================================================
  // 9. Asistente Biomecánico y Nutricional en Vivo (Claude 3.5 Haiku)
  // =========================================================================
  async chatWithCoach(
    conversation: AiChatMessage[],
    context?: {
      userGoal?: string
      experienceLevel?: string
      currentRoutineName?: string
    }
  ): Promise<AiServiceResponse<AiChatMessage>> {
    const contextPrefix = context
      ? `[Contexto Atleta: Meta=${context.userGoal || 'Hipertrofia'}, Nivel=${context.experienceLevel || 'Intermedio'}, Rutina=${context.currentRoutineName || 'General'}]\n\n`
      : ''

    const formattedMessages = conversation.map((msg, idx) => {
      let content = msg.content
      if (idx === 0 && contextPrefix) {
        content = `${contextPrefix}${content}`
      }
      return {
        role: msg.role === 'user' ? ('user' as const) : ('assistant' as const),
        content,
      }
    })

    const { text, metrics } = await callAnthropicApi({
      modelTier: 'haiku',
      system: BIOMECHANICAL_COACH_SYSTEM_PROMPT,
      messages: formattedMessages,
      temperature: 0.3,
      maxTokens: 600,
    })

    const assistantMessage: AiChatMessage = {
      id: `ai-msg-${Date.now()}`,
      role: 'assistant',
      content: text,
      timestamp: Date.now(),
    }

    return { data: assistantMessage, metrics }
  },

  // =========================================================================
  // Métricas y Gestión de Caché
  // =========================================================================
  async getUsageStats() {
    return getLifetimeStats()
  },

  async clearCache() {
    return clearAiCache()
  },
}
