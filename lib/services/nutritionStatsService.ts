import { FoodLog, FoodItemParsed, NutritionDayStats, FoodMicronutrient } from '@/types'

export interface DailyTargets {
  targetCals: number
  targetProtein: number
  targetCarbs: number
  targetFat: number
}

export interface HealthReferenceValues {
  maxSugarsG: number
  maxSaturatedFatG: number
  maxSaltG: number
  maxSodiumMg: number
  minFiberG: number
  micronutrientRDA: Record<string, { standardName: string; amount: number; unit: string }>
}

export const HEALTH_REFERENCES: HealthReferenceValues = {
  maxSugarsG: 35, // Recomendación OMS límite azúcares libres/añadidos
  maxSaturatedFatG: 22, // ~10% de una dieta estándar de 2000 kcal
  maxSaltG: 5.0, // Límite OMS 5g de sal al día
  maxSodiumMg: 2000, // 2000 mg de sodio
  minFiberG: 30, // Meta recomendada de fibra diaria
  micronutrientRDA: {
    'vitamina b12': { standardName: 'Vitamina B12', amount: 2.5, unit: 'µg' },
    'vitamina b6': { standardName: 'Vitamina B6', amount: 1.4, unit: 'mg' },
    'vitamina c': { standardName: 'Vitamina C', amount: 80, unit: 'mg' },
    'vitamina d': { standardName: 'Vitamina D', amount: 15, unit: 'µg' },
    'vitamina a': { standardName: 'Vitamina A', amount: 800, unit: 'µg' },
    'vitamina e': { standardName: 'Vitamina E', amount: 12, unit: 'mg' },
    'calcio': { standardName: 'Calcio', amount: 800, unit: 'mg' },
    'fosforo': { standardName: 'Fósforo', amount: 700, unit: 'mg' },
    'fósforo': { standardName: 'Fósforo', amount: 700, unit: 'mg' },
    'hierro': { standardName: 'Hierro', amount: 14, unit: 'mg' },
    'magnesio': { standardName: 'Magnesio', amount: 375, unit: 'mg' },
    'potasio': { standardName: 'Potasio', amount: 2000, unit: 'mg' },
    'zinc': { standardName: 'Zinc', amount: 10, unit: 'mg' },
    'acido folico': { standardName: 'Ácido Fólico (B9)', amount: 200, unit: 'µg' },
    'ácido fólico': { standardName: 'Ácido Fólico (B9)', amount: 200, unit: 'µg' },
  },
}

/**
 * Normaliza nombres de micronutrientes para agrupar variantes (ej: "Vit B12", "Vitamina B-12", "Cobalamina")
 */
export function normalizeMicronutrientName(rawName: string): { key: string; displayName: string } {
  const lower = rawName.toLowerCase().trim()
  if (lower.includes('b12') || lower.includes('cobalamina')) return { key: 'vitamina b12', displayName: 'Vitamina B12' }
  if (lower.includes('b6') || lower.includes('piridoxina')) return { key: 'vitamina b6', displayName: 'Vitamina B6' }
  if (lower.includes('vitamina c') || lower.includes('ácido ascórbico') || lower.includes('ascorbico')) return { key: 'vitamina c', displayName: 'Vitamina C' }
  if (lower.includes('vitamina d') || lower.includes('calciferol')) return { key: 'vitamina d', displayName: 'Vitamina D' }
  if (lower.includes('vitamina a') || lower.includes('retinol')) return { key: 'vitamina a', displayName: 'Vitamina A' }
  if (lower.includes('vitamina e') || lower.includes('tocoferol')) return { key: 'vitamina e', displayName: 'Vitamina E' }
  if (lower.includes('calcio')) return { key: 'calcio', displayName: 'Calcio' }
  if (lower.includes('fósforo') || lower.includes('fosforo')) return { key: 'fósforo', displayName: 'Fósforo' }
  if (lower.includes('hierro') || lower.includes('iron')) return { key: 'hierro', displayName: 'Hierro' }
  if (lower.includes('magnesio')) return { key: 'magnesio', displayName: 'Magnesio' }
  if (lower.includes('potasio')) return { key: 'potasio', displayName: 'Potasio' }
  if (lower.includes('zinc')) return { key: 'zinc', displayName: 'Zinc' }
  if (lower.includes('folico') || lower.includes('fólico') || lower.includes('b9')) return { key: 'ácido fólico', displayName: 'Ácido Fólico (B9)' }
  return { key: lower, displayName: rawName }
}

/**
 * Extrae valor numérico y unidad de strings como "1.2 mg", "450 µg", "15mg", "15%"
 */
export function parseNutrientAmount(amountStr?: string): { value: number; unit: string } {
  if (!amountStr) return { value: 0, unit: '' }
  const clean = amountStr.replace(',', '.').trim()
  const match = clean.match(/^([\d.]+)\s*([a-zA-Zµ%]*)$/)
  if (match) {
    const value = parseFloat(match[1]) || 0
    const unit = match[2] || ''
    return { value, unit }
  }
  return { value: parseFloat(clean) || 0, unit: '' }
}

/**
 * Agrega los registros de un día específico en un objeto completo de estadísticas y métricas de salud
 */
