/**
 * Tipos e interfaces de datos para el ecosistema de IA de Carga App.
 * Soporta multi-modelo (Haiku / Sonnet), Prompt Caching y esquemas de respuesta estrictos.
 */

export type AiModelTier = 'haiku' | 'sonnet'

export interface AnthropicMessageContent {
  type: 'text' | 'image'
  text?: string
  source?: {
    type: 'base64'
    media_type: string
    data: string
  }
  cache_control?: {
    type: 'ephemeral'
  }
}

export interface AnthropicMessage {
  role: 'user' | 'assistant'
  content: string | AnthropicMessageContent[]
}

export interface AnthropicSystemBlock {
  type: 'text'
  text: string
  cache_control?: {
    type: 'ephemeral'
  }
}

export interface AiUsageMetrics {
  inputTokens: number
  outputTokens: number
  cacheCreationTokens: number
  cacheReadTokens: number
  estimatedCostUsd: number
  latencyMs: number
  modelUsed: string
  fromLocalCache: boolean
}

// ==========================================
// 1. Hands-Free Voice Logger (Módulo Voz)
// ==========================================
export interface VoiceLogResult {
  exerciseName?: string
  weightKg: number
  reps: number
  rpe?: number
  rir?: number
  setNum?: number
  notes?: string
  confidence: number // 0.0 a 1.0
  rawTranscript: string
}

// ==========================================
// 2. Pain Adaptor (Sustituto por Molestias)
// ==========================================
export interface PainAdaptorResult {
  originalExercise: string
  painLocation: string
  painIntensity: number // 1 - 10
  suggestedExercise: {
    id?: string
    name: string
    equipment: string
    targetMuscles: string[]
  }
  biomechanicalReason: string
  setupAdjustments: string[]
  replacementSets: number
  replacementReps: string
  suggestedRestSeconds: number
}

// ==========================================
// 3. Smart Macro Closer (Cierra tus Macros)
// ==========================================
export interface MacroCloserSuggestion {
  id: string
  name: string
  prepTimeMinutes: number
  difficulty: 'fácil' | 'medio' | 'rápido'
  ingredients: Array<{
    name: string
    amount: string
    gramsApprox: number
  }>
  macros: {
    calories: number
    protein: number
    carbs: number
    fat: number
  }
  quickRecipeInstructions: string
}

export interface MacroCloserResult {
  remainingTarget: {
    calories: number
    protein: number
    carbs: number
    fat: number
  }
  suggestions: MacroCloserSuggestion[]
  nutritionalTip: string
}

// ==========================================
// 4. Smart Deload Advisor (Fatiga y Descarga)
// ==========================================
export interface DeloadAdviceResult {
  shouldDeload: boolean
  fatigueScore: number // 0 a 100
  fatigueLevel: 'low' | 'moderate' | 'high' | 'overreaching'
  indicators: string[]
  recommendation: string
  protocol: {
    volumeReductionPercent: number // ej. 40-50%
    intensityReductionPercent: number // ej. 10-20%
    durationDays: number
    focusAreas: string[]
  }
}

// ==========================================
// 5. Nutritional Label Scanner (Etiquetas e Ingredientes)
// ==========================================
export interface NutritionalLabelResult {
  productName: string
  brand?: string
  per100g: {
    calories: number
    protein: number
    carbs: number
    fat: number
    sugars: number
    saturatedFat?: number
    sodiumMg?: number
    fiber?: number
  }
  ingredientsList: string[]
  ultraProcessedScore: number // 1 (Muy natural/limpio) a 10 (Ultraprocesado extremo)
  classification: 'clean' | 'moderate' | 'ultra_processed'
  warningFlags: string[] // ej. "Contiene jarabe de maíz de alta fructosa", "Aceite de palma refinado"
  positiveHighlights: string[] // ej. "Alto en fibra", "Sin azúcares añadidos"
  cleanerAlternativeSuggestion?: string
}

// ==========================================
// 6. Food Plate Vision Scanner (Foto de Comida)
// ==========================================
export interface FoodPlateItem {
  name: string
  estimatedGrams: number
  calories: number
  protein: number
  carbs: number
  fat: number
  confidence: number
}

export interface FoodVisionResult {
  mealName: string
  estimatedTotalCalories: number
  estimatedTotalMacros: {
    protein: number
    carbs: number
    fat: number
  }
  items: FoodPlateItem[]
  notes?: string
}

// ==========================================
// 7. Natural Meal Parser (Texto/Voz a Macros)
// ==========================================
export interface NaturalMealParseResult {
  rawText: string
  items: Array<{
    name: string
    grams: number
    calories: number
    protein: number
    carbs: number
    fat: number
  }>
  totalCalories: number
  totalProtein: number
  totalCarbs: number
  totalFat: number
}

// ==========================================
// 8. Dynamic Load & RPE Engine (Sobrecarga Progresiva)
// ==========================================
export interface LoadAdvisorResult {
  exerciseName: string
  suggestedWeightKg: number
  suggestedReps: number
  suggestedRpe: number
  rationale: string
  progressionType: 'weight_increase' | 'reps_increase' | 'hold_load' | 'deload_set'
  dropSetAlternative?: {
    weightKg: number
    reps: number
  }
}

// ==========================================
// 9. Biomechanical & Nutritional Coach Chat
// ==========================================
export interface AiChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: number
  category?: 'technique' | 'nutrition' | 'programming' | 'general'
}
