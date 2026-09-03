import { useState, useEffect, useCallback, useMemo } from 'react'
import { useAuth } from './useAuth'
import { useDashboard } from './useDashboard'
import {
  getDailyFoodLogs,
  getFoodLogsDateRange,
  deleteFoodLog as apiDeleteFoodLog,
  updateFoodLog as apiUpdateFoodLog,
} from '../api/nutrition'
import { supabase } from '../supabase'
import { FoodLog, DailySummary, MealType, FoodItemParsed, NutritionDayStats } from '@/types'
import { calculateDailyNutritionTargets } from '../utils/calories'
import { calculateDayNutritionStats, generateHistoryDateRangeStats } from '../services/nutritionStatsService'

export function useNutrition(initialDate?: string) {
  const { user, profile } = useAuth()
  const { metrics } = useDashboard()

  const [currentDate, setCurrentDate] = useState<string>(
    initialDate || new Date().toISOString().split('T')[0]
  )
  const [logs, setLogs] = useState<FoodLog[]>([])
  const [rangeLogs, setRangeLogs] = useState<FoodLog[]>([])
  const [summary, setSummary] = useState<DailySummary | null>(null)
  const [dayBurnedCalories, setDayBurnedCalories] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  const [historyLoading, setHistoryLoading] = useState(false)

  // Targets calculados exactamente para la fecha seleccionada con su quema de entrenamiento
  const targets = useMemo(() => {
    const weight = profile?.weight_kg || profile?.initial_weight_kg || 75
    const computed = calculateDailyNutritionTargets(profile, weight, dayBurnedCalories)
    return {
      targetCals: computed.targetCalories,
      targetProtein: computed.proteinTarget,
      targetCarbs: computed.carbsTarget,
      targetFat: computed.fatTarget,
      baseTargetCals: computed.targetCalories - dayBurnedCalories,
      burnedCalories: dayBurnedCalories,
    }
  }, [profile, dayBurnedCalories])

  const fetchLogs = useCallback(async () => {
    if (!user) return
    setLoading(true)

    // 1. Obtener comidas de la fecha seleccionada
    const data = await getDailyFoodLogs(user.id, currentDate)
    setLogs(data)

    // 2. Obtener sesiones de entrenamiento completadas en esta fecha exacta
    let burnedCals = 0
    try {
      const { data: sessionData } = await supabase
        .from('workout_sessions')
        .select('estimated_calories_burned')
        .eq('user_id', user.id)
        .eq('date', currentDate)
        .not('finished_at', 'is', null)

      if (sessionData && sessionData.length > 0) {
        burnedCals = sessionData.reduce((sum, s) => sum + (s.estimated_calories_burned || 0), 0)
      }
    } catch (e) {
      console.log('Error fetching day workout session calories:', e)
    }

    setDayBurnedCalories(burnedCals)

    const totalCals = data.reduce((s, l) => s + (l.calories || 0), 0)
    const totalProt = data.reduce((s, l) => s + (l.protein_g || 0), 0)
    const totalCarbs = data.reduce((s, l) => s + (l.carbs_g || 0), 0)
    const totalFat = data.reduce((s, l) => s + (l.fat_g || 0), 0)

    setSummary({
      user_id: user.id,
      date: currentDate,
      total_calories: totalCals,
      total_protein: totalProt,
      total_carbs: totalCarbs,
      total_fat: totalFat,
      meal_count: data.length,
      calories_burned: burnedCals,
    })
    setLoading(false)
  }, [user, currentDate])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  // Cargar historial para calendario y gráficos
  const fetchHistoryRange = useCallback(
    async (daysCount: number = 30) => {
      if (!user) return []
      setHistoryLoading(true)
      const endD = new Date()
      const startD = new Date()
      startD.setDate(startD.getDate() - daysCount)

      const startStr = startD.toISOString().split('T')[0]
      const endStr = endD.toISOString().split('T')[0]

      const data = await getFoodLogsDateRange(user.id, startStr, endStr)
      setRangeLogs(data)
      setHistoryLoading(false)
      return data
    },
    [user]
  )

  useEffect(() => {
    fetchHistoryRange(30).catch(() => {})
  }, [fetchHistoryRange])

  // Navegación por fechas
  const goToPrevDay = () => {
    const d = new Date(currentDate)
    d.setDate(d.getDate() - 1)
    setCurrentDate(d.toISOString().split('T')[0])
  }

  const goToNextDay = () => {
    const d = new Date(currentDate)
    d.setDate(d.getDate() + 1)
    setCurrentDate(d.toISOString().split('T')[0])
  }

  const goToToday = () => {
    setCurrentDate(new Date().toISOString().split('T')[0])
  }

  const setDate = (newDate: string) => {
    setCurrentDate(newDate)
  }

  // Estadísticas y métricas de salud del día actual
  const dayStats: NutritionDayStats = useMemo(() => {
    return calculateDayNutritionStats(currentDate, logs, targets)
  }, [currentDate, logs, targets])

  // Comparativas detalladas de macros vs objetivo
  const calorieAnalysis = useMemo(() => {
    const consumed = dayStats.calories
    const target = targets.targetCals
    const diff = consumed - target
    const remaining = Math.max(0, target - consumed)
    const excess = Math.max(0, consumed - target)
    const progressPercent = Math.min(100, Math.round((consumed / Math.max(1, target)) * 100))
    return {
      consumed,
      target,
      diff,
      remaining,
      excess,
      progressPercent,
      isExceeded: diff > 0,
    }
  }, [dayStats.calories, targets.targetCals])

  const proteinAnalysis = useMemo(() => {
    const consumed = dayStats.protein
    const target = targets.targetProtein
    const diff = Number((consumed - target).toFixed(1))
    const remaining = Number(Math.max(0, target - consumed).toFixed(1))
    const excess = Number(Math.max(0, consumed - target).toFixed(1))
    const progressPercent = Math.min(100, Math.round((consumed / Math.max(1, target)) * 100))
    return {
      consumed,
      target,
      diff,
      remaining,
      excess,
      progressPercent,
      isMet: consumed >= target,
    }
  }, [dayStats.protein, targets.targetProtein])

  const carbsAnalysis = useMemo(() => {
    const consumed = dayStats.carbs
    const target = targets.targetCarbs
    const diff = Number((consumed - target).toFixed(1))
    const remaining = Number(Math.max(0, target - consumed).toFixed(1))
    const excess = Number(Math.max(0, consumed - target).toFixed(1))
    const progressPercent = Math.min(100, Math.round((consumed / Math.max(1, target)) * 100))
    return {
      consumed,
      target,
      diff,
      remaining,
      excess,
      progressPercent,
      isExceeded: diff > 0,
    }
  }, [dayStats.carbs, targets.targetCarbs])

  const fatAnalysis = useMemo(() => {
    const consumed = dayStats.fat
    const target = targets.targetFat
    const diff = Number((consumed - target).toFixed(1))
    const remaining = Number(Math.max(0, target - consumed).toFixed(1))
    const excess = Number(Math.max(0, consumed - target).toFixed(1))
    const progressPercent = Math.min(100, Math.round((consumed / Math.max(1, target)) * 100))
    return {
      consumed,
      target,
      diff,
      remaining,
      excess,
      progressPercent,
      isExceeded: diff > 0,
    }
  }, [dayStats.fat, targets.targetFat])

  // Historial combinado con los logs de hoy
  const allKnownLogs = useMemo(() => {
    const map = new Map<string, FoodLog>()
    rangeLogs.forEach((l) => map.set(l.id, l))
    logs.forEach((l) => map.set(l.id, l))
    return Array.from(map.values())
  }, [rangeLogs, logs])

  const history7Days = useMemo(() => {
    return generateHistoryDateRangeStats(allKnownLogs, targets, 7, currentDate)
  }, [allKnownLogs, targets, currentDate])

  const history14Days = useMemo(() => {
    return generateHistoryDateRangeStats(allKnownLogs, targets, 14, currentDate)
  }, [allKnownLogs, targets, currentDate])

  const history30Days = useMemo(() => {
    return generateHistoryDateRangeStats(allKnownLogs, targets, 30, currentDate)
  }, [allKnownLogs, targets, currentDate])

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
        date: currentDate,
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
      setRangeLogs((prev) => [data as FoodLog, ...prev.filter((l) => l.id !== data.id)])
    }
    return { data, error }
  }

  const copyFoodLog = async (
    logToCopy: FoodLog,
    targetDate: string = currentDate,
    targetMealType?: MealType
  ) => {
    if (!user) return

    const { data, error } = await supabase
      .from('food_logs')
      .insert({
        user_id: user.id,
        date: targetDate,
        meal_type: targetMealType || logToCopy.meal_type,
        raw_input: logToCopy.raw_input,
        foods_parsed: logToCopy.foods_parsed,
        calories: logToCopy.calories,
        protein_g: logToCopy.protein_g,
        carbs_g: logToCopy.carbs_g,
        fat_g: logToCopy.fat_g,
        ai_confidence: logToCopy.ai_confidence || 'high',
      })
      .select()
      .single()

    if (!error && data) {
      if (targetDate === currentDate) {
        setLogs((prev) => [data as FoodLog, ...prev])
      }
      setRangeLogs((prev) => [data as FoodLog, ...prev.filter((l) => l.id !== data.id)])
    }
    return { data, error }
  }

  const deleteFoodLog = async (id: string) => {
    await apiDeleteFoodLog(id)
    setLogs((prev) => prev.filter((l) => l.id !== id))
    setRangeLogs((prev) => prev.filter((l) => l.id !== id))
  }

  const updateFoodLog = async (
    id: string,
    params: {
      mealType: MealType
      rawInput: string
      foodsParsed: FoodItemParsed[]
      calories: number
      proteinG: number
      carbsG: number
      fatG: number
    }
  ) => {
    const { data, error } = await apiUpdateFoodLog({
      foodLogId: id,
      mealType: params.mealType,
      rawInput: params.rawInput,
      foodsParsed: params.foodsParsed,
      calories: params.calories,
      proteinG: params.proteinG,
      carbsG: params.carbsG,
      fatG: params.fatG,
    })

    if (!error && data) {
      setLogs((prev) => prev.map((l) => (l.id === id ? (data as FoodLog) : l)))
      setRangeLogs((prev) => prev.map((l) => (l.id === id ? (data as FoodLog) : l)))
    }
    return { data, error }
  }

  // Comidas frecuentes / recientes para selección rápida sin escanear de nuevo
  const frequentMeals = useMemo(() => {
    const mealMap = new Map<string, { log: FoodLog; count: number; lastUsed: string }>()
    allKnownLogs.forEach((l) => {
      const key =
        l.foods_parsed && l.foods_parsed.length > 0
          ? l.foods_parsed.map((f) => f.name).sort().join(' + ')
          : l.raw_input?.trim() || 'Comida'
      if (!key) return

      const existing = mealMap.get(key)
      if (existing) {
        existing.count += 1
        if (l.date > existing.lastUsed) {
          existing.lastUsed = l.date
          existing.log = l
        }
      } else {
        mealMap.set(key, { log: l, count: 1, lastUsed: l.date })
      }
    })

    return Array.from(mealMap.values())
      .sort((a, b) => b.count - a.count || b.lastUsed.localeCompare(a.lastUsed))
      .map((item) => item.log)
  }, [allKnownLogs])

  // Ingredientes individuales frecuentes extraídos de todas las comidas del historial
  const frequentIngredients = useMemo(() => {
    const itemMap = new Map<string, { food: FoodItemParsed; count: number }>()
    allKnownLogs.forEach((l) => {
      (l.foods_parsed || []).forEach((f) => {
        if (!f.name || f.name.trim().length < 2) return
        const key = f.name.trim().toLowerCase()
        const existing = itemMap.get(key)
        if (existing) {
          existing.count += 1
        } else {
          itemMap.set(key, {
            food: { ...f },
            count: 1,
          })
        }
      })
    })

    return Array.from(itemMap.values())
      .sort((a, b) => b.count - a.count)
      .map((item) => ({
        ...item.food,
        count: item.count,
      }))
  }, [allKnownLogs])

  return {
    selectedDate: currentDate,
    setSelectedDate: setDate,
    goToPrevDay,
    goToNextDay,
    goToToday,
    logs,
    summary,
    targets,
    dayStats,
    calorieAnalysis,
    proteinAnalysis,
    carbsAnalysis,
    fatAnalysis,
    history7Days,
    history14Days,
    history30Days,
    frequentMeals,
    frequentIngredients,
    loading,
    historyLoading,
    refetch: fetchLogs,
    refreshHistory: fetchHistoryRange,
    logFood,
    updateFoodLog,
    copyFoodLog,
    deleteFoodLog,
  }
}

