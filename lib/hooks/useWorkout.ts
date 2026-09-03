import { useState, useEffect, useCallback } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { supabase } from '../supabase'
import { useAuth } from './useAuth'
import { Routine, RoutineExercise, WorkoutSession, SessionSet } from '@/types'
import { EXERCISE_DATABASE } from '@/constants/exerciseDatabase'

const STORAGE_KEY_ROUTINES = '@carga_user_routines'
const STORAGE_KEY_DISMISSED = '@carga_dismissed_starters'

async function saveRoutinesToStorage(routines: Routine[], dismissed: string[]) {
  try {
    await AsyncStorage.setItem(STORAGE_KEY_ROUTINES, JSON.stringify(routines))
    await AsyncStorage.setItem(STORAGE_KEY_DISMISSED, JSON.stringify(dismissed))
  } catch (e) {
    console.log('Error saving routines to storage:', e)
  }
}

async function loadRoutinesFromStorage(): Promise<{ routines: Routine[] | null; dismissed: string[] }> {
  try {
    const rawR = await AsyncStorage.getItem(STORAGE_KEY_ROUTINES)
    const rawD = await AsyncStorage.getItem(STORAGE_KEY_DISMISSED)
    const routines = rawR ? JSON.parse(rawR) : null
    const dismissed = rawD ? JSON.parse(rawD) : []
    return { routines, dismissed }
  } catch (e) {
    return { routines: null, dismissed: [] }
  }
}

export interface PastWorkoutExerciseSummary {
  name: string
  sets: number
  muscleGroup: string
}

export interface UserWorkoutHistoryItem {
  id: string
  routineId?: string | null
  routineName: string
  date: string
  dateLabel: string
  privacy: string
  durationMinutes: number
  durationFormatted: string
  volumeKg: number
  recordsCount: number
  exercises: PastWorkoutExerciseSummary[]
  detailedSets?: SessionSet[]
  finishedAt?: string | null
  notes?: string | null
}

// In-memory cache for fast responsive UI updates
let localHistoryCache: UserWorkoutHistoryItem[] = []
let historyListeners: Array<() => void> = []

function notifyHistoryListeners() {
  historyListeners.forEach((listener) => listener())
}

export function addLocalWorkoutToHistory(item: UserWorkoutHistoryItem) {
  localHistoryCache = [item, ...localHistoryCache.filter((w) => w.id !== item.id)]
  notifyHistoryListeners()
}

export function deleteLocalWorkoutFromHistory(sessionId: string) {
  localHistoryCache = localHistoryCache.filter((w) => w.id !== sessionId)
  notifyHistoryListeners()
}

export function updateLocalWorkoutInHistory(sessionId: string, updates: Partial<UserWorkoutHistoryItem>) {
  localHistoryCache = localHistoryCache.map((w) => {
    if (w.id === sessionId) {
      const updated = { ...w, ...updates }
      if (updates.durationMinutes !== undefined) {
        updated.durationFormatted = formatDuration(updates.durationMinutes)
      }
      if (updates.date) {
        updated.dateLabel = formatDateLabel(updates.date)
      }
      return updated
    }
    return w
  })
  notifyHistoryListeners()
}

export interface ExerciseRecordData {
  maxWeightOverall: number
  maxWeightPerSet: Record<number, number>
  lastSessionSets: Array<{ setNum: number; weightKg: number; reps: number; isWarmup?: boolean }>
  bestSetSummary: string
}

