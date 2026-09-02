export interface MusclePRData {
  exercise: string
  muscleGroup: string
  maxWeight: number
  prevWeight: number
  changePct: number
  period: string
  history: { week: string; weight: number }[]
  records: { label: string; value: string }[]
}

export const muscleVolumes: Record<string, number> = {
  'Pecho': 90,
  'Hombros': 85,
  'Tríceps': 78,
  'Espalda': 88,
  'Bíceps': 72,
  'Cuádriceps': 60,
  'Isquiotibiales': 42,
  'Glúteos': 30,
  'Pantorrillas': 15,
  'Abs': 10,
}

export const musclePRData: Record<string, MusclePRData> = {
  'Pecho': {
    exercise: 'Press Banca con Barra',
    muscleGroup: 'Pecho',
    maxWeight: 90,
    prevWeight: 78,
    changePct: 15,
    period: '18 ago – 1 sep 2026',
    history: [
      { week: 'SEM 1', weight: 78 },
      { week: 'SEM 2', weight: 82.5 },
      { week: 'SEM 3', weight: 85 },
      { week: 'SEM 4', weight: 90 },
    ],
    records: [
      { label: 'Serie de volumen', value: '80kg × 7' },
      { label: 'Sesión de volumen', value: '2.240kg' },
      { label: '1 repetición máxima', value: '90kg' },
    ],
  },
  'Cuádriceps': {
    exercise: 'Sentadilla con Barra',
    muscleGroup: 'Cuádriceps',
    maxWeight: 120,
    prevWeight: 105,
    changePct: 14,
    period: '18 ago – 1 sep 2026',
    history: [
      { week: 'SEM 1', weight: 105 },
      { week: 'SEM 2', weight: 110 },
      { week: 'SEM 3', weight: 115 },
      { week: 'SEM 4', weight: 120 },
    ],
    records: [
      { label: 'Serie de volumen', value: '110kg × 5' },
      { label: 'Sesión de volumen', value: '3.100kg' },
      { label: '1 repetición máxima', value: '120kg' },
    ],
  },
  'Espalda': {
    exercise: 'Remo con Barra',
    muscleGroup: 'Espalda',
    maxWeight: 80,
    prevWeight: 70,
    changePct: 14,
    period: '18 ago – 1 sep 2026',
    history: [
      { week: 'SEM 1', weight: 70 },
      { week: 'SEM 2', weight: 72.5 },
      { week: 'SEM 3', weight: 77.5 },
      { week: 'SEM 4', weight: 80 },
    ],
    records: [
      { label: 'Serie de volumen', value: '75kg × 7' },
      { label: 'Sesión de volumen', value: '1.820kg' },
      { label: '1 repetición máxima', value: '80kg' },
    ],
  },
  'Hombros': {
    exercise: 'Press Militar con Barra',
    muscleGroup: 'Hombros',
    maxWeight: 60,
    prevWeight: 52.5,
    changePct: 14,
    period: '18 ago – 1 sep 2026',
    history: [
      { week: 'SEM 1', weight: 52.5 },
      { week: 'SEM 2', weight: 55 },
      { week: 'SEM 3', weight: 57.5 },
      { week: 'SEM 4', weight: 60 },
    ],
    records: [
      { label: 'Serie de volumen', value: '55kg × 7' },
      { label: 'Sesión de volumen', value: '980kg' },
      { label: '1 repetición máxima', value: '60kg' },
    ],
  },
  'Bíceps': {
    exercise: 'Curl con Barra EZ',
    muscleGroup: 'Bíceps',
    maxWeight: 40,
    prevWeight: 35,
    changePct: 14,
    period: '18 ago – 1 sep 2026',
    history: [
      { week: 'SEM 1', weight: 35 },
      { week: 'SEM 2', weight: 37.5 },
      { week: 'SEM 3', weight: 37.5 },
      { week: 'SEM 4', weight: 40 },
    ],
    records: [
      { label: 'Serie de volumen', value: '37.5kg × 11' },
      { label: 'Sesión de volumen', value: '1.237kg' },
      { label: '1 repetición máxima', value: '40kg' },
    ],
  },
  'Isquiotibiales': {
    exercise: 'Peso Muerto Rumano',
    muscleGroup: 'Isquiotibiales',
    maxWeight: 90,
    prevWeight: 80,
    changePct: 12,
    period: '18 ago – 1 sep 2026',
    history: [
      { week: 'SEM 1', weight: 80 },
      { week: 'SEM 2', weight: 82.5 },
      { week: 'SEM 3', weight: 85 },
      { week: 'SEM 4', weight: 90 },
    ],
    records: [
      { label: 'Serie de volumen', value: '85kg × 9' },
      { label: 'Sesión de volumen', value: '2.040kg' },
      { label: '1 repetición máxima', value: '90kg' },
    ],
  },
  'Tríceps': {
    exercise: 'Fondos en Paralelas',
    muscleGroup: 'Tríceps',
    maxWeight: 92,
    prevWeight: 82.5,
    changePct: 12,
    period: '18 ago – 1 sep 2026',
    history: [
      { week: 'SEM 1', weight: 82.5 },
      { week: 'SEM 2', weight: 85 },
      { week: 'SEM 3', weight: 87.5 },
      { week: 'SEM 4', weight: 92 },
    ],
    records: [
      { label: 'Serie de volumen', value: '87.5kg × 11' },
      { label: 'Sesión de volumen', value: '2.887kg' },
      { label: '1 repetición máxima', value: '92kg' },
    ],
  },
  'Glúteos': {
    exercise: 'Sentadilla con Barra',
    muscleGroup: 'Glúteos',
    maxWeight: 120,
    prevWeight: 110,
    changePct: 9,
    period: '18 ago – 1 sep 2026',
    history: [
      { week: 'SEM 1', weight: 110 },
      { week: 'SEM 2', weight: 112.5 },
      { week: 'SEM 3', weight: 117.5 },
      { week: 'SEM 4', weight: 120 },
    ],
    records: [
      { label: 'Serie de volumen', value: '115kg × 5' },
      { label: 'Sesión de volumen', value: '2.875kg' },
      { label: '1 repetición máxima', value: '120kg' },
    ],
  },
}

