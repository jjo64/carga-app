import { z } from 'zod'
import { supabase } from '@/lib/supabase'
import {
  AiModelTier,
  AnthropicMessage,
  AnthropicSystemBlock,
  AiUsageMetrics,
} from './types'
import { recordApiCall } from './cache'

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages'
const ANTHROPIC_VERSION = '2023-06-01'

export class AiParseError extends Error {
  constructor(public zodError: z.ZodError, public rawText: string) {
    super(`[AiParse] Validation failed: ${JSON.stringify(zodError.flatten())}`)
    this.name = 'AiParseError'
  }
}

export interface AnthropicTool {
  name: string
  description?: string
  input_schema: {
    type: 'object'
    properties: Record<string, any>
    required?: string[]
    [key: string]: any
  }
}

export interface AnthropicToolChoice {
  type: 'auto' | 'any' | 'tool'
  name?: string
}

interface AnthropicModelItem {
  id: string
  display_name?: string
  capabilities?: {
    image_input?: { supported?: boolean }
  }
}

let discoveredModels: string[] | null = null

/**
 * Consulta la API de Anthropic (GET /v1/models) para obtener la lista exacta de modelos
 * habilitados en la cuenta y workspace del usuario.
 */
export async function getAvailableModelsList(apiKey?: string): Promise<string[]> {
  if (discoveredModels && discoveredModels.length > 0) {
    return discoveredModels
  }

  const resolvedApiKey = getAnthropicApiKey(apiKey)
  if (!resolvedApiKey) return []

  const workspaceId =
    process.env.EXPO_PUBLIC_ANTHROPIC_WORKSPACE_ID ||
    process.env.ANTHROPIC_WORKSPACE_ID ||
    ''

  const headers: Record<string, string> = {
    'anthropic-version': ANTHROPIC_VERSION,
    'x-api-key': resolvedApiKey,
    'anthropic-dangerous-direct-browser-access': 'true',
  }
  if (workspaceId.trim()) {
    headers['anthropic-workspace-id'] = workspaceId.trim()
  }

  try {
    const res = await fetch('https://api.anthropic.com/v1/models', {
      method: 'GET',
      headers,
    })
    if (res.ok) {
      const data: { data?: AnthropicModelItem[] } = await res.json()
      if (data?.data && Array.isArray(data.data) && data.data.length > 0) {
        discoveredModels = data.data.map((m) => m.id)
        return discoveredModels
      }
    } else {
      const err = await res.text()
      console.warn('[AiClient] Diagnóstico /v1/models:', err)
    }
  } catch (e) {
    console.warn('[AiClient] Error en diagnóstico /v1/models:', e)
  }

  return []
}

// Candidatos aislados estrictamente por Tier (sin fallbacks cruzados degradados)
const SONNET_CANDIDATES = [
  process.env.EXPO_PUBLIC_ANTHROPIC_SONNET_MODEL,
  'claude-sonnet-5',
  'claude-sonnet-4-6',
  'claude-sonnet-4-5',
  'claude-3-7-sonnet-20250219',
  'claude-3-5-sonnet-20241022',
  'claude-3-5-sonnet-20240620',
].filter(Boolean) as string[]

const HAIKU_CANDIDATES = [
  process.env.EXPO_PUBLIC_ANTHROPIC_HAIKU_MODEL,
  'claude-haiku-4-5-20251001',
  'claude-haiku-4-5',
  'claude-3-5-haiku-20241022',
  'claude-3-haiku-20240307',
].filter(Boolean) as string[]

let activeWorkingSonnetModel: string | null = null
let activeWorkingHaikuModel: string | null = null

/**
 * Resetea los modelos activos en memoria para forzar re-negociación en caso de fallo
 */
export function resetActiveWorkingModels() {
  activeWorkingSonnetModel = null
  activeWorkingHaikuModel = null
}

export const MODEL_HAIKU = 'claude-haiku-4-5-20251001'
export const MODEL_SONNET = 'claude-sonnet-5'