export function calculateDayNutritionStats(
  date: string,
  logs: FoodLog[],
  targets: DailyTargets
): NutritionDayStats {
  const dayLogs = logs.filter((l) => l.date === date)

  let totalCals = 0
  let totalProt = 0
  let totalCarbs = 0
  let totalFat = 0
  let totalSugars = 0
  let totalSatFat = 0
  let totalSalt = 0
  let totalSodium = 0
  let totalFiber = 0
  let totalItemsCount = 0
  let ultraProcessedCount = 0

  const microMap: Record<string, { name: string; amount: number; unit: string; vrnPercent: number }> = {}

  dayLogs.forEach((log) => {
    totalCals += log.calories || 0
    totalProt += log.protein_g || 0
    totalCarbs += log.carbs_g || 0
    totalFat += log.fat_g || 0

    const foods = log.foods_parsed || []
    foods.forEach((food) => {
      totalItemsCount++
      if ((food.ultraProcessedScore || 0) >= 6) {
        ultraProcessedCount++
      }

      if (typeof food.sugars_g === 'number') totalSugars += food.sugars_g
      if (typeof food.saturated_fat_g === 'number') totalSatFat += food.saturated_fat_g
      if (typeof food.salt_g === 'number') totalSalt += food.salt_g
      if (typeof food.sodium_mg === 'number') totalSodium += food.sodium_mg
      if (typeof food.fiber_g === 'number') totalFiber += food.fiber_g

      // Sumar micronutrientes
      const micros = food.micronutrients || []
      micros.forEach((m) => {
        const { key, displayName } = normalizeMicronutrientName(m.name)
        const parsed = parseNutrientAmount(m.amount || m.amountPerServing || m.amountPer100g)
        const ref = HEALTH_REFERENCES.micronutrientRDA[key]
        const unit = parsed.unit || (ref ? ref.unit : '')

        if (!microMap[key]) {
          microMap[key] = {
            name: displayName,
            amount: 0,
            unit,
            vrnPercent: 0,
          }
        }

        microMap[key].amount += parsed.value
        if (m.vrnPercent) {
          microMap[key].vrnPercent += m.vrnPercent
        } else if (ref && ref.amount > 0) {
          microMap[key].vrnPercent = Math.round((microMap[key].amount / ref.amount) * 100)
        }
      })
    })
  })

  // Si no se reportó sodio explícito pero sí sal
  if (totalSodium === 0 && totalSalt > 0) {
    totalSodium = Math.round(totalSalt * 393.4)
  } else if (totalSalt === 0 && totalSodium > 0) {
    totalSalt = Number((totalSodium / 393.4).toFixed(2))
  }

  const caloriesDiff = Math.round(totalCals - targets.targetCals)
  const proteinDiff = Number((totalProt - targets.targetProtein).toFixed(1))
  const carbsDiff = Number((totalCarbs - targets.targetCarbs).toFixed(1))
  const fatDiff = Number((totalFat - targets.targetFat).toFixed(1))

  // Determinar estatus del día
  let status: NutritionDayStats['status'] = 'optimal'
  if (dayLogs.length === 0) {
    status = 'deficit'
  } else if (caloriesDiff > 250) {
    status = 'surplus'
  } else if (caloriesDiff < -350) {
    status = 'deficit'
  } else if (totalProt < targets.targetProtein * 0.75) {
    status = 'warning'
  }

  const ultraProcessedRatio = totalItemsCount > 0 ? Math.round((ultraProcessedCount / totalItemsCount) * 100) : 0

  return {
    date,
    calories: Math.round(totalCals),
    targetCalories: targets.targetCals,
    caloriesDiff,
    protein: Math.round(totalProt),
    targetProtein: targets.targetProtein,
    proteinDiff,
    carbs: Math.round(totalCarbs),
    targetCarbs: targets.targetCarbs,
    carbsDiff,
    fat: Math.round(totalFat),
    targetFat: targets.targetFat,
    fatDiff,
    mealCount: dayLogs.length,
    status,
    healthMetrics: {
      sugarsG: Number(totalSugars.toFixed(1)),
      saturatedFatG: Number(totalSatFat.toFixed(1)),
      saltG: Number(totalSalt.toFixed(2)),
      sodiumMg: Math.round(totalSodium),
      fiberG: Number(totalFiber.toFixed(1)),
      ultraProcessedRatio,
      micronutrientsMap: microMap,
    },
  }
}

/**
 * Genera la lista de fechas y estadísticas para un rango de días (ej. últimos 7, 14 o 30 días)
 */
export function generateHistoryDateRangeStats(
  logs: FoodLog[],
  targets: DailyTargets,
  daysCount: number = 7,
  endDateStr?: string
): {
  days: NutritionDayStats[]
  avgCalories: number
  avgProtein: number
  avgCarbs: number
  avgFat: number
  netCaloriesBalance: number // superávit/déficit total acumulado
  daysLoggedCount: number
  optimalDaysCount: number
} {
  const endDate = endDateStr ? new Date(endDateStr) : new Date()
  const days: NutritionDayStats[] = []

  for (let i = daysCount - 1; i >= 0; i--) {
    const d = new Date(endDate)
    d.setDate(d.getDate() - i)
    const dateKey = d.toISOString().split('T')[0]
    const dayStat = calculateDayNutritionStats(dateKey, logs, targets)
    days.push(dayStat)
  }

  const loggedDays = days.filter((d) => d.mealCount > 0)
  const count = loggedDays.length || 1

  const avgCalories = Math.round(loggedDays.reduce((s, d) => s + d.calories, 0) / count)
  const avgProtein = Math.round(loggedDays.reduce((s, d) => s + d.protein, 0) / count)
  const avgCarbs = Math.round(loggedDays.reduce((s, d) => s + d.carbs, 0) / count)
  const avgFat = Math.round(loggedDays.reduce((s, d) => s + d.fat, 0) / count)
  const netCaloriesBalance = loggedDays.reduce((s, d) => s + d.caloriesDiff, 0)
  const optimalDaysCount = loggedDays.filter((d) => d.status === 'optimal').length

  return {
    days,
    avgCalories,
    avgProtein,
    avgCarbs,
    avgFat,
    netCaloriesBalance,
    daysLoggedCount: loggedDays.length,
    optimalDaysCount,
  }
}