export const weightHistory = [80.5, 80.8, 81.2, 81.0, 81.5, 81.8, 81.6, 82.0, 81.8, 82.2, 82.0, 82.3, 82.5, 82.0]

export const weeklyVolume = [
  { label: 'S-4', value: 11800 },
  { label: 'S-3', value: 13200 },
  { label: 'S-2', value: 12400 },
  { label: 'Esta', value: 14350 },
]

export function getSeniorityBadge(joinDate?: string | null): {
  label: string
  color: string
  bg: string
  border: string
  icon: string
  months: number
} {
  const start = joinDate ? new Date(joinDate) : new Date()
  const now = new Date()
  const months = Math.max(0, (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth()))

  if (months < 1)   return { label: 'Novato',    color: '#9CA3AF', bg: 'rgba(156,163,175,0.1)', border: 'rgba(156,163,175,0.2)', icon: '🏅', months }
  if (months < 3)   return { label: 'Bronce',    color: '#CD7F32', bg: 'rgba(205,127,50,0.1)',  border: 'rgba(205,127,50,0.25)', icon: '🥉', months }
  if (months < 6)   return { label: 'Plata',     color: '#A8A9AD', bg: 'rgba(168,169,173,0.1)', border: 'rgba(168,169,173,0.2)', icon: '🥈', months }
  if (months < 12)  return { label: 'Oro',       color: '#F59E0B', bg: 'rgba(245,158,11,0.1)',  border: 'rgba(245,158,11,0.25)', icon: '🥇', months }
  if (months < 24)  return { label: 'Platino',   color: '#E5E7EB', bg: 'rgba(229,231,235,0.08)', border: 'rgba(229,231,235,0.2)', icon: '💎', months }
  return              { label: 'Diamante',  color: '#60A5FA', bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.3)', icon: '💠', months }
}

export interface PastWorkoutHistoryItem {
  id: string
  day: string
  dateLabel: string
  privacy: string
  duration: string
  volumeKg: number
  recordsCount: number
  exercises: {
    name: string
    sets: number
    muscleGroup: string
  }[]
}

export const mockPastWorkouts: PastWorkoutHistoryItem[] = [
  {
    id: 'pw-1',
    day: 'Martes',
    dateLabel: 'Hoy',
    privacy: 'Solo tú',
    duration: '1h 50min',
    volumeKg: 5959.5,
    recordsCount: 3,
    exercises: [
      { name: 'Curl predicador (máquina)', sets: 4, muscleGroup: 'Bíceps' },
      { name: 'Jalón al Pecho (Cable)', sets: 4, muscleGroup: 'Espalda' },
      { name: 'Curl Martillo (Mancuerna)', sets: 4, muscleGroup: 'Bíceps' },
    ],
  },
  {
    id: 'pw-2',
    day: 'Lunes',
    dateLabel: 'Ayer',
    privacy: 'Solo tú',
    duration: '1h 15min',
    volumeKg: 7820,
    recordsCount: 2,
    exercises: [
      { name: 'Press Banca con Barra', sets: 4, muscleGroup: 'Pecho' },
      { name: 'Press Inclinado Mancuernas', sets: 3, muscleGroup: 'Pecho' },
      { name: 'Elevaciones Laterales', sets: 4, muscleGroup: 'Hombros' },
      { name: 'Fondos en Paralelas', sets: 3, muscleGroup: 'Tríceps' },
    ],
  },
  {
    id: 'pw-3',
    day: 'Sábado',
    dateLabel: 'Hace 3 días',
    privacy: 'Solo tú',
    duration: '1h 30min',
    volumeKg: 10450,
    recordsCount: 1,
    exercises: [
      { name: 'Sentadilla con Barra', sets: 5, muscleGroup: 'Cuádriceps' },
      { name: 'Prensa de Piernas 45°', sets: 4, muscleGroup: 'Cuádriceps' },
      { name: 'Peso Muerto Rumano', sets: 3, muscleGroup: 'Isquiotibiales' },
      { name: 'Extensiones de Cuádriceps', sets: 3, muscleGroup: 'Cuádriceps' },
    ],
  },
]