// Costes por millón de tokens (USD)
const PRICING = {
  haiku: {
    input: 1.0,
    output: 5.0,
    cacheWrite: 1.25,
    cacheRead: 0.10,
  },
  sonnet: {
    input: 2.0,
    output: 10.0,
    cacheWrite: 2.50,
    cacheRead: 0.20,
  },
}

export interface CallAnthropicOptions {
  modelTier?: AiModelTier
  actionType?: string
  system: AnthropicSystemBlock[]
  messages: AnthropicMessage[]
  tools?: AnthropicTool[]
  toolChoice?: AnthropicToolChoice
  maxTokens?: number
  temperature?: number
  apiKey?: string
}

export interface AnthropicContentBlock {
  type: string
  text?: string
  id?: string
  name?: string
  input?: any
}

export interface AnthropicRawResponse {
  content: AnthropicContentBlock[]
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
 * Detecta de forma estricta si un modelo pertenece a la familia Claude 5
 */
export function isClaude5Model(candidate: string): boolean {
  return /^claude-(sonnet|opus|haiku)-5/.test(candidate) || candidate.startsWith('claude-fable-5')
}

/**
 * Extrae y parsea JSON limpio a partir de una respuesta de texto de LLM,
 * con validación runtime estricta mediante Zod Schema cuando se provee.
 */
export function extractAndParseJson<T>(
  rawText: string,
  schema?: z.ZodType<T>,
  modelUsed?: string
): T {
  let raw: any

  try {
    raw = JSON.parse(rawText)
  } catch {
    // Intentar buscar bloque de código ```json ... ```
    const jsonMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
    if (jsonMatch && jsonMatch[1]) {
      try {
        raw = JSON.parse(jsonMatch[1])
      } catch {}
    }

    if (raw === undefined) {
      // Intentar extraer el contenido entre la primera llave { o corchete [ y la última } o ]
      const firstBrace = rawText.indexOf('{')
      const lastBrace = rawText.lastIndexOf('}')
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        const slice = rawText.substring(firstBrace, lastBrace + 1)
        try {
          raw = JSON.parse(slice)
        } catch {
          // Limpiar comas finales trailing commas
          const sanitized = slice.replace(/,\s*([}\]])/g, '$1')
          try {
            raw = JSON.parse(sanitized)
          } catch {}
        }
      }
    }

    if (raw === undefined) {
      const modelInfo = modelUsed ? ` [Modelo: ${modelUsed}]` : ''
      throw new Error(`[AiClient]${modelInfo} No se pudo parsear el JSON de la respuesta: ${rawText.slice(0, 150)}...`)
    }
  }

  // Validación de runtime con Zod
  if (schema) {
    const result = schema.safeParse(raw)
    if (!result.success) {
      console.error('[AiParse] Validation failed:', result.error.flatten())
      throw new AiParseError(result.error, rawText)
    }
    return result.data
  }

  return raw as T
}

/**
 * Realiza una petición segura al API de Anthropic a través del proxy en Supabase Edge Functions,
 * con fallback directo en desarrollo local si no hay conexión al backend.
 */
