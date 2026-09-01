export type Gender = 'male' | 'female' | 'other'
export type Goal = 'muscle_gain' | 'fat_loss' | 'maintenance' | 'recomp'
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active'
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'

export interface Profile {
  id: string
  created_at: string
  updated_at: string
  name?: string | null
  birth_date?: string | null
  gender?: Gender | null
  height_cm?: number | null
  goal?: Goal | null
  activity_level?: ActivityLevel | null
}

export interface BodyWeight {
  id: string
  user_id: string
  created_at: string
  date: string
  weight_kg: number
}

export interface Routine {
  id: string
  user_id: string
  created_at: string
  updated_at: string
  name: string
  description?: string | null
  is_active: boolean
  sort_order: number
  exercises?: RoutineExercise[]
}

export interface RoutineExercise {
  id: string
  routine_id: string
  created_at: string
  name: string
  target_sets: number
  target_reps: string
  rest_seconds: number
  notes?: string | null
  sort_order: number
}

export interface WorkoutSession {
  id: string
  user_id: string
  routine_id?: string | null
  created_at: string
  date: string
  started_at?: string | null
  finished_at?: string | null
  duration_minutes?: number | null
  total_volume_kg?: number | null
  estimated_calories_burned?: number | null
  ai_summary?: string | null
  notes?: string | null
  sets?: SessionSet[]
}

export interface SessionSet {
  id: string
  session_id: string
  exercise_id?: string | null
  created_at: string
  exercise_name: string
  set_number: number
  reps: number
  weight_kg: number
  rpe?: number | null
  is_warmup: boolean
  notes?: string | null
}

export interface FoodItemParsed {
  name: string
  brand?: string | null
  quantity_g: number
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  confidence: 'high' | 'medium' | 'low'
  notes?: string
}

export interface FoodLog {
  id: string
  user_id: string
  created_at: string
  date: string
  meal_type: MealType
  raw_input: string
  foods_parsed?: FoodItemParsed[] | null
  calories?: number | null
  protein_g?: number | null
  carbs_g?: number | null
  fat_g?: number | null
  ai_confidence?: 'high' | 'medium' | 'low' | null
  ai_notes?: string | null
}

export interface DailySummary {
  user_id: string
  date: string
  total_calories: number
  total_protein: number
  total_carbs: number
  total_fat: number
  meal_count: number
  calories_burned: number
}
