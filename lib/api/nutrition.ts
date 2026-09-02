import { supabase } from '../supabase'
import { FoodItemParsed, FoodLog, MealType } from '@/types'

export interface NutritionAnalysisResult {
  foods: FoodItemParsed[]
  totals: {
    calories: number
    protein_g: number
    carbs_g: number
    fat_g: number
  }
  overall_confidence: 'high' | 'medium' | 'low'
  ai_notes?: string
}

export async function analyzeNutrition(
  rawInput: string,
  mealType: MealType
): Promise<NutritionAnalysisResult> {
  const { data, error } = await supabase.functions.invoke('analyze-nutrition', {
    body: { rawInput, mealType },
  })

  if (error) {
    throw new Error(error.message || 'Error al analizar la comida')
  }

  return data as NutritionAnalysisResult
}

export async function saveFoodLog(params: {
  userId: string
  rawInput: string
  mealType: MealType
  date: string
  result: NutritionAnalysisResult
}): Promise<{ data: FoodLog | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('food_logs')
    .insert({
      user_id: params.userId,
      date: params.date,
      meal_type: params.mealType,
      raw_input: params.rawInput,
      foods_parsed: params.result.foods,
      calories: params.result.totals.calories,
      protein_g: params.result.totals.protein_g,
      carbs_g: params.result.totals.carbs_g,
      fat_g: params.result.totals.fat_g,
      ai_confidence: params.result.overall_confidence,
      ai_notes: params.result.ai_notes || null,
    })
    .select()
    .single()

  return { data: data as FoodLog, error }
}

export async function getDailyFoodLogs(
  userId: string,
  date: string
): Promise<FoodLog[]> {
  const { data, error } = await supabase
    .from('food_logs')
    .select('*')
    .eq('user_id', userId)
    .eq('date', date)
    .order('created_at', { ascending: false })

  if (error || !data) return []
  return data as FoodLog[]
}

export async function getFoodLogsDateRange(
  userId: string,
  startDate: string,
  endDate: string
): Promise<FoodLog[]> {
  const { data, error } = await supabase
    .from('food_logs')
    .select('*')
    .eq('user_id', userId)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: true })
    .order('created_at', { ascending: true })

  if (error || !data) return []
  return data as FoodLog[]
}


export async function deleteFoodLog(foodLogId: string): Promise<{ error: Error | null }> {
  const { error } = await supabase
    .from('food_logs')
    .delete()
    .eq('id', foodLogId)

  return { error }
}

export async function ocrLabel(
  imageBase64: string,
  mediaType: string = 'image/jpeg'
) {
  const { data, error } = await supabase.functions.invoke('ocr-label', {
    body: { imageBase64, mediaType },
  })

  if (error) throw new Error(error.message)
  return data
}
