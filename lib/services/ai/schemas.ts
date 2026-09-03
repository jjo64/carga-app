import { z } from 'zod'
import {
  VoiceLogResult,
  PainAdaptorResult,
  MacroCloserResult,
  DeloadAdviceResult,
  NutritionalLabelResult,
  FoodVisionResult,
  NaturalMealParseResult,
  LoadAdvisorResult,
  CoachStructuredResponse,
  MesocyclePlan,
  NutritionHealthAuditResult,
} from './types'

/**
 * Coerces numeric inputs from AI (which might be strings like "250g", "12.5 kcal", "100", null, etc.) into numbers.
 */
export const flexibleNumber = (fallback: number = 0) =>
  z.preprocess((val) => {
    if (val === null || val === undefined || val === '') return fallback
    if (typeof val === 'number') return isNaN(val) ? fallback : val
    if (typeof val === 'string') {
      const clean = val.replace(/,/g, '.').replace(/[^0-9.-]/g, '').trim()
      const parsed = parseFloat(clean)
      return isNaN(parsed) ? fallback : parsed
    }
    return fallback
  }, z.number().default(fallback))

export const flexibleOptionalNumber = () =>
  z.preprocess((val) => {
    if (val === null || val === undefined || val === '') return undefined
    if (typeof val === 'number') return isNaN(val) ? undefined : val
    if (typeof val === 'string') {
      const clean = val.replace(/,/g, '.').replace(/[^0-9.-]/g, '').trim()
      const parsed = parseFloat(clean)
      return isNaN(parsed) ? undefined : parsed
    }
    return undefined
  }, z.number().optional())

// ==========================================
// 1. Hands-Free Voice Logger Schema
// ==========================================
export const voiceLogResultSchema: z.ZodType<VoiceLogResult> = z.object({
  exerciseName: z.string().nullable().optional().transform((val) => val ?? undefined),
  weightKg: flexibleNumber(0),
  reps: flexibleNumber(0),
  rpe: flexibleOptionalNumber(),
  rir: flexibleOptionalNumber(),
  setNum: flexibleOptionalNumber(),
  notes: z.string().nullable().optional().transform((val) => val ?? undefined),
  confidence: flexibleNumber(1.0),
  rawTranscript: z.string().default(''),
})

// Tool definition for Voice Logger Tool Calling
export const VOICE_LOGGER_TOOL = {
  name: 'log_exercise_set',
  description: 'Registra una serie de ejercicio a partir del dictado por voz y contexto activo',
  input_schema: {
    type: 'object' as const,
    properties: {
      exerciseName: {
        type: 'string',
        description: 'Nombre del ejercicio activo o dictado',
      },
      weightKg: {
        type: 'number',
        description: 'Peso utilizado en kilogramos (si el usuario dice libras, convertir a kg dividiendo por 2.20462)',
      },
      reps: {
        type: 'integer',
        description: 'Número de repeticiones completadas',
      },
      rpe: {
        type: 'number',
        description: 'Escala de esfuerzo percibido 1.0 - 10.0',
        nullable: true,
      },
      rir: {
        type: 'number',
        description: 'Repeticiones en recámara / reserva',
        nullable: true,
      },
      setNum: {
        type: 'integer',
        description: 'Número de serie',
        nullable: true,
      },
      notes: {
        type: 'string',
        description: 'Notas o sensaciones técnicas',
        nullable: true,
      },
      confidence: {
        type: 'number',
        description: 'Nivel de confianza en la extracción de 0.0 a 1.0',
      },
    },
    required: ['weightKg', 'reps', 'confidence'],
  },
}

// ==========================================
// 2. Pain Adaptor Schema
// ==========================================
export const painAdaptorResultSchema: z.ZodType<PainAdaptorResult> = z.object({
  originalExercise: z.string(),
  painLocation: z.string(),
  painIntensity: flexibleNumber(5),
  suggestedExercise: z.object({
    id: z.string().optional(),
    name: z.string(),
    equipment: z.string().default(''),
    targetMuscles: z.array(z.string()).default([]),
  }),
  biomechanicalReason: z.string(),
  setupAdjustments: z.array(z.string()).default([]),
  replacementSets: flexibleNumber(3),
  replacementReps: z.string().default('10-12'),
  suggestedRestSeconds: flexibleNumber(90),
})

