import {
  AiModelTier,
  AnthropicMessage,
  AnthropicSystemBlock,
  AiUsageMetrics,
} from './types'
import { recordApiCall } from './cache'

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages'
const ANTHROPIC_VERSION = '2023-06-01'

const SONNET_CANDIDATES = [
  process.env.EXPO_PUBLIC_ANTHROPIC_SONNET_MODEL,
  'claude-3-5-sonnet-20240620',
  'claude-3-5-sonnet-20241022',
  'claude-3-7-sonnet-20250219',
  'claude-3-sonnet-20240229',
  'claude-3-5-haiku-20241022',
  'claude-3-haiku-20240307',
].filter(Boolean) as string[]

const HAIKU_CANDIDATES = [
  process.env.EXPO_PUBLIC_ANTHROPIC_HAIKU_MODEL,
  'claude-3-5-haiku-20241022',
  'claude-3-haiku-20240307',
  'claude-3-5-sonnet-20240620',
].filter(Boolean) as string[]

let activeWorkingSonnetModel: string | null = null
let activeWorkingHaikuModel: string | null = null

export const MODEL_HAIKU = 'claude-3-haiku-20240307'
export const MODEL_SONNET = 'claude-3-5-sonnet-20240620'

// Costes por millón de tokens (USD)
const PRICING = {
  haiku: {
    input: 0.8,
    output: 4.0,
    cacheWrite: 1.0,
    cacheRead: 0.08,
  },
  sonnet: {
    input: 3.0,
    output: 15.0,
    cacheWrite: 3.75,
    cacheRead: 0.3,
  },
}

export interface CallAnthropicOptions {
  modelTier?: AiModelTier
  system: AnthropicSystemBlock[]
  messages: AnthropicMessage[]
  maxTokens?: number
  temperature?: number
  apiKey?: string
}

export interface AnthropicRawResponse {
  content: Array<{ type: string; text?: string }>
  usage: {
    input_tokens: number
    output_tokens: number
    cache_creation_input_tokens?: number
    cache_read_input_tokens?: number
  }
}

/**
 * Obtiene la API Key de Anthropic desde variables de entorno o configuración
 */
export function getAnthropicApiKey(customKey?: string): string {
  if (customKey && customKey.trim().length > 5) {
    return customKey.trim()
  }
  return (
    process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY ||
    process.env.ANTHROPIC_API_KEY ||
    process.env.EXPO_PUBLIC_AI_API_KEY ||
    ''
  )
}

/**
 * Extrae y parsea JSON limpio a partir de una respuesta de texto de LLM
 */
export function extractAndParseJson<T>(rawText: string): T {
  try {
    return JSON.parse(rawText) as T
  } catch {
    // Intentar buscar bloque de código ```json ... ```
    const jsonMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
    if (jsonMatch && jsonMatch[1]) {
      try {
        return JSON.parse(jsonMatch[1]) as T
      } catch (err) {
        // Continuar
      }
    }

    // Intentar extraer el contenido entre la primera llave { y la última }
    const firstBrace = rawText.indexOf('{')
    const lastBrace = rawText.lastIndexOf('}')
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      const slice = rawText.substring(firstBrace, lastBrace + 1)
      return JSON.parse(slice) as T
    }

    throw new Error(`[AiClient] No se pudo parsear el JSON de la respuesta: ${rawText.slice(0, 100)}...`)
  }
}

/**
 * Realiza una petición directa al API de Anthropic con Prompt Caching y Model Tiering
 */
