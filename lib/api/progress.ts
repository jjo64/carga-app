import { supabase } from '../supabase'
import { BodyWeight } from '@/types'

export interface BodyMeasurement {
  id: string
  user_id: string
  created_at: string
  date: string
  waist_cm?: number | null
  chest_cm?: number | null
  arm_cm?: number | null
  thigh_cm?: number | null
  notes?: string | null
}

export async function logBodyWeight(
  userId: string,
  weightKg: number,
  date?: string
): Promise<{ data: BodyWeight | null; error: Error | null }> {
  const targetDate = date || new Date().toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('body_weight')
    .upsert(
      {
        user_id: userId,
        weight_kg: weightKg,
        date: targetDate,
      },
      { onConflict: 'user_id,date' }
    )
    .select()
    .single()

  return { data: data as BodyWeight, error }
}

export async function getWeightHistory(
  userId: string,
  limit: number = 30
): Promise<BodyWeight[]> {
  const { data, error } = await supabase
    .from('body_weight')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .limit(limit)

  if (error || !data) return []
  return data as BodyWeight[]
}

export async function logBodyMeasurements(params: {
  userId: string
  date?: string
  waistCm?: number
  chestCm?: number
  armCm?: number
  thighCm?: number
  notes?: string
}): Promise<{ data: BodyMeasurement | null; error: Error | null }> {
  const targetDate = params.date || new Date().toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('body_measurements')
    .insert({
      user_id: params.userId,
      date: targetDate,
      waist_cm: params.waistCm || null,
      chest_cm: params.chestCm || null,
      arm_cm: params.armCm || null,
      thigh_cm: params.thighCm || null,
      notes: params.notes || null,
    })
    .select()
    .single()

  return { data: data as BodyMeasurement, error }
}

export async function getMeasurementsHistory(
  userId: string,
  limit: number = 20
): Promise<BodyMeasurement[]> {
  const { data, error } = await supabase
    .from('body_measurements')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .limit(limit)

  if (error || !data) return []
  return data as BodyMeasurement[]
}
