/**
 * Tipos e interfaces de datos para el ecosistema de IA de Carga App.
 * Soporta multi-modelo (Haiku / Sonnet), Prompt Caching, Esquemas estrictos,
 * Contexto de Atleta Global y Planificador de Mesociclos.
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

export interface AiServiceResponse<T> {
  data: T
  metrics: AiUsageMetrics
}


// ==========================================
// Contexto Global del Atleta (Unidades y Perfil)
// ==========================================
export interface AthleteProfileContext {
  weightKg?: number
  heightCm?: number
  gender?: 'male' | 'female' | 'other'
  goal?: 'hipertrofia' | 'fuerza' | 'recomposicion' | 'definicion' | 'mantenimiento' | 'salud' | string
  preferredUnit?: 'kg' | 'lbs'
  experienceLevel?: 'principiante' | 'intermedio' | 'avanzado' | 'elite'
  trainingFrequencyDays?: number
  avgWeeklyVolumeSets?: number
  avgRpeLast4Weeks?: number
  injuriesOrLimitations?: string[]
  availableEquipment?: string[]
  targetDailyCalories?: number
  targetDailyMacros?: {
    protein: number
    carbs: number
    fat: number
  }
}

// ==========================================
// 1. Hands-Free Voice Logger (Módulo Voz)
// ==========================================
export interface ActiveExerciseContext {
  name: string
  muscleGroup?: string
  targetSets?: number
  targetReps?: number | string
  targetRpe?: number
  currentSetNumber?: number
  previousSet?: {
    weightKg: number
    reps: number
    rpe?: number
  }
}

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
export interface MicronutrientItem {
  name: string
  amount?: string
  amountPer100g?: string
  amountPerServing?: string
  vrnPercent?: number
}

export interface NutritionalLabelResult {
  productName: string
  brand?: string
  barcode?: string | null
  per100g: {
    calories: number // ¡Siempre en kcal!
    energyKj?: number
    protein: number
    carbs: number
    fat: number
    sugars: number
    saturatedFat?: number
    saltG?: number
    sodiumMg?: number
    fiber?: number
  }
  packageServingSizeG?: number
  servingName?: string
  micronutrients?: MicronutrientItem[]
  ingredientsList: string[]
  ultraProcessedScore: number // 1 (Muy natural/limpio) a 10 (Ultraprocesado extremo)
  classification: 'clean' | 'moderate' | 'ultra_processed'
  warningFlags: string[]
  positiveHighlights: string[]
  cleanerAlternativeSuggestion?: string
}

// ==========================================
// 6. Food Plate Vision Scanner (Foto de Comida)
// ==========================================
export interface FoodPlateItem {
  name: string
  unitOrPortion?: string | null
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
export interface NaturalMealItem {
  name: string
  brand?: string | null
  unitOrPortion?: string | null
  grams: number
  calories: number
  protein: number
  carbs: number
  fat: number
  source?: 'openfoodfacts' | 'ai_estimate'
  barcode?: string | null
}

export interface NaturalMealParseResult {
  rawText: string
  items: NaturalMealItem[]
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
export interface CoachStructuredResponse {
  mainAnswer: string
  technicalCue?: string | null
  immediateAction?: string | null
  safetyWarning?: string | null
  referralFlag: boolean
}

export interface AiChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  structured?: CoachStructuredResponse
  timestamp: number
  category?: 'technique' | 'nutrition' | 'programming' | 'general'
}

// ==========================================
// 10. Mesocycle Builder (Generador de Mesociclos)
// ==========================================
export interface MesocycleExercise {
  id: string
  name: string
  targetMuscle: string
  equipment: string
  baseSets: number
  baseReps: string // ej. "8-12" o "6-8"
  targetRir: number
  tempo?: string
  restSeconds: number
  substitutes?: string[]
  notes?: string
}

export interface MesocycleDay {
  dayNumber: number
  name: string // ej. "Día 1: Torso Pesado (Pecho / Espalda)"
  targetMuscles: string[]
  exercises: MesocycleExercise[]
}

export interface MesocycleWeek {
  weekNumber: number
  phase: 'accumulation' | 'intensification' | 'overreaching' | 'deload'
  targetRir: number
  volumeMultiplier: number
  intensityDescription: string
  isDeload: boolean
  days: MesocycleDay[]
}

export interface MesocyclePlan {
  planName: string
  totalWeeks: number
  splitType: string
  goal: string
  weeklyVolumeDistribution: Record<string, number> // series por grupo muscular
  progressionStrategy: string
  deloadStrategy: string
  weeks: MesocycleWeek[]
  coachNotes: string
}

export interface MesocycleParams {
  athleteProfile?: AthleteProfileContext
  splitType?: 'push_pull_legs' | 'upper_lower' | 'full_body' | 'arnold' | 'custom'
  daysPerWeek: number
  durationWeeks?: number // 4 a 8 (default 5: 4 de carga + 1 deload)
  focusMuscles?: string[]
  equipmentAvailable?: string[]
  currentVolumePerMuscle?: Record<string, number>
  customNotes?: string
}

// ==========================================
// 11. Nutrition Health & Micronutrient Auditor
// ==========================================
export interface HealthWarningItem {
  type: 'sodium' | 'sugar' | 'fat' | 'fiber' | 'processed' | 'calorie'
  title: string
  message: string
  severity: 'high' | 'medium' | 'low'
}

export interface NutrientDeficiencyItem {
  nutrient: string
  currentEstimate: string
  recommended: string
  status: 'critical_deficit' | 'moderate_deficit' | 'good' | 'excess'
  whyNeeded: string
  topFoodSources: string[]
}

export interface FoodHealthRecommendation {
  food: string
  portion: string
  targetNutrients: string[]
  benefit: string
  category: 'superfood' | 'lean_protein' | 'healthy_fat' | 'fiber_carb' | 'micronutrient_booster'
}

export interface NutritionHealthAuditResult {
  healthScore: number // 1 a 100
  overallSummary: string
  macroBalanceVerdict: string
  calorieAdherenceVerdict: string
  warnings: HealthWarningItem[]
  deficienciesAndNeeds: NutrientDeficiencyItem[]
  foodRecommendations: FoodHealthRecommendation[]
  cleanEatingSummary: {
    processedPercent: number
    naturalPercent: number
    advice: string
  }
}

