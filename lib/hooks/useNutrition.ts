import { useState, useEffect, useCallback } from 'react'
import { useAuth } from './useAuth'
import { getDailyFoodLogs, deleteFoodLog as apiDeleteFoodLog } from '../api/nutrition'
import { supabase } from '../supabase'
import { FoodLog, DailySummary, MealType, FoodItemParsed } from '@/types'

export function useNutrition(selectedDate?: string) {
  const { user } = useAuth()
  const date = selectedDate || new Date().toISOString().split('T')[0]

  const [logs, setLogs] = useState<FoodLog[]>([])
  const [summary, setSummary] = useState<DailySummary | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchLogs = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const data = await getDailyFoodLogs(user.id, date)
    setLogs(data)

    const totalCals = data.reduce((s, l) => s + (l.calories || 0), 0)
    const totalProt = data.reduce((s, l) => s + (l.protein_g || 0), 0)
    const totalCarbs = data.reduce((s, l) => s + (l.carbs_g || 0), 0)
    const totalFat = data.reduce((s, l) => s + (l.fat_g || 0), 0)

    setSummary({
      user_id: user.id,
      date,
      total_calories: totalCals,
      total_protein: totalProt,
      total_carbs: totalCarbs,
      total_fat: totalFat,
      meal_count: data.length,
      calories_burned: 0,
    })
    setLoading(false)
  }, [user, date])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  const logFood = async (params: {
    mealType: MealType
    rawInput: string
    foodsParsed: FoodItemParsed[]
    calories: number
    proteinG: number
    carbsG: number
    fatG: number
  }) => {
    if (!user) return

    const { data, error } = await supabase
      .from('food_logs')
      .insert({
        user_id: user.id,
        date,
        meal_type: params.mealType,
        raw_input: params.rawInput,
        foods_parsed: params.foodsParsed,
        calories: params.calories,
        protein_g: params.proteinG,
        carbs_g: params.carbsG,
        fat_g: params.fatG,
        ai_confidence: 'medium',
      })
      .select()
      .single()

    if (!error && data) {
      setLogs((prev) => [data as FoodLog, ...prev])
    }
    return { data, error }
  }

  const deleteFoodLog = async (id: string) => {
    await apiDeleteFoodLog(id)
    setLogs((prev) => prev.filter((l) => l.id !== id))
  }

  return {
    logs,
    summary,
    loading,
    refetch: fetchLogs,
    logFood,
    deleteFoodLog,
  }
}
