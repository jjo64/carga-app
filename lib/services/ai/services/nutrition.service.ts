import {
  MacroCloserResult,
  NutritionalLabelResult,
  FoodVisionResult,
  NaturalMealParseResult,
  NutritionHealthAuditResult,
  AthleteProfileContext,
  AiServiceResponse,
  AiUsageMetrics,
} from '../types'
import {
  MACRO_CLOSER_SYSTEM_PROMPT,
  NUTRITION_LABEL_SYSTEM_PROMPT,
  FOOD_VISION_SYSTEM_PROMPT,
  NATURAL_MEAL_PARSER_SYSTEM_PROMPT,
  NUTRITION_HEALTH_AUDIT_SYSTEM_PROMPT,
} from '../prompts'
import { callAnthropicApi, extractAndParseJson } from '../client'
import {
  getCachedAiResponse,
  setCachedAiResponse,
  simpleHash,
  stableStringify,
} from '../cache'
import { optimizeImageForVision } from '../imageOptimizer'
import {
  sanitizeNutritionalLabelValues,
  enrichNaturalMealWithOpenFoodFacts,
} from '../../nutritionUtils'
import { formatAthleteProfileContext } from '../athleteContext'
import {
  macroCloserResultSchema,
  nutritionalLabelResultSchema,
  foodVisionResultSchema,
  naturalMealParseResultSchema,
  nutritionHealthAuditResultSchema,
  NUTRITION_LABEL_TOOL,
} from '../schemas'

/**
 * Escáner de Tablas Nutricionales y Calidad (Claude Haiku 4.5 Vision)
 * Con Tool Calling, Validación Zod y Sanitización Programática Post-Parse de kJ/kcal.
 */
export async function scanNutritionLabel(
  imageUriOrBase64: string
): Promise<AiServiceResponse<NutritionalLabelResult>> {
  const optimized = await optimizeImageForVision(imageUriOrBase64, 1024, 1024, 0.7)

  const { text, metrics } = await callAnthropicApi({
    modelTier: 'haiku',
    actionType: 'scan_label',
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
    tools: [NUTRITION_LABEL_TOOL],
    toolChoice: { type: 'tool', name: 'parse_nutrition_label' },
    temperature: 0.1,
    maxTokens: 2000,
  })

  const rawParsed = extractAndParseJson<NutritionalLabelResult>(
    text,
    nutritionalLabelResultSchema,
    metrics.modelUsed
  )
  const sanitized = sanitizeNutritionalLabelValues(rawParsed)

  return { data: sanitized, metrics }
}

/**
 * Escáner de Plato de Comida (Claude Haiku 4.5 Vision)
 */
export async function scanMealPlate(
  imageUriOrBase64: string
): Promise<AiServiceResponse<FoodVisionResult>> {
  const optimized = await optimizeImageForVision(imageUriOrBase64, 1024, 1024, 0.7)

  const { text, metrics } = await callAnthropicApi({
    modelTier: 'haiku',
    actionType: 'scan_plate',
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

  const parsed = extractAndParseJson<FoodVisionResult>(
    text,
    foodVisionResultSchema,
    metrics.modelUsed
  )
  return { data: parsed, metrics }
}

/**
 * Natural Meal Parser Híbrido (Extracción LLM + Open Food Facts API)
 * Con Caché Desacoplado: cachea solo extracción de entidades del LLM con stableStringify.
 */
export async function parseNaturalMeal(
  textDescription: string,
  options?: { skipOffEnrichment?: boolean }
): Promise<AiServiceResponse<NaturalMealParseResult>> {
  const cacheKey = `meal_entities_v2_${simpleHash(stableStringify(textDescription.toLowerCase().trim()))}`
  let rawParsed = await getCachedAiResponse<NaturalMealParseResult>(cacheKey)
  let metrics: AiUsageMetrics

  if (!rawParsed) {
    const aiRes = await callAnthropicApi({
      modelTier: 'haiku',
      actionType: 'parse_meal',
      system: NATURAL_MEAL_PARSER_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: textDescription }],
      temperature: 0.0,
      maxTokens: 600,
    })
    metrics = aiRes.metrics
    rawParsed = extractAndParseJson<NaturalMealParseResult>(
      aiRes.text,
      naturalMealParseResultSchema,
      metrics.modelUsed
    )
    rawParsed.rawText = textDescription
    await setCachedAiResponse(cacheKey, rawParsed, 30 * 24 * 60 * 60 * 1000) // 30 días TTL
  } else {
    metrics = {
      inputTokens: 0,
      outputTokens: 0,
      cacheCreationTokens: 0,
      cacheReadTokens: 0,
      estimatedCostUsd: 0,
      latencyMs: 5,
      modelUsed: 'local-cache-hit',
      fromLocalCache: true,
    }
  }

  const finalResult: NaturalMealParseResult = {
    ...rawParsed,
    items: rawParsed.items ? [...rawParsed.items] : [],
  }

  if (!options?.skipOffEnrichment && finalResult.items.length > 0) {
    finalResult.items = await enrichNaturalMealWithOpenFoodFacts(finalResult.items)
    finalResult.totalCalories = finalResult.items.reduce((s, it) => s + (it.calories || 0), 0)
    finalResult.totalProtein = Number(finalResult.items.reduce((s, it) => s + (it.protein || 0), 0).toFixed(1))
    finalResult.totalCarbs = Number(finalResult.items.reduce((s, it) => s + (it.carbs || 0), 0).toFixed(1))
    finalResult.totalFat = Number(finalResult.items.reduce((s, it) => s + (it.fat || 0), 0).toFixed(1))
  }

  return { data: finalResult, metrics }
}

/**
 * Smart Macro Closer - Cierra tus Macros (Claude 3.5 Haiku)
 */
