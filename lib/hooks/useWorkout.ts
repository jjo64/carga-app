import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabase'
import { useAuth } from './useAuth'
import { Routine, RoutineExercise, WorkoutSession, SessionSet } from '@/types'

export function useRoutines() {
  const { user } = useAuth()
  const [routines, setRoutines] = useState<Routine[]>([])
  const [loading, setLoading] = useState(true)

  const fetchRoutines = useCallback(async () => {
    if (!user) return
    setLoading(true)

    const { data, error } = await supabase
      .from('routines')
      .select(`
        *,
        exercises:routine_exercises (*)
      `)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('sort_order', { ascending: true })

    if (!error && data) {
      setRoutines(data as Routine[])
    }
    setLoading(false)
  }, [user])

  useEffect(() => {
    fetchRoutines()
  }, [fetchRoutines])

  async function createRoutine(name: string, description?: string) {
    if (!user) return { data: null, error: new Error('No autenticado') }

    const { data, error } = await supabase
      .from('routines')
      .insert({
        user_id: user.id,
        name: name.trim(),
        description: description?.trim() || null,
        sort_order: routines.length,
      })
      .select(`
        *,
        exercises:routine_exercises (*)
      `)
      .single()

    if (!error && data) {
      setRoutines((prev) => [...prev, data as Routine])
    }
    return { data: data as Routine, error }
  }

  async function deleteRoutine(routineId: string) {
    const { error } = await supabase
      .from('routines')
      .update({ is_active: false })
      .eq('id', routineId)

    if (!error) {
      setRoutines((prev) => prev.filter((r) => r.id !== routineId))
    }
    return { error }
  }

  async function addExerciseToRoutine(
    routineId: string,
    exercise: {
      name: string
      target_sets: number
      target_reps: string
      rest_seconds: number
      notes?: string
    }
  ) {
    const routine = routines.find((r) => r.id === routineId)
    const currentCount = routine?.exercises?.length || 0

    const { data, error } = await supabase
      .from('routine_exercises')
      .insert({
        routine_id: routineId,
        name: exercise.name.trim(),
        target_sets: exercise.target_sets,
        target_reps: exercise.target_reps.trim(),
        rest_seconds: exercise.rest_seconds,
        notes: exercise.notes?.trim() || null,
        sort_order: currentCount,
      })
      .select()
      .single()

    if (!error && data) {
      await fetchRoutines()
    }
    return { data: data as RoutineExercise, error }
  }

  async function deleteExercise(exerciseId: string) {
    const { error } = await supabase
      .from('routine_exercises')
      .delete()
      .eq('id', exerciseId)

    if (!error) {
      await fetchRoutines()
    }
    return { error }
  }

  return {
    routines,
    loading,
    createRoutine,
    deleteRoutine,
    addExerciseToRoutine,
    deleteExercise,
    refetch: fetchRoutines,
  }
}