// ==========================================
// 3. Smart Macro Closer Schema
// ==========================================
export const macroCloserSuggestionSchema = z.object({
  id: z.string(),
  name: z.string(),
  prepTimeMinutes: flexibleNumber(5),
  difficulty: z.enum(['fácil', 'medio', 'rápido']).default('fácil'),
  ingredients: z.array(
    z.object({
      name: z.string(),
      amount: z.string(),
      gramsApprox: flexibleNumber(0),
    })
  ).default([]),
  macros: z.object({
    calories: flexibleNumber(0),
    protein: flexibleNumber(0),
    carbs: flexibleNumber(0),
    fat: flexibleNumber(0),
  }),
  quickRecipeInstructions: z.string().default(''),
})

export const macroCloserResultSchema: z.ZodType<MacroCloserResult> = z.object({
  remainingTarget: z.object({
    calories: flexibleNumber(0),
    protein: flexibleNumber(0),
    carbs: flexibleNumber(0),
    fat: flexibleNumber(0),
  }),
  suggestions: z.array(macroCloserSuggestionSchema).default([]),
  nutritionalTip: z.string().default(''),
})

// ==========================================
// 4. Smart Deload Advisor Schema
// ==========================================
export const deloadAdviceResultSchema: z.ZodType<DeloadAdviceResult> = z.object({
  shouldDeload: z.boolean(),
  fatigueScore: flexibleNumber(50),
  fatigueLevel: z.enum(['low', 'moderate', 'high', 'overreaching']),
  indicators: z.array(z.string()).default([]),
  recommendation: z.string(),
  protocol: z.object({
    volumeReductionPercent: flexibleNumber(40),
    intensityReductionPercent: flexibleNumber(10),
    durationDays: flexibleNumber(7),
    focusAreas: z.array(z.string()).default([]),
  }),
})

// ==========================================
// 5. Nutritional Label Scanner Schema
// ==========================================
export const micronutrientItemSchema = z.object({
  name: z.string(),
  amount: z.string().optional(),
  amountPer100g: z.string().optional(),
  amountPerServing: z.string().optional(),
  vrnPercent: flexibleOptionalNumber(),
})

export const nutritionalLabelResultSchema: z.ZodType<NutritionalLabelResult> = z.object({
  productName: z.string().default('Alimento escaneado'),
  brand: z.string().nullable().optional().transform((val) => val ?? undefined),
  barcode: z.string().nullable().optional(),
  per100g: z.object({
    calories: flexibleNumber(0),
    energyKj: flexibleOptionalNumber(),
    protein: flexibleNumber(0),
    carbs: flexibleNumber(0),
    fat: flexibleNumber(0),
    sugars: flexibleNumber(0),
    saturatedFat: flexibleOptionalNumber(),
    saltG: flexibleOptionalNumber(),
    sodiumMg: flexibleOptionalNumber(),
    fiber: flexibleOptionalNumber(),
  }),
  packageServingSizeG: flexibleOptionalNumber(),
  servingName: z.string().nullable().optional().transform((val) => val ?? undefined),
  micronutrients: z.array(micronutrientItemSchema).optional().default([]),
  ingredientsList: z.array(z.string()).default([]),
  ultraProcessedScore: flexibleNumber(5),
  classification: z.enum(['clean', 'moderate', 'ultra_processed']).default('moderate'),
  warningFlags: z.array(z.string()).default([]),
  positiveHighlights: z.array(z.string()).default([]),
  cleanerAlternativeSuggestion: z.string().nullable().optional().transform((val) => val ?? undefined),
})