export async function callAnthropicApi(options: CallAnthropicOptions): Promise<{
  text: string
  metrics: AiUsageMetrics
}> {
  const {
    modelTier = 'haiku',
    system,
    messages,
    maxTokens = 1000,
    temperature = 0.1,
    apiKey,
  } = options

  const resolvedApiKey = getAnthropicApiKey(apiKey)
  const startTime = Date.now()

  // Si no hay API key configurada, usamos el motor de fallback simulado
  if (!resolvedApiKey) {
    console.warn('[AiClient] EXPO_PUBLIC_ANTHROPIC_API_KEY no configurada. Usando fallback inteligente.')
    const mockRes = getLocalFallbackResponse(system, messages)
    return {
      text: mockRes,
      metrics: {
        inputTokens: 120,
        outputTokens: 80,
        cacheCreationTokens: 0,
        cacheReadTokens: 0,
        estimatedCostUsd: 0,
        latencyMs: Date.now() - startTime,
        modelUsed: `${modelTier} (local-fallback)`,
        fromLocalCache: false,
      },
    }
  }

  const workspaceId =
    process.env.EXPO_PUBLIC_ANTHROPIC_WORKSPACE_ID ||
    process.env.ANTHROPIC_WORKSPACE_ID ||
    ''

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-api-key': resolvedApiKey,
    'anthropic-version': ANTHROPIC_VERSION,
    'anthropic-dangerous-direct-browser-access': 'true',
  }

  if (workspaceId.trim()) {
    headers['anthropic-workspace-id'] = workspaceId.trim()
  }

  // Lista de modelos candidatos según el tier
  const activeWorkingModel = modelTier === 'sonnet' ? activeWorkingSonnetModel : activeWorkingHaikuModel
  const candidateList = activeWorkingModel
    ? [activeWorkingModel]
    : modelTier === 'sonnet'
    ? SONNET_CANDIDATES
    : HAIKU_CANDIDATES

  let lastErrorText = ''
  let finalResponse: Response | null = null
  let usedModelName = candidateList[0]

  for (const candidate of candidateList) {
    usedModelName = candidate
    const payload = {
      model: candidate,
      max_tokens: maxTokens,
      temperature,
      system,
      messages,
    }

    const response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    })

    if (response.ok) {
      finalResponse = response
      if (modelTier === 'sonnet') {
        activeWorkingSonnetModel = candidate
      } else {
        activeWorkingHaikuModel = candidate
      }
      break
    }

    const errorText = await response.text()
    lastErrorText = errorText
    console.warn(`[AiClient] Modelo ${candidate} falló con HTTP ${response.status}:`, errorText)

    // Si es error 404 (modelo no encontrado en la cuenta), intentamos el siguiente candidato
    if (response.status === 404 && errorText.includes('not_found_error')) {
      continue
    }

    // Si es otro error (autenticación, saldo, workspace), no reintentar modelos
    if (response.status === 401) {
      throw new Error('API Key de Anthropic inválida. Por favor verifica tu clave en tu archivo .env.local')
    } else if (response.status === 400 && errorText.includes('credit_balance')) {
      throw new Error('Tu cuenta de Anthropic no tiene créditos cargados. Carga saldo en console.anthropic.com/settings/plans')
    } else if (response.status === 400 && errorText.includes('anthropic-workspace-id')) {
      throw new Error(
        'Tu API Key requiere un Workspace ID. En console.anthropic.com/settings/workspaces copia el ID de tu espacio de trabajo y agrégalo en tu .env.local como: EXPO_PUBLIC_ANTHROPIC_WORKSPACE_ID=wrkspc_...'
      )
    }

    throw new Error(`Anthropic API Error (${response.status}): ${errorText}`)
  }

  if (!finalResponse) {
    throw new Error(`Anthropic API Error: Ningún modelo compatible encontrado para ${modelTier}. Detalle: ${lastErrorText}`)
  }

  const data: AnthropicRawResponse = await finalResponse.json()
  const latencyMs = Date.now() - startTime
  const text = data.content?.[0]?.text || ''

  const inputTokens = data.usage?.input_tokens || 0
  const outputTokens = data.usage?.output_tokens || 0
  const cacheCreationTokens = data.usage?.cache_creation_input_tokens || 0
  const cacheReadTokens = data.usage?.cache_read_input_tokens || 0

  const pricing = modelTier === 'sonnet' ? PRICING.sonnet : PRICING.haiku
  const cost =
    (inputTokens / 1000000) * pricing.input +
    (outputTokens / 1000000) * pricing.output +
    (cacheCreationTokens / 1000000) * pricing.cacheWrite +
    (cacheReadTokens / 1000000) * pricing.cacheRead

  await recordApiCall(inputTokens + outputTokens, cost)

  return {
    text,
    metrics: {
      inputTokens,
      outputTokens,
      cacheCreationTokens,
      cacheReadTokens,
      estimatedCostUsd: cost,
      latencyMs,
      modelUsed: usedModelName,
      fromLocalCache: false,
    },
  }
}

/**
 * Fallback local cuando no hay conexión o no hay API key para no romper el flujo
 */
