import { rawExercisesList } from './exercisesData'

export interface ExerciseDefinition {
  id: string
  name: string
  nameEn?: string
  imageUrl: string
  gifUrl: string
  category: string
  equipment: string
  target: string
  muscleGroup: string
  secondaryMuscles: string[]
  instructions: {
    setup: string
    execution: string
    tips: string
    allSteps: string[]
  }
  defaultSets: number
  defaultReps: string
  defaultRestSec: number
  records: {
    maxWeight: number
    maxWeightPrev: number
    changePct: number
    period: string
    volumeSet: string
    volumeSession: string
    oneRepMax: string
  }
  history: {
    date: string
    sets: { setNum: number; weightKg: number; reps: number; isWarmup?: boolean }[]
  }[]
}

/**
 * Strips accents, lowercases and trims a string
 */
function normalizeString(str: string): string {
  return (str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Fast Levenshtein Distance for typo tolerance (Fuzzy Search)
 */
function levenshteinDistance(s1: string, s2: string): number {
  if (s1 === s2) return 0
  if (s1.length === 0) return s2.length
  if (s2.length === 0) return s1.length

  const m = s1.length
  const n = s2.length
  let prevRow = new Array(n + 1)
  let currRow = new Array(n + 1)

  for (let j = 0; j <= n; j++) prevRow[j] = j

  for (let i = 1; i <= m; i++) {
    currRow[0] = i
    const char1 = s1.charCodeAt(i - 1)
    for (let j = 1; j <= n; j++) {
      const cost = char1 === s2.charCodeAt(j - 1) ? 0 : 1
      currRow[j] = Math.min(
        prevRow[j] + 1, // deletion
        currRow[j - 1] + 1, // insertion
        prevRow[j - 1] + cost // substitution
      )
    }
    const temp = prevRow
    prevRow = currRow
    currRow = temp
  }

  return prevRow[n]
}

/**
 * Checks if a search token matches a target word (exact, prefix, or fuzzy typo)
 */
function isTokenMatch(token: string, wordsInText: string[]): boolean {
  if (!token) return true
  const tokenLen = token.length

  for (const word of wordsInText) {
    if (!word) continue
    // 1. Exact match or Prefix match
    if (word === token || word.startsWith(token) || token.startsWith(word)) {
      return true
    }

    // 2. Substring match
    if (word.includes(token)) {
      return true
    }

    // 3. Fuzzy match for typo tolerance
    if (tokenLen >= 4) {
      const maxDistance = tokenLen <= 6 ? 1 : 2
      const wordPrefix = word.slice(0, tokenLen + 1)
      if (Math.abs(tokenLen - wordPrefix.length) <= 1) {
        if (levenshteinDistance(token, wordPrefix) <= maxDistance) {
          return true
        }
      }
    }
  }

  return false
}

const rawList: readonly any[] = rawExercisesList

export const EXERCISE_DATABASE: ExerciseDefinition[] = rawList.map((item: any) => {
  const steps: string[] = Array.isArray(item.instructions) && item.instructions.length > 0
    ? item.instructions
    : ['Colócate en la posición inicial.', 'Realiza el movimiento de forma controlada.', 'Vuelve a la posición inicial.']

  return {
    id: item.id,
    name: item.name,
    nameEn: item.nameEn,
    imageUrl: item.imageUrl,
    gifUrl: item.gifUrl,
    category: item.category,
    equipment: item.equipment,
    target: item.target,
    muscleGroup: item.muscleGroup || item.target || item.category,
    secondaryMuscles: item.secondaryMuscles ? [...item.secondaryMuscles] : [],
    instructions: {
      setup: steps[0] || 'Ajusta el equipamiento y la postura inicial.',
      execution: steps.slice(1, -1).join(' ') || steps[1] || 'Ejecuta el ejercicio contrayendo el músculo objetivo.',
      tips: steps[steps.length - 1] || 'Mantén la respiración y controla el peso en todo el recorrido.',
      allSteps: steps,
    },
    defaultSets: 4,
    defaultReps: '8-12',
    defaultRestSec: 90,
    records: {
      maxWeight: 60,
      maxWeightPrev: 50,
      changePct: 15,
      period: '18 ago – 1 sep 2026',
      volumeSet: '50kg × 10',
      volumeSession: '1.500kg',
      oneRepMax: '60kg',
    },
    history: [
      {
        date: '28 ago 2026',
        sets: [
          { setNum: 1, weightKg: 50, reps: 10 },
          { setNum: 2, weightKg: 55, reps: 8 },
        ],
      },
    ],
  }
})

// Map for instant O(1) lookup
const exerciseMap = new Map<string, ExerciseDefinition>()
EXERCISE_DATABASE.forEach((ex) => {
  exerciseMap.set(ex.id, ex)
  exerciseMap.set(normalizeString(ex.name), ex)
  if (ex.nameEn) exerciseMap.set(normalizeString(ex.nameEn), ex)
})

export function getExerciseById(id: string): ExerciseDefinition | null {
  return exerciseMap.get(id) || exerciseMap.get(normalizeString(id)) || null
}

/**
 * Advanced Search Engine with strict muscle category filtering and multi-token ranking
 */
export function searchExercises(
  query: string,
  categoryFilter?: string,
  equipmentFilter?: string,
  limit = 50
): ExerciseDefinition[] {
  const normCategory = categoryFilter ? normalizeString(categoryFilter) : ''
  const normEquipment = equipmentFilter ? normalizeString(equipmentFilter) : ''

  const hasCategory = normCategory && !normCategory.includes('todos') && !normCategory.includes('todas')
  const hasEquipment = normEquipment && !normEquipment.includes('todo')

  const rawQuery = normalizeString(query)
  const tokens = rawQuery.split(/\s+/).filter(Boolean)

  const matches: { ex: ExerciseDefinition; score: number }[] = []

  for (const ex of EXERCISE_DATABASE) {
    const exCatNorm = normalizeString(ex.category)
    const exMuscleNorm = normalizeString(ex.muscleGroup)
    const exTargetNorm = normalizeString(ex.target)
    const exEquipNorm = normalizeString(ex.equipment)
    const exNameNorm = normalizeString(ex.name)
    const exNameEnNorm = ex.nameEn ? normalizeString(ex.nameEn) : ''

    // 1. Strict Muscle Category Filter
    if (hasCategory) {
      let isCatMatch = false
      if (normCategory === 'cuadriceps') {
        isCatMatch = exCatNorm === 'cuadriceps' || exMuscleNorm === 'cuadriceps' || exTargetNorm === 'cuadriceps'
      } else if (normCategory === 'gluteos') {
        isCatMatch = exCatNorm === 'gluteos' || exMuscleNorm === 'gluteos' || exTargetNorm === 'gluteos'
      } else if (normCategory === 'isquiotibiales') {
        isCatMatch = exCatNorm === 'isquiotibiales' || exMuscleNorm === 'isquiotibiales' || exTargetNorm === 'isquiotibiales'
      } else if (normCategory === 'biceps') {
        isCatMatch = exCatNorm === 'biceps' || exMuscleNorm === 'biceps' || exTargetNorm === 'biceps'
      } else if (normCategory === 'triceps') {
        isCatMatch = exCatNorm === 'triceps' || exMuscleNorm === 'triceps' || exTargetNorm === 'triceps'
      } else if (normCategory === 'pecho') {
        isCatMatch = exCatNorm === 'pecho' || exMuscleNorm === 'pecho' || exTargetNorm === 'pectorales'
      } else if (normCategory === 'espalda') {
        isCatMatch = exCatNorm === 'espalda' || exMuscleNorm === 'espalda' || exTargetNorm === 'dorsales' || exTargetNorm === 'espalda superior'
      } else if (normCategory === 'hombros') {
        isCatMatch = exCatNorm === 'hombros' || exMuscleNorm === 'hombros' || exTargetNorm === 'deltoides'
      } else if (normCategory === 'gemelos' || normCategory.includes('pantorrilla')) {
        isCatMatch = exCatNorm === 'gemelos' || exMuscleNorm === 'gemelos' || exTargetNorm === 'gemelos'
      } else if (normCategory.includes('abdomen') || normCategory.includes('core')) {
        isCatMatch = exCatNorm.includes('abdomen') || exMuscleNorm.includes('abdomen') || exTargetNorm === 'abdominales'
      } else if (normCategory === 'antebrazos') {
        isCatMatch = exCatNorm === 'antebrazos' || exMuscleNorm === 'antebrazos' || exTargetNorm === 'antebrazos'
      } else if (normCategory === 'cardio') {
        isCatMatch = exCatNorm === 'cardio' || exMuscleNorm === 'cardio' || exTargetNorm === 'cardio'
      } else {
        isCatMatch = exCatNorm === normCategory || exMuscleNorm === normCategory
      }

      if (!isCatMatch) continue
    }

    // 2. Equipment Filter
    if (hasEquipment) {
      const matchEquip =
        exEquipNorm === normEquipment ||
        exEquipNorm.includes(normEquipment) ||
        normEquipment.includes(exEquipNorm) ||
        (normEquipment.includes('smith') && exEquipNorm.includes('smith')) ||
        (normEquipment.includes('mancuerna') && exEquipNorm.includes('mancuerna')) ||
        (normEquipment.includes('barra') && exEquipNorm.includes('barra')) ||
        (normEquipment.includes('cable') && exEquipNorm.includes('cable')) ||
        (normEquipment.includes('maquina') && exEquipNorm.includes('maquina'))
      if (!matchEquip) continue
    }

    // 3. Search Query Matching
    if (tokens.length > 0) {
      const fullSearchWords = [
        ...exNameNorm.split(' '),
        ...exNameEnNorm.split(' '),
        ...exCatNorm.split(' '),
        ...exTargetNorm.split(' '),
        ...exEquipNorm.split(' '),
        ...(ex.secondaryMuscles || []).flatMap((m) => normalizeString(m).split(' ')),
      ].filter(Boolean)

      // All tokens in query must match
      const allTokensMatch = tokens.every((token) => isTokenMatch(token, fullSearchWords))
      if (!allTokensMatch) continue

      // Calculate Relevance Score
      let score = 0
      if (exNameNorm.startsWith(rawQuery)) score += 100
      if (exNameNorm.includes(rawQuery)) score += 50
      if (tokens.every((t) => exNameNorm.includes(t))) score += 30
      if (exTargetNorm.includes(tokens[0])) score += 20
      if (exCatNorm.includes(tokens[0])) score += 15

      matches.push({ ex, score })
    } else {
      matches.push({ ex, score: 0 })
    }

    if (matches.length >= limit * 3) break
  }

  // Sort by highest relevance score
  matches.sort((a, b) => b.score - a.score)

  return matches.slice(0, limit).map((m) => m.ex)
}

export const CATEGORIES_LIST = [
  'Todos los Músculos',
  'Pecho',
  'Espalda',
  'Hombros',
  'Bíceps',
  'Tríceps',
  'Cuádriceps',
  'Isquiotibiales',
  'Glúteos',
  'Gemelos',
  'Abdomen / Core',
  'Antebrazos',
  'Cardio',
]

export const EQUIPMENTS_LIST = [
  'Todo el Equipamiento',
  'Mancuerna',
  'Barra',
  'Cable / Polea',
  'Máquina',
  'Máquina Smith',
  'Peso Corporal',
  'Pesa Rusa (Kettlebell)',
  'Banda Elástica',
  'Barra Z',
]