export async function callAnthropicApi(options: CallAnthropicOptions): Promise<{
  text: string
  metrics: AiUsageMetrics
  toolUse?: { name: string; input: any }
}> {
  const {
    modelTier = 'haiku',
    actionType = 'general',
    system,
    messages,
    tools,
    toolChoice,
    maxTokens = 1000,
    temperature = 0.1,
    apiKey,
  } = options

  const startTime = Date.now()

  // 1. INTENTO PRIMARIO SEGURO: Invocar Edge Function ai-proxy en Supabase
  try {
    const { data: proxyData, error: proxyError } = await supabase.functions.invoke('ai-proxy', {
      body: {
        modelTier,
        actionType,
        system,
        messages,
        tools,
        toolChoice,
        maxTokens,
        temperature,
      },
    })

    if (!proxyError && proxyData && proxyData.text) {
      if (proxyData.metrics) {
        await recordApiCall(
          proxyData.metrics.inputTokens + proxyData.metrics.outputTokens,
          proxyData.metrics.estimatedCostUsd
        )
      }
      return proxyData
    }

    if (proxyError && proxyError.message && proxyError.message.includes('429')) {
      throw new Error(proxyData?.error || 'Has alcanzado el límite de uso diario de IA.')
    }
  } catch (proxyErr: any) {
    if (proxyErr.message && (proxyErr.message.includes('límite') || proxyErr.message.includes('429') || proxyErr.message.includes('RATE_LIMIT'))) {
      throw proxyErr
    }
    console.warn('[AiClient] Proxy de Supabase no disponible, intentando llamada de desarrollo local:', proxyErr?.message || proxyErr)
  }

  // 2. FALLBACK DE DESARROLLO LOCAL (Si se provee clave local en .env)
  const resolvedApiKey = getAnthropicApiKey(apiKey)

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

  // Lista de modelos candidatos según el tier estricto
  const activeWorkingModel = modelTier === 'sonnet' ? activeWorkingSonnetModel : activeWorkingHaikuModel
  const baseCandidates = modelTier === 'sonnet' ? SONNET_CANDIDATES : HAIKU_CANDIDATES

  const candidateList = activeWorkingModel
    ? [activeWorkingModel, ...baseCandidates.filter((c) => c !== activeWorkingModel)]
    : baseCandidates

  let lastErrorText = ''
  let finalResponse: Response | null = null
  let usedModelName = candidateList[0]

  for (const candidate of candidateList) {
    usedModelName = candidate

    const payload: Record<string, any> = {
      model: candidate,
      max_tokens: maxTokens,
      system,
      messages,
    }

    if (tools && tools.length > 0) {
      payload.tools = tools
      if (toolChoice) {
        payload.tool_choice = toolChoice
      }
    }

    // Regla estricta de Claude 5 vs Claude 3.5
    const isClaude5 = isClaude5Model(candidate)
    if (!isClaude5 && typeof temperature === 'number') {
      payload.temperature = temperature
    }

    try {
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

      // Invalidad el modelo activo si falló
      if (modelTier === 'sonnet' && activeWorkingSonnetModel === candidate) {
        activeWorkingSonnetModel = null
      } else if (modelTier === 'haiku' && activeWorkingHaikuModel === candidate) {
        activeWorkingHaikuModel = null
      }

      if (
        (response.status === 404 && errorText.includes('not_found_error')) ||
        (response.status === 400 && errorText.includes('temperature'))
      ) {
        continue
      }

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
    } catch (fetchErr: any) {
      if (fetchErr.message && fetchErr.message.includes('Anthropic API Error')) {
        throw fetchErr
      }
      lastErrorText = fetchErr?.message || String(fetchErr)
      console.warn(`[AiClient] Error de red con modelo ${candidate}:`, lastErrorText)
    }
  }

  if (!finalResponse) {
    throw new Error(`Anthropic API Error: Ningún modelo compatible encontrado para ${modelTier}. Detalle: ${lastErrorText}`)
  }

  const data: AnthropicRawResponse = await finalResponse.json()
  const latencyMs = Date.now() - startTime

  // Buscar bloque de tool_use o bloque de texto estándar
  const toolUseBlock = data.content?.find((c) => c.type === 'tool_use')
  let text = ''
  let toolUseData: { name: string; input: any } | undefined

  if (toolUseBlock && toolUseBlock.input) {
    text = typeof toolUseBlock.input === 'string' ? toolUseBlock.input : JSON.stringify(toolUseBlock.input)
    toolUseData = {
      name: toolUseBlock.name || '',
      input: toolUseBlock.input,
    }
  } else {
    text = data.content?.find((c) => c.type === 'text')?.text || data.content?.[0]?.text || ''
  }

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
    toolUse: toolUseData,
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

  if (systemText.includes('Carga Coach')) {
    return JSON.stringify({
      mainAnswer: 'Mantén una retracción escapular activa y desciende la barra controladamente en 2-3 segundos.',
      technicalCue: 'Codos a 45 grados respecto al torso para proteger el manguito rotador.',
      immediateAction: 'En la siguiente serie, reduce 2.5kg y busca máxima tensión en el estiramiento.',
      safetyWarning: null,
      referralFlag: false,
    })
  }

  return JSON.stringify({ message: 'Respuesta generada correctamente' })
}
