import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabase'
import { useAuth } from './useAuth'
import { calculateBMR, calculateTDEE, calculateTargetCalories } from '@/lib/utils/calories'
import { WorkoutSession } from '@/types'

export interface DashboardMetrics {
  currentWeightKg: number
  consumedCalories: number
  burnedCalories: number
  bmr: number
  tdee: number
  targetCalories: number
  calorieBalance: number
  protein: number
  proteinTarget: number
  carbs: number
  carbsTarget: number
  fat: number
  fatTarget: number
  mealCount: number
  todayWorkout: WorkoutSession | null
}

export function useDashboard(targetDate?: string) {
  const { user, profile } = useAuth()
  const date = targetDate || new Date().toISOString().split('T')[0]

  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchDashboardData = useCallback(async () => {
    if (!user) return
    setLoading(true)

    try {
      // 1. Obtener último peso registrado
      const { data: latestWeightData } = await supabase
        .from('body_weight')
        .select('weight_kg')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .limit(1)
        .single()

      const currentWeight = latestWeightData?.weight_kg || 75

      // 2. Obtener comidas de hoy
      const { data: foodsData } = await supabase
        .from('food_logs')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', date)

      const foodTotals = (foodsData || []).reduce(
        (acc, item) => ({
          calories: acc.calories + (item.calories || 0),
          protein: acc.protein + (item.protein_g || 0),
          carbs: acc.carbs + (item.carbs_g || 0),
          fat: acc.fat + (item.fat_g || 0),
          count: acc.count + 1,
        }),
        { calories: 0, protein: 0, carbs: 0, fat: 0, count: 0 }
      )

      // 3. Obtener sesión de entrenamiento de hoy
      const { data: sessionData } = await supabase
        .from('workout_sessions')
        .select(`
          *,
          routine:routines (name)
        `)
        .eq('user_id', user.id)
        .eq('date', date)
        .not('finished_at', 'is', null)
        .order('finished_at', { ascending: false })
        .limit(1)

      const todayWorkout = sessionData && sessionData.length > 0 ? (sessionData[0] as WorkoutSession) : null
      const workoutBurned = todayWorkout?.estimated_calories_burned || 0

      // 4. Cálculos energéticos
      const bmr = calculateBMR(profile, currentWeight)
      const tdee = calculateTDEE(bmr, profile?.activity_level || 'moderate')
      const baseTarget = calculateTargetCalories(tdee, profile?.goal)
      const adjustedTarget = baseTarget + workoutBurned
      const consumed = Math.round(foodTotals.calories)
      const balance = consumed - adjustedTarget

      // Objetivos aproximados de macros
      const proteinTarget = Math.round(currentWeight * 2.0)
      const fatTarget = Math.round(currentWeight * 0.9)
      const remainingCalories = Math.max(0, adjustedTarget - (proteinTarget * 4 + fatTarget * 9))
      const carbsTarget = Math.round(remainingCalories / 4)

      setMetrics({
        currentWeightKg: currentWeight,
        consumedCalories: consumed,
        burnedCalories: workoutBurned,
        bmr,
        tdee,
        targetCalories: adjustedTarget,
        calorieBalance: balance,
        protein: Math.round(foodTotals.protein),
        proteinTarget,
        carbs: Math.round(foodTotals.carbs),
        carbsTarget,
        fat: Math.round(foodTotals.fat),
        fatTarget,
        mealCount: foodTotals.count,
        todayWorkout,
      })
    } catch (err) {
      console.error('Error al cargar datos del Dashboard:', err)
    } finally {
      setLoading(false)
    }
  }, [user, profile, date])

  useEffect(() => {
    fetchDashboardData()
  }, [fetchDashboardData])

  return {
    metrics,
    loading,
    refetch: fetchDashboardData,
  }
}