// Tool definition for Nutritional Label Scanner Tool Calling
export const NUTRITION_LABEL_TOOL = {
  name: 'parse_nutrition_label',
  description: 'Extrae valores de tabla nutricional OCR e ingredientes con precisión',
  input_schema: {
    type: 'object' as const,
    properties: {
      productName: { type: 'string' },
      brand: { type: 'string', nullable: true },
      barcode: { type: 'string', nullable: true },
      per100g: {
        type: 'object',
        properties: {
          calories: { type: 'number', description: 'Siempre en kcal (no kJ)' },
          energyKj: { type: 'number', nullable: true },
          protein: { type: 'number' },
          carbs: { type: 'number' },
          fat: { type: 'number' },
          sugars: { type: 'number' },
          saturatedFat: { type: 'number', nullable: true },
          saltG: { type: 'number', nullable: true },
          sodiumMg: { type: 'number', nullable: true },
          fiber: { type: 'number', nullable: true },
        },
        required: ['calories', 'protein', 'carbs', 'fat', 'sugars'],
      },
      packageServingSizeG: { type: 'number', nullable: true },
      servingName: { type: 'string', nullable: true },
      micronutrients: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            amountPer100g: { type: 'string' },
            amountPerServing: { type: 'string' },
            vrnPercent: { type: 'number' },
          },
          required: ['name'],
        },
      },
      ingredientsList: { type: 'array', items: { type: 'string' } },
      ultraProcessedScore: { type: 'number' },
      classification: { type: 'string', enum: ['clean', 'moderate', 'ultra_processed'] },
      warningFlags: { type: 'array', items: { type: 'string' } },
      positiveHighlights: { type: 'array', items: { type: 'string' } },
      cleanerAlternativeSuggestion: { type: 'string', nullable: true },
    },
    required: ['productName', 'per100g', 'ingredientsList', 'ultraProcessedScore', 'classification'],
  },
}

// ==========================================
// 6. Food Plate Vision Scanner Schema
// ==========================================
export const foodPlateItemSchema = z.object({
  name: z.string(),
  unitOrPortion: z.string().nullable().optional(),
  estimatedGrams: flexibleNumber(100),
  calories: flexibleNumber(0),
  protein: flexibleNumber(0),
  carbs: flexibleNumber(0),
  fat: flexibleNumber(0),
  confidence: flexibleNumber(0.8),
})

export const foodVisionResultSchema: z.ZodType<FoodVisionResult> = z.object({
  mealName: z.string().default('Comida escaneada'),
  estimatedTotalCalories: flexibleNumber(0),
  estimatedTotalMacros: z.object({
    protein: flexibleNumber(0),
    carbs: flexibleNumber(0),
    fat: flexibleNumber(0),
  }),
  items: z.array(foodPlateItemSchema).default([]),
  notes: z.string().nullable().optional().transform((val) => val ?? undefined),
})

// ==========================================
// 7. Natural Meal Parser Schema
// ==========================================
export const naturalMealItemSchema = z.object({
  name: z.string(),
  brand: z.string().nullable().optional(),
  unitOrPortion: z.string().nullable().optional(),
  grams: flexibleNumber(0),
  calories: flexibleNumber(0),
  protein: flexibleNumber(0),
  carbs: flexibleNumber(0),
  fat: flexibleNumber(0),
  source: z.enum(['openfoodfacts', 'ai_estimate']).optional(),
  barcode: z.string().nullable().optional(),
})

export const naturalMealParseResultSchema: z.ZodType<NaturalMealParseResult> = z.object({
  rawText: z.string().default(''),
  items: z.array(naturalMealItemSchema).default([]),
  totalCalories: flexibleNumber(0),
  totalProtein: flexibleNumber(0),
  totalCarbs: flexibleNumber(0),
  totalFat: flexibleNumber(0),
})

// ==========================================
// 8. Dynamic Load & RPE Engine Schema
// ==========================================
export const loadAdvisorResultSchema: z.ZodType<LoadAdvisorResult> = z.object({
  exerciseName: z.string(),
  suggestedWeightKg: flexibleNumber(0),
  suggestedReps: flexibleNumber(0),
  suggestedRpe: flexibleNumber(0),
  rationale: z.string(),
  progressionType: z.enum(['weight_increase', 'reps_increase', 'hold_load', 'deload_set']),
  dropSetAlternative: z
    .object({
      weightKg: flexibleNumber(0),
      reps: flexibleNumber(0),
    })
    .nullable()
    .optional()
    .transform((val) => val ?? undefined),
})