export async function closeMacros(params: {
  remainingCalories: number
  remainingProtein: number
  remainingCarbs: number
  remainingFat: number
  dietaryPreference?: string
  availableTimeMinutes?: number
  athleteProfile?: AthleteProfileContext
}): Promise<AiServiceResponse<MacroCloserResult>> {
  const cacheKey = `macro_closer_v2_${simpleHash(stableStringify(params))}`
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

  const athleteContext = formatAthleteProfileContext(params.athleteProfile)
  const promptText = `
${athleteContext}Macros y calorías restantes hoy:
- Calorías: ${Math.round(params.remainingCalories)} kcal
- Proteína: ${Math.round(params.remainingProtein)} g
- Carbohidratos: ${Math.round(params.remainingCarbs)} g
- Grasas: ${Math.round(params.remainingFat)} g
Preferencia dietaria: ${params.dietaryPreference || 'Estándar'}
Tiempo disponible: ${params.availableTimeMinutes || 10} minutos
  `.trim()

  const { text, metrics } = await callAnthropicApi({
    modelTier: 'haiku',
    actionType: 'close_macros',
    system: MACRO_CLOSER_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: promptText }],
    temperature: 0.2,
    maxTokens: 800,
  })

  const parsed = extractAndParseJson<MacroCloserResult>(
    text,
    macroCloserResultSchema,
    metrics.modelUsed
  )
  await setCachedAiResponse(cacheKey, parsed, 12 * 60 * 60 * 1000) // 12 horas TTL

  return { data: parsed, metrics }
}

/**
 * Auditoría de Salud Nutricional y Micronutrientes con IA
 */
export async function auditNutritionHealth(params: {
  dayStats: {
    date: string
    calories: number
    targetCalories: number
    protein: number
    targetProtein: number
    carbs: number
    targetCarbs: number
    fat: number
    targetFat: number
    healthMetrics: {
      sugarsG: number
      saturatedFatG: number
      saltG: number
      sodiumMg: number
      fiberG: number
      ultraProcessedRatio: number
      micronutrientsMap: Record<string, { name: string; amount: number; unit: string; vrnPercent: number }>
    }
  }
  foodsList: Array<{ name: string; quantityG: number; brand?: string | null; calories: number; proteinG: number; carbsG: number; fatG: number }>
  athleteProfile?: AthleteProfileContext
}): Promise<AiServiceResponse<NutritionHealthAuditResult>> {
  const profileContext = formatAthleteProfileContext(params.athleteProfile)

  const microsSummary = Object.entries(params.dayStats.healthMetrics.micronutrientsMap)
    .map(([k, v]) => `- ${v.name}: ${v.amount.toFixed(1)} ${v.unit} (${v.vrnPercent}% VRN)`)
    .join('\n')

  const foodsSummary = params.foodsList
    .map((f) => `- ${f.name}${f.brand ? ` (${f.brand})` : ''}: ${f.quantityG}g (${f.calories} kcal, P:${f.proteinG}g, C:${f.carbsG}g, G:${f.fatG}g)`)
    .join('\n')

  const promptText = `${profileContext}Fecha evaluada: ${params.dayStats.date}
Resumen Ingesta:
- Calorías: ${params.dayStats.calories} kcal / Meta: ${params.dayStats.targetCalories} kcal (Diferencia: ${params.dayStats.calories - params.dayStats.targetCalories} kcal)
- Proteínas: ${params.dayStats.protein}g / Meta: ${params.dayStats.targetProtein}g
- Carbohidratos: ${params.dayStats.carbs}g / Meta: ${params.dayStats.targetCarbs}g
- Grasas: ${params.dayStats.fat}g / Meta: ${params.dayStats.targetFat}g

Métricas de Salud Reportadas:
- Azúcares: ${params.dayStats.healthMetrics.sugarsG}g (Límite OMS: < 35g)
- Grasas Saturadas: ${params.dayStats.healthMetrics.saturatedFatG}g
- Sal: ${params.dayStats.healthMetrics.saltG}g / Sodio: ${params.dayStats.healthMetrics.sodiumMg} mg (Límite OMS: < 5g sal / 2000mg sodio)
- Fibra Dietética: ${params.dayStats.healthMetrics.fiberG}g (Meta: > 30g)
- Ratio de Alimentos Ultraprocesados: ${params.dayStats.healthMetrics.ultraProcessedRatio}%

Micronutrientes Detectados:
${microsSummary || '(No se reportaron micronutrientes explícitos en las etiquetas; evaluar posibles carencias en base a los alimentos consumidos)'}

Alimentos Consumidos:
${foodsSummary || '(Sin comidas registradas en este día)'}

Realiza una auditoría exhaustiva de salud preventiva, destacando excesos de sal/azúcar/procesados, posibles carencias (como B12, fósforo, calcio, etc.) y recomendando alimentos enteros específicos para corregir la alimentación.`

  const { text, metrics } = await callAnthropicApi({
    modelTier: 'haiku',
    actionType: 'audit_nutrition',
    system: NUTRITION_HEALTH_AUDIT_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: promptText }],
    temperature: 0.1,
    maxTokens: 1500,
  })

  const parsed = extractAndParseJson<NutritionHealthAuditResult>(
    text,
    nutritionHealthAuditResultSchema,
    metrics.modelUsed
  )
  return { data: parsed, metrics }
}

// Aliases para máxima comodidad y compatibilidad
export const scanLabel = scanNutritionLabel
export const scanPlate = scanMealPlate
export const parseMeal = parseNaturalMeal

export const nutritionAiService = {
  scanNutritionLabel,
  scanLabel,
  scanMealPlate,
  scanPlate,
  parseNaturalMeal,
  parseMeal,
  closeMacros,
  auditNutritionHealth,
}
