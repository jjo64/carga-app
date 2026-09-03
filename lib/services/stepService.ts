import AsyncStorage from '@react-native-async-storage/async-storage'
import { Pedometer } from 'expo-sensors'

export interface DailyStepsRecord {
  date: string // YYYY-MM-DD
  steps: number
  goal: number
  distanceKm: number
  caloriesBurned: number
  lastUpdated: number
}

const STORAGE_KEY_STEPS = '@carga_daily_steps_v1'
const STORAGE_KEY_STEP_GOAL = '@carga_step_goal_v1'
const DEFAULT_GOAL = 8000

let inMemoryStepsMap: Record<string, DailyStepsRecord> = {}
let currentGoal = DEFAULT_GOAL
let stepListeners: Array<() => void> = []

function notifyStepListeners() {
  stepListeners.forEach((l) => l())
}

export function subscribeToStepUpdates(listener: () => void) {
  stepListeners.push(listener)
  return () => {
    stepListeners = stepListeners.filter((l) => l !== listener)
  }
}

/**
 * Calcula calorías y distancia estimada a partir de los pasos
 */
export function calculateStepMetrics(steps: number, userWeightKg = 75) {
  // ~0.04 kcal por paso para una persona promedio de 75kg
  const kcalFactor = (userWeightKg / 75) * 0.038
  const caloriesBurned = Math.round(steps * kcalFactor)
  // ~0.76 metros por paso promedio
  const distanceKm = Number(((steps * 0.76) / 1000).toFixed(2))
  return { caloriesBurned, distanceKm }
}

/**
 * Carga los registros de pasos desde el almacenamiento local
 */
export async function loadStepsData(): Promise<{
  stepsMap: Record<string, DailyStepsRecord>
  goal: number
}> {
  try {
    const rawSteps = await AsyncStorage.getItem(STORAGE_KEY_STEPS)
    const rawGoal = await AsyncStorage.getItem(STORAGE_KEY_STEP_GOAL)
    if (rawSteps) inMemoryStepsMap = JSON.parse(rawSteps)
    if (rawGoal) currentGoal = parseInt(rawGoal, 10) || DEFAULT_GOAL
  } catch (err) {
    console.log('Error loading steps data:', err)
  }
  return { stepsMap: inMemoryStepsMap, goal: currentGoal }
}

/**
 * Obtiene los pasos del día de hoy
 */
export function getTodayStepsRecord(): DailyStepsRecord {
  const today = new Date().toISOString().split('T')[0]
  if (!inMemoryStepsMap[today]) {
    const metrics = calculateStepMetrics(0)
    inMemoryStepsMap[today] = {
      date: today,
      steps: 0,
      goal: currentGoal,
      distanceKm: metrics.distanceKm,
      caloriesBurned: metrics.caloriesBurned,
      lastUpdated: Date.now(),
    }
  }
  return inMemoryStepsMap[today]
}

/**
 * Actualiza los pasos para una fecha específica
 */
export async function updateDailySteps(date: string, steps: number): Promise<DailyStepsRecord> {
  const metrics = calculateStepMetrics(steps)
  const record: DailyStepsRecord = {
    date,
    steps,
    goal: currentGoal,
    distanceKm: metrics.distanceKm,
    caloriesBurned: metrics.caloriesBurned,
    lastUpdated: Date.now(),
  }

  inMemoryStepsMap[date] = record

  try {
    await AsyncStorage.setItem(STORAGE_KEY_STEPS, JSON.stringify(inMemoryStepsMap))
  } catch (e) {
    console.log('Error saving steps record:', e)
  }

  notifyStepListeners()
  return record
}

/**
 * Sincroniza los pasos con el podómetro nativo por hardware del dispositivo
 */
export async function syncHardwarePedometer(): Promise<number> {
  try {
    const isAvailable = await Pedometer.isAvailableAsync()
    if (!isAvailable) {
      return getTodayStepsRecord().steps
    }

    const start = new Date()
    start.setHours(0, 0, 0, 0)
    const end = new Date()

    const result = await Pedometer.getStepCountAsync(start, end)
    if (result && typeof result.steps === 'number') {
      const today = new Date().toISOString().split('T')[0]
      await updateDailySteps(today, result.steps)
      return result.steps
    }
  } catch (err) {
    console.log('Pedometer sync notice:', err)
  }

  return getTodayStepsRecord().steps
}

/**
 * Actualiza la meta diaria de pasos
 */
export async function setDailyStepGoal(newGoal: number): Promise<number> {
  currentGoal = newGoal
  const today = new Date().toISOString().split('T')[0]
  if (inMemoryStepsMap[today]) {
    inMemoryStepsMap[today].goal = newGoal
  }

  try {
    await AsyncStorage.setItem(STORAGE_KEY_STEP_GOAL, String(newGoal))
    await AsyncStorage.setItem(STORAGE_KEY_STEPS, JSON.stringify(inMemoryStepsMap))
  } catch (e) {
    console.log('Error saving step goal:', e)
  }

  notifyStepListeners()
  return currentGoal
}
