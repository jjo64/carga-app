import { Profile } from '@/types'

/**
 * Calcula la edad a partir de la fecha de nacimiento (YYYY-MM-DD)
 */
export function calculateAge(birthDateString?: string | null): number {
  if (!birthDateString) return 25 // Valor por defecto
  const birthDate = new Date(birthDateString)
  const today = new Date()
  let age = today.getFullYear() - birthDate.getFullYear()
  const m = today.getMonth() - birthDate.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--
  }
  return isNaN(age) || age < 10 ? 25 : age
}

/**
 * Calcula la Tasa Metabólica Basal (BMR) usando la fórmula Mifflin-St Jeor
 */
export function calculateBMR(
  profile?: Partial<Profile> | null,
  currentWeightKg: number = 75
): number {
  if (!profile) return 1750

  const age = calculateAge(profile.birth_date)
  const height = profile.height_cm || 175
  const weight = currentWeightKg || 75
  const gender = profile.gender || 'male'

  // Mifflin-St Jeor:
  // Hombres: 10 × peso(kg) + 6.25 × altura(cm) - 5 × edad(a) + 5
  // Mujeres: 10 × peso(kg) + 6.25 × altura(cm) - 5 × edad(a) - 161
  let bmr = 10 * weight + 6.25 * height - 5 * age

  if (gender === 'male') {
    bmr += 5
  } else if (gender === 'female') {
    bmr -= 161
  } else {
    bmr -= 78 // Promedio neutro
  }

  return Math.round(bmr)
}

/**
 * Factores de actividad física estándar
 */
export const ACTIVITY_MULTIPLIERS = {
  sedentary: 1.2,       // Poco o nada de ejercicio
  light: 1.375,         // Ejercicio ligero (1-3 días/semana)
  moderate: 1.55,       // Ejercicio moderado (3-5 días/semana)
  active: 1.725,        // Ejercicio intenso (6-7 días/semana)
  very_active: 1.9,     // Trabajo físico pesado + entreno doble
} as const

/**
 * Calcula el Gasto Energético Diario Total (TDEE)
 */
export function calculateTDEE(
  bmr: number,
  activityLevel: keyof typeof ACTIVITY_MULTIPLIERS = 'moderate'
): number {
  const multiplier = ACTIVITY_MULTIPLIERS[activityLevel] || 1.55
  return Math.round(bmr * multiplier)
}

/**
 * Calcula el objetivo calórico diario ajustado según el objetivo (Goal)
 */
export function calculateTargetCalories(
  tdee: number,
  goal?: Profile['goal']
): number {
  switch (goal) {
    case 'muscle_gain':
      return Math.round(tdee + 300) // Superávit para hipertrofia
    case 'fat_loss':
      return Math.round(tdee - 400) // Déficit moderado
    case 'recomp':
      return Math.round(tdee - 150) // Déficit ligero para recomposición
    case 'maintenance':
    default:
      return Math.round(tdee)
  }
}

export interface NutritionTargets {
  weightKg: number
  bmr: number
  tdee: number
  targetCalories: number
  proteinTarget: number
  carbsTarget: number
  fatTarget: number
}

/**
 * Calcula de forma unificada y resiliente las calorías y macronutrientes del usuario
 */
export function calculateDailyNutritionTargets(
  profile?: Partial<Profile> | null,
  currentWeightKg?: number | null,
  workoutBurnedCalories: number = 0
): NutritionTargets {
  const resolvedWeight =
    currentWeightKg && currentWeightKg > 20
      ? currentWeightKg
      : profile?.initial_weight_kg || profile?.weight_kg || 75

  const bmr = calculateBMR(profile, resolvedWeight)
  const activity = profile?.activity_level || 'moderate'
  const tdee = calculateTDEE(bmr, activity)
  const baseTarget = calculateTargetCalories(tdee, profile?.goal)
  const targetCalories = Math.max(1200, baseTarget + workoutBurnedCalories)

  // Distribución óptima de macronutrientes:
  // 1. Proteína: 2.0g por kg de peso corporal (4 kcal/g)
  // 2. Grasas: 0.9g por kg de peso corporal (9 kcal/g)
  // 3. Carbohidratos: el resto de calorías necesarias dividido entre 4 kcal/g
  const proteinTarget = Math.round(resolvedWeight * 2.0)
  const fatTarget = Math.round(resolvedWeight * 0.9)
  const calFromProteinAndFat = proteinTarget * 4 + fatTarget * 9
  const remainingCalories = Math.max(0, targetCalories - calFromProteinAndFat)
  const carbsTarget = Math.max(30, Math.round(remainingCalories / 4))

  return {
    weightKg: resolvedWeight,
    bmr,
    tdee,
    targetCalories,
    proteinTarget,
    carbsTarget,
    fatTarget,
  }
}