function getLocalFallbackResponse(
  system: AnthropicSystemBlock[],
  messages: AnthropicMessage[]
): string {
  const systemText = system.map((s) => s.text).join(' ')
  const lastUserMsg = messages[messages.length - 1]?.content
  const textPrompt = typeof lastUserMsg === 'string' ? lastUserMsg : JSON.stringify(lastUserMsg)

  if (systemText.includes('motor de registro de series por voz')) {
    // Regex simple de rescate
    const kgMatch = textPrompt.match(/(\d+(?:[.,]\d+)?)\s*(?:kg|kilos|k)/i)
    const repsMatch = textPrompt.match(/(\d+)\s*(?:reps|repeticiones|rep)/i)
    const rpeMatch = textPrompt.match(/rpe\s*(\d+(?:[.,]\d+)?)/i)

    const weightKg = kgMatch ? parseFloat(kgMatch[1].replace(',', '.')) : 80
    const reps = repsMatch ? parseInt(repsMatch[1], 10) : 10
    const rpe = rpeMatch ? parseFloat(rpeMatch[1].replace(',', '.')) : 8

    return JSON.stringify({
      exerciseName: null,
      weightKg,
      reps,
      rpe,
      rir: rpe ? Math.max(0, 10 - rpe) : null,
      setNum: null,
      notes: 'Registro procesado localmente',
      confidence: 0.9,
    })
  }

  if (systemText.includes('Adaptador de Molestias')) {
    return JSON.stringify({
      originalExercise: 'Ejercicio reportado',
      painLocation: 'Zona articular',
      painIntensity: 6,
      suggestedExercise: {
        name: 'Variante con Agarre Neutro / Polea',
        equipment: 'Mancuernas / Polea',
        targetMuscles: ['Músculo principal'],
      },
      biomechanicalReason:
        'Reduce el estrés por torque articular al permitir rotación neutra y trayectoria libre.',
      setupAdjustments: [
        'Ajusta el rango de movimiento al punto antes de sentir dolor',
        'Realiza una fase excéntrica lenta y controlada de 3 segundos',
      ],
      replacementSets: 3,
      replacementReps: '10-12',
      suggestedRestSeconds: 90,
    })
  }

  if (systemText.includes('Cierra tus Macros')) {
    return JSON.stringify({
      remainingTarget: { calories: 350, protein: 35, carbs: 20, fat: 8 },
      suggestions: [
        {
          id: 'sug-1',
          name: 'Yogur Griego 0% con Whey y Frutos Rojos',
          prepTimeMinutes: 2,
          difficulty: 'rápido',
          ingredients: [
            { name: 'Yogur griego natural 0%', amount: '200g', gramsApprox: 200 },
            { name: 'Proteína Whey (aislado)', amount: '25g', gramsApprox: 25 },
            { name: 'Arándanos o frambuesas', amount: '50g', gramsApprox: 50 },
          ],
          macros: { calories: 230, protein: 36, carbs: 14, fat: 2 },
          quickRecipeInstructions:
            'Mezcla el yogur con el scoop de proteína hasta obtener consistencia de mousse y añade los arándanos por encima.',
        },
        {
          id: 'sug-2',
          name: 'Tortilla de Claras con Pavo y Tostada Integral',
          prepTimeMinutes: 5,
          difficulty: 'fácil',
          ingredients: [
            { name: 'Claras de huevo', amount: '180ml', gramsApprox: 180 },
            { name: 'Pechuga de pavo 90%+', amount: '60g', gramsApprox: 60 },
            { name: 'Pan integral', amount: '1 rebanada (30g)', gramsApprox: 30 },
          ],
          macros: { calories: 215, protein: 31, carbs: 16, fat: 3 },
          quickRecipeInstructions:
            'Cocina las claras en sartén antiadherente con el pavo en tiras y acompaña con la tostada.',
        },
      ],
      nutritionalTip: 'Prioriza fuentes de proteína magras de absorción rápida antes de dormir.',
    })
  }

  if (systemText.includes('Tablas Nutricionales')) {
    return JSON.stringify({
      productName: 'Alimento Escaneado',
      brand: 'Marca Local',
      per100g: {
        calories: 220,
        protein: 18,
        carbs: 12,
        fat: 10,
        sugars: 2.5,
        saturatedFat: 2.1,
        sodiumMg: 350,
        fiber: 4,
      },
      ingredientsList: ['Proteína de leche', 'Avena', 'Cacao', 'Edulcorante (Sucralosa)'],
      ultraProcessedScore: 3,
      classification: 'moderate',
      warningFlags: [],
      positiveHighlights: ['Alto contenido de proteína', 'Bajo en azúcares'],
      cleanerAlternativeSuggestion: null,
    })
  }

  return JSON.stringify({ message: 'Respuesta generada correctamente' })
}