export function useActiveSession(sessionId?: string, routineId?: string) {
  const { user, profile } = useAuth()
  const [session, setSession] = useState<WorkoutSession | null>(null)
  const [routine, setRoutine] = useState<Routine | null>(null)
  const [sets, setSets] = useState<SessionSet[]>([])
  const [previousSets, setPreviousSets] = useState<
    Record<string, Record<number, { weight_kg: number; reps: number }>>
  >({})
  const [loading, setLoading] = useState(true)

  // Carga o crea la sesión activa
  const initializeSession = useCallback(async () => {
    if (!user) return
    setLoading(true)

    let currentSession: WorkoutSession | null = null

    // 1. Si ya tenemos sessionId, cargarla
    if (sessionId) {
      const { data } = await supabase
        .from('workout_sessions')
        .select('*')
        .eq('id', sessionId)
        .single()
      currentSession = data as WorkoutSession
    } else if (routineId) {
      // 2. Si no, crear una nueva sesión para la rutina
      const today = new Date().toISOString().split('T')[0]
      const { data } = await supabase
        .from('workout_sessions')
        .insert({
          user_id: user.id,
          routine_id: routineId,
          date: today,
          started_at: new Date().toISOString(),
        })
        .select()
        .single()
      currentSession = data as WorkoutSession
    }

    if (currentSession) {
      setSession(currentSession)

      // Cargar rutina y sus ejercicios
      if (currentSession.routine_id) {
        const { data: routineData } = await supabase
          .from('routines')
          .select(`
            *,
            exercises:routine_exercises (*)
          `)
          .eq('id', currentSession.routine_id)
          .single()
        setRoutine(routineData as Routine)

        // Cargar pesos previos de la sesión anterior de esta misma rutina
        await loadPreviousSessionSets(currentSession.routine_id, currentSession.id)
      }

      // Cargar series ya registradas en esta sesión
      const { data: sessionSets } = await supabase
        .from('session_sets')
        .select('*')
        .eq('session_id', currentSession.id)
        .order('created_at', { ascending: true })

      setSets((sessionSets as SessionSet[]) || [])
    }

    setLoading(false)
  }, [user, sessionId, routineId])

  useEffect(() => {
    initializeSession()
  }, [initializeSession])

  // Carga las series de la última sesión finalizada de esta rutina
  async function loadPreviousSessionSets(rId: string, currentSessionId: string) {
    if (!user) return

    const { data: previousSessions } = await supabase
      .from('workout_sessions')
      .select('id')
      .eq('user_id', user.id)
      .eq('routine_id', rId)
      .neq('id', currentSessionId)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(1)

    if (previousSessions && previousSessions.length > 0) {
      const prevId = previousSessions[0].id
      const { data: prevSetsData } = await supabase
        .from('session_sets')
        .select('*')
        .eq('session_id', prevId)

      if (prevSetsData) {
        const organized: Record<
          string,
          Record<number, { weight_kg: number; reps: number }>
        > = {}

        prevSetsData.forEach((s) => {
          const key = s.exercise_id || s.exercise_name
          if (!organized[key]) {
            organized[key] = {}
          }
          organized[key][s.set_number] = {
            weight_kg: s.weight_kg,
            reps: s.reps,
          }
        })

        setPreviousSets(organized)
      }
    }
  }

  // Registrar una serie
  async function logSet(params: {
    exerciseId?: string
    exerciseName: string
    setNumber: number
    weightKg: number
    reps: number
    rpe?: number
    isWarmup?: boolean
    notes?: string
  }) {
    if (!session) return { data: null, error: new Error('No hay sesión activa') }

    const { data, error } = await supabase
      .from('session_sets')
      .insert({
        session_id: session.id,
        exercise_id: params.exerciseId || null,
        exercise_name: params.exerciseName,
        set_number: params.setNumber,
        weight_kg: params.weightKg,
        reps: params.reps,
        rpe: params.rpe || null,
        is_warmup: params.isWarmup || false,
        notes: params.notes || null,
      })
      .select()
      .single()

    if (!error && data) {
      setSets((prev) => [...prev, data as SessionSet])
    }
    return { data: data as SessionSet, error }
  }

  // Finalizar sesión y calcular volumen total
  async function finishSession(notes?: string) {
    if (!session) return { error: new Error('No hay sesión activa') }

    const finishedAt = new Date()
    const startedAt = session.started_at
      ? new Date(session.started_at)
      : new Date()
    const durationMinutes = Math.max(
      1,
      Math.round((finishedAt.getTime() - startedAt.getTime()) / 60000)
    )

    // Volumen total = suma de (peso × reps) de series que no sean calentamiento
    const totalVolume = sets
      .filter((s) => !s.is_warmup)
      .reduce((acc, s) => acc + s.weight_kg * s.reps, 0)

    // Estimación preliminar de calorías quemadas si no hay IA
    const userWeight = 75
    const estimatedBurn = Math.round(
      5.0 * userWeight * (durationMinutes / 60) + (totalVolume / 100) * 0.1
    )

    const { error } = await supabase
      .from('workout_sessions')
      .update({
        finished_at: finishedAt.toISOString(),
        duration_minutes: durationMinutes,
        total_volume_kg: totalVolume,
        estimated_calories_burned: estimatedBurn,
        notes: notes?.trim() || null,
      })
      .eq('id', session.id)

    return { error, totalVolume, durationMinutes, estimatedBurn }
  }

  return {
    session,
    routine,
    sets,
    previousSets,
    loading,
    logSet,
    finishSession,
  }
}