export function getExerciseRecordData(exerciseName: string): ExerciseRecordData {
  const normName = (exerciseName || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()

  let maxWeightOverall = 0
  const maxWeightPerSet: Record<number, number> = {}
  let lastSessionSets: Array<{ setNum: number; weightKg: number; reps: number; isWarmup?: boolean }> = []
  let bestSetSummary = 'Sin registros'

  // Look through history from newest to oldest
  for (const session of localHistoryCache) {
    if (!session.detailedSets || session.detailedSets.length === 0) continue

    const matchingSets = session.detailedSets.filter((s) => {
      const sNorm = (s.exercise_name || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()
      return sNorm === normName || normName.includes(sNorm) || sNorm.includes(normName)
    })

    if (matchingSets.length > 0) {
      if (lastSessionSets.length === 0) {
        lastSessionSets = matchingSets.map((s) => ({
          setNum: s.set_number,
          weightKg: s.weight_kg,
          reps: s.reps,
          isWarmup: s.is_warmup || false,
        }))
      }

      matchingSets.forEach((s) => {
        if (s.weight_kg > maxWeightOverall) {
          maxWeightOverall = s.weight_kg
          bestSetSummary = `${s.weight_kg} kg × ${s.reps}`
        }
        if (!maxWeightPerSet[s.set_number] || s.weight_kg > maxWeightPerSet[s.set_number]) {
          maxWeightPerSet[s.set_number] = s.weight_kg
        }
      })
    }
  }

  return {
    maxWeightOverall,
    maxWeightPerSet,
    lastSessionSets,
    bestSetSummary,
  }
}

export function getSetPlaceholder(
  exerciseName: string,
  setNum: number,
  targetReps?: string
): { placeholderWeight: string; placeholderReps: string; previousSummary: string } {
  const records = getExerciseRecordData(exerciseName)
  const lastSet = records.lastSessionSets.find((s) => s.setNum === setNum)

  const placeholderWeight = records.maxWeightPerSet[setNum]
    ? String(records.maxWeightPerSet[setNum])
    : records.maxWeightOverall > 0
    ? String(records.maxWeightOverall)
    : ''

  const placeholderReps = lastSet
    ? String(lastSet.reps)
    : targetReps
    ? targetReps.split('-')[0].trim() || '10'
    : '10'

  const previousSummary = lastSet
    ? `${lastSet.weightKg} kg × ${lastSet.reps}`
    : records.maxWeightOverall > 0
    ? `PR: ${records.maxWeightOverall} kg`
    : '—'

  return {
    placeholderWeight,
    placeholderReps,
    previousSummary,
  }
}

export async function discardWorkoutSession(sessionId: string, userId?: string) {
  try {
    deleteLocalWorkoutFromHistory(sessionId)
    if (userId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sessionId)) {
      await supabase.from('session_sets').delete().eq('session_id', sessionId)
      await supabase.from('workout_sessions').delete().eq('id', sessionId)
    }
  } catch (err) {
    console.log('Error discarding workout session:', err)
  }
}

export const DEFAULT_STARTER_ROUTINES = [
  {
    id: 'starter-pecho',
    name: 'Pecho - Hipertrofia & Fuerza',
    description: 'Enfoque en pectoral mayor, clavicular y tríceps',
    target: 'pecho',
    duration: '45 min',
    assigned_days: ['Lunes', 'Jueves'],
    exercises: [
      { name: 'Press de Banca Plano con Barra', target_sets: 4, target_reps: '8-10', rest_seconds: 90, muscleGroup: 'Pecho' },
      { name: 'Press Inclinado con Mancuernas', target_sets: 3, target_reps: '10-12', rest_seconds: 90, muscleGroup: 'Pecho' },
      { name: 'Press en Máquina (Pec Deck)', target_sets: 3, target_reps: '12-15', rest_seconds: 60, muscleGroup: 'Pecho' },
    ],
  },
  {
    id: 'starter-espalda',
    name: 'Espalda & Tríceps - Densidad',
    description: 'Trabajo completo de dorsal ancho, trapecios y brazos',
    target: 'espalda',
    duration: '55 min',
    assigned_days: ['Martes', 'Viernes'],
    exercises: [
      { name: 'Jalón al Pecho en Polea', target_sets: 4, target_reps: '10-12', rest_seconds: 90, muscleGroup: 'Espalda' },
      { name: 'Remo con Mancuerna a 1 Mano', target_sets: 3, target_reps: '10-12', rest_seconds: 90, muscleGroup: 'Espalda' },
      { name: 'Extensiones de Tríceps en Polea', target_sets: 4, target_reps: '12-15', rest_seconds: 60, muscleGroup: 'Tríceps' },
      { name: 'Fondos en Paralelas', target_sets: 3, target_reps: '8-10', rest_seconds: 90, muscleGroup: 'Tríceps' },
    ],
  },
  {
    id: 'starter-pierna',
    name: 'Pierna - Fuerza Cuádriceps',
    description: 'Sentadillas, prensa y extensión para desarrollo de piernas',
    target: 'pierna',
    duration: '60 min',
    assigned_days: ['Miércoles', 'Sábado'],
    exercises: [
      { name: 'Sentadilla con Barra Trasera', target_sets: 4, target_reps: '6-8', rest_seconds: 120, muscleGroup: 'Cuádriceps' },
      { name: 'Prensa de Piernas 45°', target_sets: 4, target_reps: '10-12', rest_seconds: 90, muscleGroup: 'Cuádriceps' },
      { name: 'Extensión de Cuádriceps', target_sets: 3, target_reps: '12-15', rest_seconds: 60, muscleGroup: 'Cuádriceps' },
      { name: 'Elevación de Talones de Pie', target_sets: 4, target_reps: '15-20', rest_seconds: 45, muscleGroup: 'Pantorrillas' },
    ],
  },
]

export function parseRoutineDays(routine: { assigned_days?: string[]; description?: string | null }): string[] {
  if (Array.isArray(routine.assigned_days) && routine.assigned_days.length > 0) {
    return routine.assigned_days
  }
  if (routine.description && routine.description.includes('__DAYS:')) {
    const match = routine.description.match(/__DAYS:([^__]+)__/)
    if (match && match[1]) {
      return match[1].split(',').filter(Boolean)
    }
  }
  return []
}

export function cleanRoutineDescription(description?: string | null): string {
  if (!description) return ''
  return description.replace(/__DAYS:[^__]+__\s*/g, '').trim()
}

export function encodeRoutineDescription(description?: string | null, days?: string[]): string {
  const clean = cleanRoutineDescription(description)
  if (!days || days.length === 0) return clean
  return `__DAYS:${days.join(',')}__ ${clean}`.trim()
}

function resolveMuscleGroup(exerciseName: string): string {
  const norm = (exerciseName || '').toLowerCase()
  const dbMatch = EXERCISE_DATABASE.find(
    (e) => e.name.toLowerCase() === norm || norm.includes(e.name.toLowerCase()) || e.name.toLowerCase().includes(norm)
  )
  if (dbMatch) return dbMatch.muscleGroup

  if (norm.includes('pecho') || norm.includes('banca') || norm.includes('chest') || norm.includes('apertura')) return 'Pecho'
  if (norm.includes('espalda') || norm.includes('jalon') || norm.includes('jalón') || norm.includes('remo') || norm.includes('dominada')) return 'Espalda'
  if (norm.includes('bicep') || norm.includes('bícep') || norm.includes('curl')) return 'Bíceps'
  if (norm.includes('tricep') || norm.includes('trícep') || norm.includes('fondo') || norm.includes('frances')) return 'Tríceps'
  if (norm.includes('hombro') || norm.includes('militar') || norm.includes('lateral') || norm.includes('deltoide')) return 'Hombros'
  if (norm.includes('pierna') || norm.includes('sentadilla') || norm.includes('prensa') || norm.includes('cuad')) return 'Cuádriceps'
  if (norm.includes('isquio') || norm.includes('femoral') || norm.includes('muerto')) return 'Isquiotibiales'
  if (norm.includes('gluteo') || norm.includes('glúteo') || norm.includes('hip')) return 'Glúteos'
  if (norm.includes('abdomen') || norm.includes('abs') || norm.includes('crunch')) return 'Abs'
  return 'Pecho'
}

export function formatDateLabel(dateStr: string): string {
  if (!dateStr) return 'Reciente'
  const today = new Date()
  const d = new Date(dateStr.includes('T') ? dateStr : `${dateStr}T12:00:00`)

  const diffDays = Math.round((today.setHours(0, 0, 0, 0) - new Date(d).setHours(0, 0, 0, 0)) / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'Hoy'
  if (diffDays === 1) return 'Ayer'
  if (diffDays === 2) return 'Anteayer'
  if (diffDays > 2 && diffDays < 7) {
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
    return days[d.getDay()]
  }
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
}

export function formatDuration(minutes: number): string {
  if (!minutes || minutes <= 0) return '15 min'
  if (minutes < 60) return `${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h ${m}min` : `${h}h`
}

export function calculateStreak(history: { date?: string; finishedAt?: string | null }[]): number {
  if (!history || history.length === 0) return 0
  const dates = Array.from(
    new Set(
      history
        .map((h) => h.date || (h.finishedAt ? h.finishedAt.split('T')[0] : ''))
        .filter(Boolean)
    )
  ).sort((a, b) => new Date(b).getTime() - new Date(a).getTime())

  if (dates.length === 0) return 0

  const today = new Date().toISOString().split('T')[0]
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]

  if (dates[0] !== today && dates[0] !== yesterday) {
    return 0
  }

  let streak = 1
  for (let i = 0; i < dates.length - 1; i++) {
    const curr = new Date(dates[i])
    const prev = new Date(dates[i + 1])
    const diffDays = Math.round((curr.getTime() - prev.getTime()) / (1000 * 3600 * 24))
    if (diffDays === 1) {
      streak++
    } else {
      break
    }
  }
  return streak
}

export function useWorkoutHistory() {
  const { user } = useAuth()
  const [history, setHistory] = useState<UserWorkoutHistoryItem[]>(localHistoryCache)
  const [loading, setLoading] = useState(true)

  const fetchHistory = useCallback(async () => {
    if (!user) {
      setLoading(false)
      return
    }

    try {
      const { data, error } = await supabase
        .from('workout_sessions')
        .select(`
          id,
          user_id,
          routine_id,
          date,
          started_at,
          finished_at,
          duration_minutes,
          total_volume_kg,
          estimated_calories_burned,
          ai_summary,
          notes,
          routine:routines(name),
          sets:session_sets(*)
        `)
        .eq('user_id', user.id)
        .not('finished_at', 'is', null)
        .order('date', { ascending: false })
        .order('finished_at', { ascending: false })

      if (!error && data) {
        const parsedHistory: UserWorkoutHistoryItem[] = data.map((session: any) => {
          let routineName = session.routine?.name || session.notes || 'Entrenamiento Libre'
          let recordsCount = 0

          if (session.ai_summary) {
            try {
              const parsed = JSON.parse(session.ai_summary)
              if (parsed.routineName) routineName = parsed.routineName
              if (parsed.recordsCount) recordsCount = parsed.recordsCount
            } catch {
              // Ignore
            }
          }

          const sessionSets: SessionSet[] = session.sets || []
          const exerciseMap: Record<string, { count: number; name: string }> = {}

          sessionSets.forEach((s) => {
            const exName = s.exercise_name || 'Ejercicio'
            if (!exerciseMap[exName]) {
              exerciseMap[exName] = { count: 0, name: exName }
            }
            exerciseMap[exName].count += 1
          })

          const exercisesSummary: PastWorkoutExerciseSummary[] = Object.values(exerciseMap).map((e) => ({
            name: e.name,
            sets: e.count,
            muscleGroup: resolveMuscleGroup(e.name),
          }))

          const durationMin = session.duration_minutes || 45
          const volume = Number(session.total_volume_kg) || 0

          return {
            id: session.id,
            routineId: session.routine_id,
            routineName,
            date: session.date,
            dateLabel: formatDateLabel(session.date),
            privacy: 'Solo tú',
            durationMinutes: durationMin,
            durationFormatted: formatDuration(durationMin),
            volumeKg: volume,
            recordsCount: recordsCount || (volume > 5000 ? 2 : volume > 0 ? 1 : 0),
            exercises: exercisesSummary,
            detailedSets: sessionSets,
            finishedAt: session.finished_at,
            notes: session.notes || null,
          }
        })

        // Merge with local cache
        const all = [...localHistoryCache]
        parsedHistory.forEach((remoteItem) => {
          if (!all.some((localItem) => localItem.id === remoteItem.id)) {
            all.push(remoteItem)
          }
        })

        // Sort by date/finishedAt desc
        all.sort((a, b) => new Date(b.finishedAt || b.date).getTime() - new Date(a.finishedAt || a.date).getTime())
        localHistoryCache = all
        setHistory(all)
      } else {
        setHistory(localHistoryCache)
      }
    } catch (err) {
      console.log('Error fetching workout history:', err)
      setHistory(localHistoryCache)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    fetchHistory()

    const listener = () => {
      setHistory([...localHistoryCache])
    }
    historyListeners.push(listener)
    return () => {
      historyListeners = historyListeners.filter((l) => l !== listener)
    }
  }, [fetchHistory])

  // Delete workout session
  const deleteWorkout = async (sessionId: string) => {
    deleteLocalWorkoutFromHistory(sessionId)
    try {
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sessionId)
      if (isUUID) {
        await supabase.from('session_sets').delete().eq('session_id', sessionId)
        await supabase.from('workout_sessions').delete().eq('id', sessionId)
      }
    } catch (err) {
      console.log('Error deleting workout session:', err)
    }
  }

  // Update workout session
  const updateWorkout = async (sessionId: string, updates: {
    routineName?: string
    notes?: string
    date?: string
    durationMinutes?: number
    volumeKg?: number
  }) => {
    updateLocalWorkoutInHistory(sessionId, updates)

    try {
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sessionId)
      if (isUUID) {
        const payload: any = {}
        if (updates.date) payload.date = updates.date
        if (updates.durationMinutes !== undefined) payload.duration_minutes = updates.durationMinutes
        if (updates.volumeKg !== undefined) payload.total_volume_kg = updates.volumeKg
        if (updates.notes !== undefined) payload.notes = updates.notes
        if (updates.routineName) {
          payload.notes = updates.routineName
          payload.ai_summary = JSON.stringify({
            routineName: updates.routineName,
            volumeKg: updates.volumeKg || 0,
          })
        }

        await supabase.from('workout_sessions').update(payload).eq('id', sessionId)
      }
    } catch (err) {
      console.log('Error updating workout session:', err)
    }
  }

  return {
    history,
    loading,
    refetch: fetchHistory,
    deleteWorkout,
    updateWorkout,
  }
}

