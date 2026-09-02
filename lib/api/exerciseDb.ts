const RAPIDAPI_KEY = process.env.EXPO_PUBLIC_RAPIDAPI_KEY || '62161593abmsh34566a972c7e2cap1e8a8ejsn3eb1f55eba96'
const RAPIDAPI_HOST = 'edb-with-videos-and-images-by-ascendapi.p.rapidapi.com'
const BASE_URL = `https://${RAPIDAPI_HOST}/api/v1`

export interface ApiExercise {
  exerciseId: string
  name: string
  imageUrl?: string
  imageUrls?: {
    '360p'?: string
    '480p'?: string
    '720p'?: string
    '1080p'?: string
  }
  videoUrl?: string
  equipments?: string[]
  bodyParts?: string[]
  gender?: string
  exerciseType?: string
  targetMuscles?: string[]
  secondaryMuscles?: string[]
  keywords?: string[]
  overview?: string
  instructions?: string[]
  exerciseTips?: string[]
  variations?: string[]
  relatedExerciseIds?: string[]
}

export interface ExerciseQueryParams {
  name?: string
  bodyParts?: string
  equipments?: string
  targetMuscles?: string
  keywords?: string
  limit?: number
  cursor?: string
}

const cache = new Map<string, any>()

async function apiFetch<T>(endpoint: string): Promise<T | null> {
  if (cache.has(endpoint)) {
    return cache.get(endpoint) as T
  }

  try {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'GET',
      headers: {
        'x-rapidapi-key': RAPIDAPI_KEY,
        'x-rapidapi-host': RAPIDAPI_HOST,
        'Content-Type': 'application/json',
      },
    })

    if (!res.ok) {
      console.warn(`ExerciseDB API Error [${res.status}]: ${res.statusText}`)
      return null
    }

    const json = await res.json()
    const result = json.data !== undefined ? json.data : json
    cache.set(endpoint, result)
    return result as T
  } catch (error) {
    console.error('Error connecting to ExerciseDB API:', error)
    return null
  }
}

/**
 * Filter exercises with query parameters (name, bodyParts, equipments, keywords)
 */
export async function fetchExercises(params: ExerciseQueryParams = {}): Promise<ApiExercise[]> {
  const queryParts: string[] = []
  
  if (params.name) queryParts.push(`name=${encodeURIComponent(params.name)}`)
  if (params.bodyParts) queryParts.push(`bodyParts=${encodeURIComponent(params.bodyParts)}`)
  if (params.equipments) queryParts.push(`equipments=${encodeURIComponent(params.equipments)}`)
  if (params.targetMuscles) queryParts.push(`targetMuscles=${encodeURIComponent(params.targetMuscles)}`)
  if (params.keywords) queryParts.push(`keywords=${encodeURIComponent(params.keywords)}`)
  if (params.cursor) queryParts.push(`cursor=${encodeURIComponent(params.cursor)}`)
  queryParts.push(`limit=${params.limit || 50}`)

  const endpoint = `/exercises?${queryParts.join('&')}`
  const data = await apiFetch<any>(endpoint)
  if (!data) return []
  return Array.isArray(data) ? data : data.data || []
}

/**
 * Fast search by keyword or name
 */
export async function searchExercises(search: string, limit = 30): Promise<ApiExercise[]> {
  if (!search.trim()) return fetchExercises({ limit })
  const endpoint = `/exercises/search?search=${encodeURIComponent(search)}&limit=${limit}`
  const data = await apiFetch<any>(endpoint)
  if (!data) return []
  return Array.isArray(data) ? data : data.data || []
}

/**
 * Fetch full exercise details (including 1080p images & videoUrl) by ID
 */
export async function fetchExerciseById(exerciseId: string): Promise<ApiExercise | null> {
  const data = await apiFetch<any>(`/exercises/${exerciseId}`)
  if (!data) return null
  return data
}

/**
 * Translations Spanish <-> API filters
 */
export const MUSCLE_TRANSLATIONS: Record<string, string> = {
  'Pecho': 'CHEST',
  'Espalda': 'BACK',
  'Hombros': 'SHOULDERS',
  'Bíceps': 'UPPER ARMS',
  'Tríceps': 'UPPER ARMS',
  'Cuádriceps': 'UPPER LEGS',
  'Isquiotibiales': 'UPPER LEGS',
  'Glúteos': 'HIPS',
  'Gemelos': 'LOWER LEGS',
  'Abdomen': 'WAIST',
}

export const EQUIPMENT_TRANSLATIONS: Record<string, string> = {
  'Mancuerna': 'DUMBBELL',
  'Barra': 'BARBELL',
  'Cable': 'CABLE',
  'Máquina': 'LEVERAGE MACHINE',
  'Peso Corporal': 'BODY WEIGHT',
}

/**
 * Resolves best available image URL (1080p / 720p / imageUrl)
 */
export function getExerciseImageUrl(ex?: Partial<ApiExercise> | string): string {
  if (!ex) {
    return 'https://cdn.exercisedb.dev/media/w/images/A8OLBqBa26.jpg'
  }
  if (typeof ex === 'string') {
    if (ex.startsWith('http://') || ex.startsWith('https://')) return ex
    return `https://cdn.exercisedb.dev/media/w/images/${ex}`
  }
  if (ex.imageUrls?.['1080p']) return ex.imageUrls['1080p']
  if (ex.imageUrls?.['720p']) return ex.imageUrls['720p']
  if (ex.imageUrls?.['480p']) return ex.imageUrls['480p']
  if (ex.imageUrl) return ex.imageUrl
  return 'https://cdn.exercisedb.dev/media/w/images/A8OLBqBa26.jpg'
}