// ==========================================
// 9. Biomechanical Coach Structured Response Schema
// ==========================================
export const coachStructuredResponseSchema: z.ZodType<CoachStructuredResponse> = z.object({
  mainAnswer: z.string(),
  technicalCue: z.string().nullable().optional(),
  immediateAction: z.string().nullable().optional(),
  safetyWarning: z.string().nullable().optional(),
  referralFlag: z.boolean().default(false),
})

// ==========================================
// 10. Mesocycle Builder Schema
// ==========================================
export const mesocycleExerciseSchema = z.object({
  id: z.string(),
  name: z.string(),
  targetMuscle: z.string(),
  equipment: z.string(),
  baseSets: flexibleNumber(3),
  baseReps: z.string(),
  targetRir: flexibleNumber(2),
  tempo: z.string().optional(),
  restSeconds: flexibleNumber(90),
  substitutes: z.array(z.string()).optional().default([]),
  notes: z.string().optional(),
})

export const mesocycleDaySchema = z.object({
  dayNumber: flexibleNumber(1),
  name: z.string(),
  targetMuscles: z.array(z.string()).default([]),
  exercises: z.array(mesocycleExerciseSchema).default([]),
})

export const mesocycleWeekSchema = z.object({
  weekNumber: flexibleNumber(1),
  phase: z.enum(['accumulation', 'intensification', 'overreaching', 'deload']),
  targetRir: flexibleNumber(2),
  volumeMultiplier: flexibleNumber(1),
  intensityDescription: z.string().default(''),
  isDeload: z.boolean().default(false),
  days: z.array(mesocycleDaySchema).default([]),
})

export const mesocyclePlanSchema: z.ZodType<MesocyclePlan> = z.object({
  planName: z.string(),
  totalWeeks: flexibleNumber(4),
  splitType: z.string(),
  goal: z.string(),
  weeklyVolumeDistribution: z.record(z.string(), z.number()).default({}),
  progressionStrategy: z.string().default(''),
  deloadStrategy: z.string().default(''),
  weeks: z.array(mesocycleWeekSchema).default([]),
  coachNotes: z.string().default(''),
})

// ==========================================
// 11. Nutrition Health & Micronutrient Auditor Schema
// ==========================================
export const healthWarningItemSchema = z.object({
  type: z.enum(['sodium', 'sugar', 'fat', 'fiber', 'processed', 'calorie']),
  title: z.string(),
  message: z.string(),
  severity: z.enum(['high', 'medium', 'low']),
})

export const nutrientDeficiencyItemSchema = z.object({
  nutrient: z.string(),
  currentEstimate: z.string(),
  recommended: z.string(),
  status: z.enum(['critical_deficit', 'moderate_deficit', 'good', 'excess']),
  whyNeeded: z.string(),
  topFoodSources: z.array(z.string()).default([]),
})

export const foodHealthRecommendationSchema = z.object({
  food: z.string(),
  portion: z.string(),
  targetNutrients: z.array(z.string()).default([]),
  benefit: z.string(),
  category: z.enum(['superfood', 'lean_protein', 'healthy_fat', 'fiber_carb', 'micronutrient_booster']),
})

export const nutritionHealthAuditResultSchema: z.ZodType<NutritionHealthAuditResult> = z.object({
  healthScore: flexibleNumber(70),
  overallSummary: z.string(),
  macroBalanceVerdict: z.string(),
  calorieAdherenceVerdict: z.string(),
  warnings: z.array(healthWarningItemSchema).default([]),
  deficienciesAndNeeds: z.array(nutrientDeficiencyItemSchema).default([]),
  foodRecommendations: z.array(foodHealthRecommendationSchema).default([]),
  cleanEatingSummary: z.object({
    processedPercent: flexibleNumber(0),
    naturalPercent: flexibleNumber(0),
    advice: z.string(),
  }),
})