let localRoutinesCache: Routine[] = []
let routinesListeners: Array<() => void> = []
const dismissedStarterIds = new Set<string>()
let hasLoadedDbRoutines = false

function notifyRoutinesListeners() {
  routinesListeners.forEach((listener) => listener())
}

function getInitialStarterRoutines(userId = ''): Routine[] {
  return DEFAULT_STARTER_ROUTINES.filter((r) => !dismissedStarterIds.has(r.id)).map((r) => ({
    id: r.id,
    user_id: userId,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    name: r.name,
    description: r.description,
    assigned_days: r.assigned_days,
    is_active: true,
    sort_order: 0,
    exercises: r.exercises.map((e, idx) => ({
      id: `starter-${r.id}-${idx}`,
      routine_id: r.id,
      created_at: new Date().toISOString(),
      name: e.name,
      target_sets: e.target_sets,
      target_reps: e.target_reps,
      rest_seconds: e.rest_seconds,
      notes: null,
      sort_order: idx,
    })),
  }))
}

export function useRoutines() {
  const { user } = useAuth()
  const [routines, setRoutines] = useState<Routine[]>(() => {
    if (localRoutinesCache.length > 0) return localRoutinesCache
    if (!hasLoadedDbRoutines) {
      localRoutinesCache = getInitialStarterRoutines(user?.id || '')
      return localRoutinesCache
    }
    return []
  })
  const [loading, setLoading] = useState(false)

  const fetchRoutines = useCallback(async () => {
    if (!user) {
      if (localRoutinesCache.length === 0 && !hasLoadedDbRoutines) {
        localRoutinesCache = getInitialStarterRoutines('')
        setRoutines(localRoutinesCache)
        notifyRoutinesListeners()
      }
      setLoading(false)
      return
    }

    try {
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
        const mapped: Routine[] = data.map((r: any) => ({
          ...r,
          assigned_days: parseRoutineDays(r),
        }))

        hasLoadedDbRoutines = true

        if (mapped.length > 0) {
          localRoutinesCache = mapped
          setRoutines(mapped)
          notifyRoutinesListeners()
        } else if (localRoutinesCache.length === 0 && dismissedStarterIds.size === 0) {
          // First time user with no routines: show starters
          const starters = getInitialStarterRoutines(user.id)
          localRoutinesCache = starters
          setRoutines(starters)
          notifyRoutinesListeners()
        } else {
          // User deleted all routines
          localRoutinesCache = localRoutinesCache.filter((r) => !dismissedStarterIds.has(r.id))
          setRoutines([...localRoutinesCache])
          notifyRoutinesListeners()
        }
      }
    } catch (e) {
      console.log('Error fetching routines:', e)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    fetchRoutines()

    const listener = () => {
      setRoutines([...localRoutinesCache])
    }
    routinesListeners.push(listener)
    return () => {
      routinesListeners = routinesListeners.filter((l) => l !== listener)
    }
  }, [fetchRoutines])

  async function createRoutine(
    name: string,
    description?: string,
    assignedDays?: string[],
    exercises?: Array<{
      name: string
      target_sets: number
      target_reps: string
      rest_seconds: number
      notes?: string
    }>
  ) {
    const encodedDesc = encodeRoutineDescription(description, assignedDays)
    const newRoutineId = `routine-${Date.now()}`

    // Optimistic local routine
    const optimisticRoutine: Routine = {
      id: newRoutineId,
      user_id: user?.id || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      name: name.trim(),
      description: encodedDesc,
      assigned_days: assignedDays || [],
      is_active: true,
      sort_order: localRoutinesCache.length,
      exercises: exercises?.map((e, idx) => ({
        id: `ex-${Date.now()}-${idx}`,
        routine_id: newRoutineId,
        created_at: new Date().toISOString(),
        name: e.name,
        target_sets: e.target_sets,
        target_reps: e.target_reps,
        rest_seconds: e.rest_seconds,
        notes: e.notes || null,
        sort_order: idx,
      })) || [],
    }

    localRoutinesCache = [...localRoutinesCache, optimisticRoutine]
    setRoutines([...localRoutinesCache])
    notifyRoutinesListeners()
    saveRoutinesToStorage(localRoutinesCache, Array.from(dismissedStarterIds))

    if (user) {
      try {
        const payload: any = {
          user_id: user.id,
          name: name.trim(),
          description: encodedDesc,
          sort_order: localRoutinesCache.length,
        }
        if (assignedDays && assignedDays.length > 0) {
          payload.assigned_days = assignedDays
        }

        const { data, error } = await supabase
          .from('routines')
          .insert(payload)
          .select(`
            *,
            exercises:routine_exercises (*)
          `)
          .single()

        if (!error && data) {
          const savedRoutine: Routine = {
            ...data,
            assigned_days: assignedDays || parseRoutineDays(data),
            exercises: [],
          }

          if (exercises && exercises.length > 0) {
            const exercisesToInsert = exercises.map((e, idx) => ({
              routine_id: data.id,
              name: e.name.trim(),
              target_sets: e.target_sets,
              target_reps: e.target_reps.trim(),
              rest_seconds: e.rest_seconds,
              notes: e.notes?.trim() || null,
              sort_order: idx,
            }))

            const { data: exData } = await supabase
              .from('routine_exercises')
              .insert(exercisesToInsert)
              .select()

            if (exData) {
              savedRoutine.exercises = exData
            }
          }

          localRoutinesCache = localRoutinesCache.map((r) =>
            r.id === newRoutineId ? savedRoutine : r
          )
          setRoutines([...localRoutinesCache])
          notifyRoutinesListeners()
          saveRoutinesToStorage(localRoutinesCache, Array.from(dismissedStarterIds))
          return { data: savedRoutine, error: null }
        }
      } catch (err) {
        console.log('Error creating routine in DB:', err)
      }
    }

    return { data: optimisticRoutine, error: null }
  }

  async function updateRoutine(
    routineId: string,
    updates: {
      name?: string
      description?: string
      assigned_days?: string[]
      exercises?: Array<{
        id?: string
        name: string
        target_sets: number
        target_reps: string
        rest_seconds: number
        notes?: string
      }>
    }
  ) {
    const isStarter = routineId.startsWith('starter-') || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(routineId)

    if (isStarter) {
      dismissedStarterIds.add(routineId)
      localRoutinesCache = localRoutinesCache.filter((r) => r.id !== routineId)
      saveRoutinesToStorage(localRoutinesCache, Array.from(dismissedStarterIds))
      return await createRoutine(
        updates.name || 'Rutina',
        updates.description,
        updates.assigned_days,
        updates.exercises
      )
    }

    const encodedDesc = encodeRoutineDescription(updates.description, updates.assigned_days)

    // Update local cache immediately
    localRoutinesCache = localRoutinesCache.map((r) => {
      if (r.id === routineId) {
        return {
          ...r,
          name: updates.name ?? r.name,
          description: encodedDesc,
          assigned_days: updates.assigned_days ?? r.assigned_days,
          exercises: updates.exercises?.map((e, idx) => ({
            id: e.id || `ex-${Date.now()}-${idx}`,
            routine_id: routineId,
            created_at: new Date().toISOString(),
            name: e.name,
            target_sets: e.target_sets,
            target_reps: e.target_reps,
            rest_seconds: e.rest_seconds,
            notes: e.notes || null,
            sort_order: idx,
          })) ?? r.exercises,
        }
      }
      return r
    })
    setRoutines([...localRoutinesCache])
    notifyRoutinesListeners()
    saveRoutinesToStorage(localRoutinesCache, Array.from(dismissedStarterIds))

    if (user) {
      try {
        const payload: any = {
          updated_at: new Date().toISOString(),
        }
        if (updates.name) payload.name = updates.name.trim()
        if (updates.description !== undefined || updates.assigned_days !== undefined) {
          payload.description = encodedDesc
        }
        if (updates.assigned_days !== undefined) {
          payload.assigned_days = updates.assigned_days
        }

        await supabase.from('routines').update(payload).eq('id', routineId)

        if (updates.exercises) {
          await supabase.from('routine_exercises').delete().eq('routine_id', routineId)

          if (updates.exercises.length > 0) {
            const exercisesToInsert = updates.exercises.map((e, idx) => ({
              routine_id: routineId,
              name: e.name.trim(),
              target_sets: e.target_sets,
              target_reps: e.target_reps.trim(),
              rest_seconds: e.rest_seconds,
              notes: e.notes?.trim() || null,
              sort_order: idx,
            }))
            const { data: insertedExercises } = await supabase.from('routine_exercises').insert(exercisesToInsert).select()
            if (insertedExercises) {
              localRoutinesCache = localRoutinesCache.map((r) =>
                r.id === routineId ? { ...r, exercises: insertedExercises } : r
              )
              setRoutines([...localRoutinesCache])
              notifyRoutinesListeners()
            }
          }
        }
      } catch (err) {
        console.log('Error updating routine in DB:', err)
      }
    }

    return { error: null }
  }

  async function deleteRoutine(routineId: string) {
    if (routineId.startsWith('starter-')) {
      dismissedStarterIds.add(routineId)
    }

    localRoutinesCache = localRoutinesCache.filter((r) => r.id !== routineId)
    setRoutines([...localRoutinesCache])
    notifyRoutinesListeners()
    saveRoutinesToStorage(localRoutinesCache, Array.from(dismissedStarterIds))

    if (user && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(routineId)) {
      try {
        await supabase.from('routine_exercises').delete().eq('routine_id', routineId)
        await supabase.from('routines').update({ is_active: false }).eq('id', routineId)
        await supabase.from('routines').delete().eq('id', routineId)
      } catch (err) {
        console.log('Error deleting routine:', err)
      }
    }
    return { error: null }
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
    const routine = localRoutinesCache.find((r) => r.id === routineId)
    const currentCount = routine?.exercises?.length || 0

    const newEx: RoutineExercise = {
      id: `ex-${Date.now()}`,
      routine_id: routineId,
      created_at: new Date().toISOString(),
      name: exercise.name.trim(),
      target_sets: exercise.target_sets,
      target_reps: exercise.target_reps.trim(),
      rest_seconds: exercise.rest_seconds,
      notes: exercise.notes?.trim() || null,
      sort_order: currentCount,
    }

    localRoutinesCache = localRoutinesCache.map((r) => {
      if (r.id === routineId) {
        return { ...r, exercises: [...(r.exercises || []), newEx] }
      }
      return r
    })
    setRoutines(localRoutinesCache)
    notifyRoutinesListeners()

    if (user && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(routineId)) {
      await supabase.from('routine_exercises').insert({
        routine_id: routineId,
        name: exercise.name.trim(),
        target_sets: exercise.target_sets,
        target_reps: exercise.target_reps.trim(),
        rest_seconds: exercise.rest_seconds,
        notes: exercise.notes?.trim() || null,
        sort_order: currentCount,
      })
    }
    return { data: newEx, error: null }
  }

  async function deleteExercise(exerciseId: string) {
    localRoutinesCache = localRoutinesCache.map((r) => ({
      ...r,
      exercises: r.exercises?.filter((e) => e.id !== exerciseId) || [],
    }))
    setRoutines(localRoutinesCache)
    notifyRoutinesListeners()

    if (user && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(exerciseId)) {
      await supabase.from('routine_exercises').delete().eq('id', exerciseId)
    }
    return { error: null }
  }

  async function reorderRoutines(newOrder: Routine[]) {
    const updated = newOrder.map((r, idx) => ({ ...r, sort_order: idx }))
    localRoutinesCache = updated
    setRoutines(updated)
    notifyRoutinesListeners()
    saveRoutinesToStorage(updated, Array.from(dismissedStarterIds))

    if (user) {
      try {
        const promises = updated
          .filter((r) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(r.id))
          .map((r, idx) => supabase.from('routines').update({ sort_order: idx }).eq('id', r.id))
        await Promise.all(promises)
      } catch (err) {
        console.log('Error saving reordered routines:', err)
      }
    }
    return { error: null }
  }

  async function reorderRoutineExercises(routineId: string, newExercises: RoutineExercise[]) {
    const updatedExercises = newExercises.map((e, idx) => ({ ...e, sort_order: idx }))
    localRoutinesCache = localRoutinesCache.map((r) => {
      if (r.id === routineId) {
        return { ...r, exercises: updatedExercises }
      }
      return r
    })
    setRoutines([...localRoutinesCache])
    notifyRoutinesListeners()
    saveRoutinesToStorage(localRoutinesCache, Array.from(dismissedStarterIds))

    if (user && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(routineId)) {
      try {
        const promises = updatedExercises
          .filter((e) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(e.id))
          .map((e, idx) => supabase.from('routine_exercises').update({ sort_order: idx }).eq('id', e.id))
        await Promise.all(promises)
      } catch (err) {
        console.log('Error saving reordered routine exercises:', err)
      }
    }
    return { error: null }
  }

  return {
    routines,
    loading,
    createRoutine,
    updateRoutine,
    deleteRoutine,
    reorderRoutines,
    reorderRoutineExercises,
    addExerciseToRoutine,
    deleteExercise,
    refetch: fetchRoutines,
  }
}

export async function recordWorkoutSession(params: {
  userId?: string
  routineId?: string | null
  routineName: string
  durationMinutes: number
  totalVolumeKg: number
  recordsCount: number
  userWeightKg?: number
  exercises: {
    name: string
    muscleGroup?: string
    sets: {
      setNum: number
      weightKg: number
      reps: number
      completed: boolean
    }[]
  }[]
}) {
  const finishedAt = new Date().toISOString()
  const today = finishedAt.split('T')[0]
  const userWeight = params.userWeightKg && params.userWeightKg > 20 ? params.userWeightKg : 75
  const estimatedBurn = Math.round(
    5.0 * userWeight * (params.durationMinutes / 60) + (params.totalVolumeKg / 100) * 0.1
  )

  const summaryPayload = JSON.stringify({
    routineName: params.routineName,
    recordsCount: params.recordsCount,
    volumeKg: params.totalVolumeKg,
  })

  let sessionId = `session-${Date.now()}`

  if (params.userId) {
    try {
      const isUUID = params.routineId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(params.routineId)

      const { data: sessionData, error: sessionErr } = await supabase
        .from('workout_sessions')
        .insert({
          user_id: params.userId,
          routine_id: isUUID ? params.routineId : null,
          date: today,
          started_at: new Date(Date.now() - params.durationMinutes * 60000).toISOString(),
          finished_at: finishedAt,
          duration_minutes: params.durationMinutes,
          total_volume_kg: params.totalVolumeKg,
          estimated_calories_burned: estimatedBurn,
          ai_summary: summaryPayload,
          notes: params.routineName,
        })
        .select('id')
        .single()

      if (!sessionErr && sessionData) {
        sessionId = sessionData.id

        const setsToInsert = params.exercises.flatMap((ex) =>
          ex.sets
            .filter((s) => s.completed)
            .map((s) => ({
              session_id: sessionId,
              exercise_name: ex.name,
              set_number: s.setNum,
              weight_kg: s.weightKg,
              reps: s.reps,
              is_warmup: false,
            }))
        )

        if (setsToInsert.length > 0) {
          await supabase.from('session_sets').insert(setsToInsert)
        }
      }
    } catch (err) {
      console.log('Error saving workout session to Supabase:', err)
    }
  }

  // Create local history entry
  const localItem: UserWorkoutHistoryItem = {
    id: sessionId,
    routineId: params.routineId,
    routineName: params.routineName,
    date: today,
    dateLabel: 'Hoy',
    privacy: 'Solo tú',
    durationMinutes: params.durationMinutes,
    durationFormatted: formatDuration(params.durationMinutes),
    volumeKg: params.totalVolumeKg,
    recordsCount: params.recordsCount,
    exercises: params.exercises.map((e) => ({
      name: e.name,
      sets: e.sets.filter((s) => s.completed).length || e.sets.length,
      muscleGroup: e.muscleGroup || resolveMuscleGroup(e.name),
    })),
    detailedSets: params.exercises.flatMap((ex) =>
      ex.sets.map((s) => ({
        id: `set-${Date.now()}-${s.setNum}`,
        session_id: sessionId,
        created_at: finishedAt,
        exercise_name: ex.name,
        set_number: s.setNum,
        weight_kg: s.weightKg,
        reps: s.reps,
        is_warmup: false,
      }))
    ),
    finishedAt,
    notes: params.routineName,
  }

  addLocalWorkoutToHistory(localItem)
  return localItem
}
