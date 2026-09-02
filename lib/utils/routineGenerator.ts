import { ExperienceLevel, Goal } from '@/types'

export interface GeneratedExercise {
  name: string
  target_sets: number
  target_reps: string
  rest_seconds: number
  notes?: string
}

export interface GeneratedRoutine {
  name: string
  description: string
  target: string
  duration: string
  assigned_days: string[]
  exercises: GeneratedExercise[]
}

export function generateRoutinesForUser(params: {
  level: ExperienceLevel
  goal: Goal
  daysPerWeek: number
}): GeneratedRoutine[] {
  const { level, goal, daysPerWeek } = params

  // Adjust sets and reps based on goal
  const isHypertrophy = goal === 'muscle_gain'
  const isFatLoss = goal === 'fat_loss'
  const isRecomp = goal === 'recomp'

  // Rep ranges and rest parameters
  const compoundReps = isHypertrophy ? '6-8' : isFatLoss ? '10-12' : isRecomp ? '8-10' : '8-10'
  const isolationReps = isHypertrophy ? '10-12' : isFatLoss ? '12-15' : '10-12'
  const compoundRest = isHypertrophy ? 120 : isFatLoss ? 75 : 90
  const isolationRest = isHypertrophy ? 90 : isFatLoss ? 60 : 60

  // Sets according to experience level
  const baseSets = level === 'beginner' ? 3 : level === 'intermediate' ? 4 : 4
  const lightSets = level === 'beginner' ? 2 : 3

  // ==========================================
  // 1. PRINCIPIANTE (3 o 4 Días)
  // ==========================================
  if (level === 'beginner') {
    if (daysPerWeek === 4) {
      return [
        {
          name: 'Torso A - Fuerza & Base',
          description: 'Enfoque en pecho, espalda y hombros con técnica controlada.',
          target: 'torso',
          duration: '45 min',
          assigned_days: ['Lunes'],
          exercises: [
            { name: 'Press de Banca Plano con Barra', target_sets: baseSets, target_reps: compoundReps, rest_seconds: compoundRest, notes: 'Controla la bajada en 2 segundos' },
            { name: 'Jalón al Pecho en Polea', target_sets: baseSets, target_reps: isolationReps, rest_seconds: isolationRest, notes: 'Tracciona con los dorsales' },
            { name: 'Press Militar con Mancuernas', target_sets: baseSets, target_reps: isolationReps, rest_seconds: isolationRest, notes: 'Espalda recta, sin arquear' },
            { name: 'Remo con Mancuerna a 1 Mano', target_sets: baseSets, target_reps: isolationReps, rest_seconds: isolationRest, notes: 'Apoya rodilla en banco plano' },
            { name: 'Extensiones de Tríceps en Polea', target_sets: lightSets, target_reps: isolationReps, rest_seconds: isolationRest, notes: 'Codos pegados al cuerpo' },
            { name: 'Curl de Bíceps con Mancuernas', target_sets: lightSets, target_reps: isolationReps, rest_seconds: isolationRest, notes: 'Sin balanceo del torso' },
          ],
        },
        {
          name: 'Pierna A - Cuádriceps & Glúteo',
          description: 'Desarrollo de tren inferior y estabilidad articular.',
          target: 'pierna',
          duration: '45 min',
          assigned_days: ['Martes'],
          exercises: [
            { name: 'Sentadilla Goblet con Mancuerna', target_sets: baseSets, target_reps: compoundReps, rest_seconds: compoundRest, notes: 'Profundidad paralela y pecho erguido' },
            { name: 'Prensa de Piernas 45°', target_sets: baseSets, target_reps: isolationReps, rest_seconds: isolationRest, notes: 'Pies al ancho de hombros' },
            { name: 'Extensión de Cuádriceps', target_sets: baseSets, target_reps: isolationReps, rest_seconds: isolationRest, notes: 'Pausa de 1 segundo arriba' },
            { name: 'Curl Femoral Tumbado', target_sets: baseSets, target_reps: isolationReps, rest_seconds: isolationRest, notes: 'Contracción en isquiotibiales' },
            { name: 'Elevación de Talones de Pie', target_sets: baseSets, target_reps: '15-20', rest_seconds: 45, notes: 'Rango de movimiento completo' },
          ],
        },
        {
          name: 'Torso B - Densidad & Brazos',
          description: 'Estimulación de espalda alta, pectoral superior y hombros.',
          target: 'torso',
          duration: '45 min',
          assigned_days: ['Jueves'],
          exercises: [
            { name: 'Press Inclinado con Mancuernas', target_sets: baseSets, target_reps: compoundReps, rest_seconds: compoundRest, notes: 'Banco a 30 grados' },
            { name: 'Remo en Polea Baja (Gironda)', target_sets: baseSets, target_reps: isolationReps, rest_seconds: isolationRest, notes: 'Lleva el agarre al ombligo' },
            { name: 'Elevaciones Laterales con Mancuernas', target_sets: baseSets, target_reps: '12-15', rest_seconds: 60, notes: 'Codos ligeramente flexionados' },
            { name: 'Aperturas en Máquina (Pec Deck)', target_sets: lightSets, target_reps: isolationReps, rest_seconds: 60, notes: 'Apertura controlada' },
            { name: 'Curl Martillo con Mancuernas', target_sets: lightSets, target_reps: isolationReps, rest_seconds: 60, notes: 'Foco en braquial y antebrazo' },
            { name: 'Fondos en Banco para Tríceps', target_sets: lightSets, target_reps: '10-12', rest_seconds: 60, notes: 'Espalda cerca del banco' },
          ],
        },
        {
          name: 'Pierna B - Isquios & Cadena Posterior',
          description: 'Fortalecimiento de isquiosurales, glúteos y core.',
          target: 'pierna',
          duration: '45 min',
          assigned_days: ['Viernes'],
          exercises: [
            { name: 'Peso Muerto Rumano con Mancuernas', target_sets: baseSets, target_reps: compoundReps, rest_seconds: compoundRest, notes: 'Empuja la cadera hacia atrás' },
            { name: 'Zancadas Dinámicas (Lunges)', target_sets: baseSets, target_reps: '10 por pierna', rest_seconds: isolationRest, notes: 'Paso largo, torso vertical' },
            { name: 'Prensa de Piernas (Pies Altos)', target_sets: baseSets, target_reps: isolationReps, rest_seconds: isolationRest, notes: 'Enfoque glúteo e isquios' },
            { name: 'Plancha Abdominal Estática', target_sets: 3, target_reps: '30-45 seg', rest_seconds: 45, notes: 'Activa glúteos y abdomen' },
            { name: 'Elevación de Gemelos en Prensa', target_sets: baseSets, target_reps: '15-20', rest_seconds: 45, notes: 'Estiramiento profundo abajo' },
          ],
        },
      ]
    }

    // Default Principiante: 3 días Full Body (A, B, C)
    return [
      {
        name: 'Full Body A - Fuerza Base',
        description: 'Rutina completa de cuerpo entero enfocada en movimientos fundamentales.',
        target: 'fullbody',
        duration: '45 min',
        assigned_days: ['Lunes'],
        exercises: [
          { name: 'Sentadilla Goblet con Mancuerna', target_sets: baseSets, target_reps: compoundReps, rest_seconds: compoundRest, notes: 'Pecho alto y espalda neutra' },
          { name: 'Press de Banca Plano con Barra', target_sets: baseSets, target_reps: compoundReps, rest_seconds: compoundRest, notes: 'Baja al pecho medio con control' },
          { name: 'Jalón al Pecho en Polea', target_sets: baseSets, target_reps: isolationReps, rest_seconds: isolationRest, notes: 'Retrae escápulas al inicio' },
          { name: 'Press Militar con Mancuernas', target_sets: baseSets, target_reps: isolationReps, rest_seconds: isolationRest, notes: 'Eleva sobre la cabeza sin arquear' },
          { name: 'Curl de Bíceps con Mancuernas', target_sets: lightSets, target_reps: isolationReps, rest_seconds: 60, notes: 'Supinación al subir' },
        ],
      },
      {
        name: 'Full Body B - Tracción & Estabilidad',
        description: 'Cadena posterior, espalda, pecho inclinado y core.',
        target: 'fullbody',
        duration: '45 min',
        assigned_days: ['Miércoles'],
        exercises: [
          { name: 'Peso Muerto Rumano con Mancuernas', target_sets: baseSets, target_reps: compoundReps, rest_seconds: compoundRest, notes: 'Siente la tensión en isquiotibiales' },
          { name: 'Remo con Mancuerna a 1 Mano', target_sets: baseSets, target_reps: isolationReps, rest_seconds: isolationRest, notes: 'Codo hacia la cadera' },
          { name: 'Press Inclinado con Mancuernas', target_sets: baseSets, target_reps: compoundReps, rest_seconds: compoundRest, notes: 'Banco inclinado a 30°' },
          { name: 'Prensa de Piernas 45°', target_sets: baseSets, target_reps: isolationReps, rest_seconds: isolationRest, notes: 'Sin despegar los lumbares' },
          { name: 'Extensiones de Tríceps en Polea', target_sets: lightSets, target_reps: isolationReps, rest_seconds: 60, notes: 'Bloquea el codo abajo' },
        ],
      },
      {
        name: 'Full Body C - Hipertrofia Global',
        description: 'Volumen equilibrado de piernas, deltoides, brazos y espalda.',
        target: 'fullbody',
        duration: '45 min',
        assigned_days: ['Viernes'],
        exercises: [
          { name: 'Prensa de Piernas 45°', target_sets: baseSets, target_reps: isolationReps, rest_seconds: isolationRest, notes: 'Empuja con talones' },
          { name: 'Remo en Polea Baja (Gironda)', target_sets: baseSets, target_reps: isolationReps, rest_seconds: isolationRest, notes: 'Espalda recta, pecho fuera' },
          { name: 'Aperturas en Máquina (Pec Deck)', target_sets: baseSets, target_reps: isolationReps, rest_seconds: isolationRest, notes: 'Aprieta 1 segundo al centro' },
          { name: 'Elevaciones Laterales con Mancuernas', target_sets: baseSets, target_reps: '12-15', rest_seconds: 60, notes: 'No impulses con la espalda' },
          { name: 'Plancha Abdominal Estática', target_sets: 3, target_reps: '30-45 seg', rest_seconds: 45, notes: 'Tensión constante en abdomen' },
        ],
      },
    ]
  }

  // ==========================================
  // 2. INTERMEDIO (4 o 5 Días)
  // ==========================================
  if (level === 'intermediate') {
    if (daysPerWeek === 5) {
      // Split Push / Pull / Legs / Torso / Pierna
      return [
        {
          name: 'Empuje (Push) - Pecho & Deltoides',
          description: 'Pectoral mayor, deltoides anterior/lateral y tríceps.',
          target: 'pecho',
          duration: '55 min',
          assigned_days: ['Lunes'],
          exercises: [
            { name: 'Press de Banca Plano con Barra', target_sets: baseSets, target_reps: compoundReps, rest_seconds: compoundRest, notes: 'Técnica estricta con arco natural' },
            { name: 'Press Inclinado con Mancuernas', target_sets: baseSets, target_reps: isolationReps, rest_seconds: isolationRest, notes: 'Banco a 30 grados' },
            { name: 'Press Militar de Pie con Barra', target_sets: 3, target_reps: compoundReps, rest_seconds: compoundRest, notes: 'Core activo' },
            { name: 'Elevaciones Laterales con Mancuernas', target_sets: 4, target_reps: '12-15', rest_seconds: 60, notes: 'Enfoque en deltoides lateral' },
            { name: 'Fondos en Paralelas', target_sets: 3, target_reps: '8-10', rest_seconds: 90, notes: 'Inclinación leve al frente' },
            { name: 'Extensiones de Tríceps con Cuerda', target_sets: 3, target_reps: '12-15', rest_seconds: 60, notes: 'Separa la cuerda al final' },
          ],
        },
        {
          name: 'Tracción (Pull) - Espalda & Bíceps',
          description: 'Dorsal ancho, trapecios, deltoides posterior y bíceps.',
          target: 'espalda',
          duration: '55 min',
          assigned_days: ['Martes'],
          exercises: [
            { name: 'Dominadas o Jalón al Pecho', target_sets: baseSets, target_reps: compoundReps, rest_seconds: compoundRest, notes: 'Agarre pronado medio' },
            { name: 'Remo con Barra 90°', target_sets: baseSets, target_reps: compoundReps, rest_seconds: compoundRest, notes: 'Tira hacia el abdomen bajo' },
            { name: 'Remo en Polea Baja a 1 Mano', target_sets: 3, target_reps: isolationReps, rest_seconds: isolationRest, notes: 'Estiramiento completo al frente' },
            { name: 'Face Pull con Cuerda', target_sets: 4, target_reps: '15-20', rest_seconds: 60, notes: 'Salud articular y deltoides posterior' },
            { name: 'Curl de Bíceps con Barra EZ', target_sets: 3, target_reps: isolationReps, rest_seconds: 60, notes: 'Codos fijos' },
            { name: 'Curl Martillo en Banco Inclinado', target_sets: 3, target_reps: isolationReps, rest_seconds: 60, notes: 'Braquial anterior' },
          ],
        },
        {
          name: 'Pierna (Legs) - Cuádriceps & Gemelo',
          description: 'Sentadillas pesadas, prensa y desarrollo de tren inferior.',
          target: 'pierna',
          duration: '60 min',
          assigned_days: ['Miércoles'],
          exercises: [
            { name: 'Sentadilla con Barra Trasera', target_sets: baseSets, target_reps: compoundReps, rest_seconds: compoundRest, notes: 'Profundidad paralela' },
            { name: 'Prensa de Piernas 45°', target_sets: baseSets, target_reps: isolationReps, rest_seconds: isolationRest, notes: 'Pies en base media' },
            { name: 'Extensión de Cuádriceps', target_sets: 3, target_reps: '12-15', rest_seconds: 60, notes: '1s contracción isométrica' },
            { name: 'Curl Femoral Tumbado', target_sets: 4, target_reps: isolationReps, rest_seconds: isolationRest, notes: 'Isquiotibiales' },
            { name: 'Elevación de Talones de Pie', target_sets: 4, target_reps: '15-20', rest_seconds: 45, notes: 'Gemelos' },
          ],
        },
        {
          name: 'Torso Hipertrofia',
          description: 'Enfoque metabólico y vascularización de tren superior.',
          target: 'torso',
          duration: '50 min',
          assigned_days: ['Viernes'],
          exercises: [
            { name: 'Press en Máquina Inclinado', target_sets: baseSets, target_reps: isolationReps, rest_seconds: isolationRest, notes: 'Tensión constante' },
            { name: 'Jalón Neutro con Agarre Cerrado', target_sets: baseSets, target_reps: isolationReps, rest_seconds: isolationRest, notes: 'Dorsal bajo' },
            { name: 'Aperturas en Poleas (Cruces)', target_sets: 3, target_reps: '12-15', rest_seconds: 60, notes: 'Pectoral aislado' },
            { name: 'Elevaciones Laterales en Polea', target_sets: 4, target_reps: '12-15', rest_seconds: 45, notes: 'Tensión continua en deltoides' },
            { name: 'Curl Scott / Predicador', target_sets: 3, target_reps: '10-12', rest_seconds: 60, notes: 'Pico del bíceps' },
            { name: 'Press Francés con Mancuernas', target_sets: 3, target_reps: '10-12', rest_seconds: 60, notes: 'Cabeza larga del tríceps' },
          ],
        },
        {
          name: 'Pierna Cadena Posterior & Core',
          description: 'Peso muerto rumano, glúteos e isquiosurales.',
          target: 'pierna',
          duration: '50 min',
          assigned_days: ['Sábado'],
          exercises: [
            { name: 'Peso Muerto Rumano con Barra', target_sets: baseSets, target_reps: compoundReps, rest_seconds: compoundRest, notes: 'Espalda completamente neutra' },
            { name: 'Hip Thrust con Barra', target_sets: baseSets, target_reps: isolationReps, rest_seconds: compoundRest, notes: 'Bloqueo arriba de 1 segundo' },
            { name: 'Zancadas Búlgaras con Mancuernas', target_sets: 3, target_reps: '8-10 por pierna', rest_seconds: isolationRest, notes: 'Equilibrio y fuerza unilateral' },
            { name: 'Curl Femoral Sentado', target_sets: 3, target_reps: '12-15', rest_seconds: 60, notes: 'Estiramiento de isquios' },
            { name: 'Elevación de Piernas Colgado', target_sets: 3, target_reps: '12-15', rest_seconds: 45, notes: 'Abdomen inferior' },
          ],
        },
      ]
    }

    // Default Intermedio: 4 días Torso / Pierna (A y B)
    return [
      {
        name: 'Torso A - Fuerza & Densidad',
        description: 'Press plano pesado, remo con barra y deltoides.',
        target: 'torso',
        duration: '50 min',
        assigned_days: ['Lunes'],
        exercises: [
          { name: 'Press de Banca Plano con Barra', target_sets: baseSets, target_reps: compoundReps, rest_seconds: compoundRest, notes: 'Sobrecarga progresiva principal' },
          { name: 'Remo con Barra 90°', target_sets: baseSets, target_reps: compoundReps, rest_seconds: compoundRest, notes: 'Espalda densa' },
          { name: 'Press Militar con Mancuernas', target_sets: baseSets, target_reps: isolationReps, rest_seconds: isolationRest, notes: 'Fuerza de empuje vertical' },
          { name: 'Jalón al Pecho en Polea', target_sets: baseSets, target_reps: isolationReps, rest_seconds: isolationRest, notes: 'Amplitud dorsal' },
          { name: 'Curl con Barra EZ', target_sets: 3, target_reps: isolationReps, rest_seconds: 60, notes: 'Bíceps' },
          { name: 'Extensiones de Tríceps en Polea', target_sets: 3, target_reps: isolationReps, rest_seconds: 60, notes: 'Tríceps' },
        ],
      },
      {
        name: 'Pierna A - Enfoque Cuádriceps',
        description: 'Sentadilla pesada, prensa y gemelo.',
        target: 'pierna',
        duration: '50 min',
        assigned_days: ['Martes'],
        exercises: [
          { name: 'Sentadilla con Barra Trasera', target_sets: baseSets, target_reps: compoundReps, rest_seconds: compoundRest, notes: 'Profundidad adecuada' },
          { name: 'Prensa de Piernas 45°', target_sets: baseSets, target_reps: isolationReps, rest_seconds: isolationRest, notes: 'Pies centrados' },
          { name: 'Extensión de Cuádriceps', target_sets: 3, target_reps: '12-15', rest_seconds: 60, notes: 'Isometría arriba' },
          { name: 'Curl Femoral Tumbado', target_sets: 4, target_reps: isolationReps, rest_seconds: isolationRest, notes: 'Isquios' },
          { name: 'Elevación de Talones de Pie', target_sets: 4, target_reps: '15-20', rest_seconds: 45, notes: 'Gemelo' },
        ],
      },
      {
        name: 'Torso B - Hipertrofia & Brazos',
        description: 'Press inclinado, aperturas, remos y deltoides lateral.',
        target: 'torso',
        duration: '50 min',
        assigned_days: ['Jueves'],
        exercises: [
          { name: 'Press Inclinado con Mancuernas', target_sets: baseSets, target_reps: isolationReps, rest_seconds: isolationRest, notes: 'Pectoral clavicular' },
          { name: 'Remo en Polea Baja (Gironda)', target_sets: baseSets, target_reps: isolationReps, rest_seconds: isolationRest, notes: 'Tracción horizontal' },
          { name: 'Elevaciones Laterales con Mancuernas', target_sets: 4, target_reps: '12-15', rest_seconds: 60, notes: 'Hombro 3D' },
          { name: 'Cruces en Poleas para Pecho', target_sets: 3, target_reps: '12-15', rest_seconds: 60, notes: 'Bombeo pectoral' },
          { name: 'Curl Martillo con Mancuernas', target_sets: 3, target_reps: isolationReps, rest_seconds: 60, notes: 'Braquial' },
          { name: 'Fondos en Paralelas', target_sets: 3, target_reps: '8-10', rest_seconds: 90, notes: 'Tríceps y pecho' },
        ],
      },
      {
        name: 'Pierna B - Cadena Posterior & Core',
        description: 'Peso muerto rumano, zancadas y glúteos.',
        target: 'pierna',
        duration: '50 min',
        assigned_days: ['Viernes'],
        exercises: [
          { name: 'Peso Muerto Rumano con Barra', target_sets: baseSets, target_reps: compoundReps, rest_seconds: compoundRest, notes: 'Isquiotibiales' },
          { name: 'Zancadas Búlgaras con Mancuernas', target_sets: 3, target_reps: '8-10 por pierna', rest_seconds: isolationRest, notes: 'Glúteos y cuádriceps' },
          { name: 'Hip Thrust con Barra', target_sets: baseSets, target_reps: isolationReps, rest_seconds: compoundRest, notes: 'Potencia de glúteo' },
          { name: 'Curl Femoral Sentado', target_sets: 3, target_reps: '12-15', rest_seconds: 60, notes: 'Aislamiento isquios' },
          { name: 'Plancha Abdominal con Peso', target_sets: 3, target_reps: '45-60 seg', rest_seconds: 45, notes: 'Core sólido' },
        ],
      },
    ]
  }

  // ==========================================
  // 3. AVANZADO (5 Días Push / Pull / Legs / Upper / Lower)
  // ==========================================
  return [
    {
      name: 'Push Avanzado - Pecho & Deltoides',
      description: 'Alto volumen e intensidad en pectoral y hombro anterior/lateral.',
      target: 'pecho',
      duration: '60 min',
      assigned_days: ['Lunes'],
      exercises: [
        { name: 'Press de Banca Plano con Barra', target_sets: 4, target_reps: '5-8', rest_seconds: 150, notes: 'Pesado RPE 8-9' },
        { name: 'Press Inclinado con Mancuernas', target_sets: 4, target_reps: '8-10', rest_seconds: 90, notes: 'Enfoque pectoral superior' },
        { name: 'Press Militar de Pie con Barra', target_sets: 3, target_reps: '6-8', rest_seconds: 120, notes: 'Estabilidad de hombro' },
        { name: 'Elevaciones Laterales en Polea', target_sets: 4, target_reps: '12-15', rest_seconds: 45, notes: 'Tensión constante' },
        { name: 'Aperturas en Poleas Inclinadas', target_sets: 3, target_reps: '12-15', rest_seconds: 60, notes: 'Aislamiento y congestión' },
        { name: 'Press Francés con Mancuernas', target_sets: 4, target_reps: '10-12', rest_seconds: 60, notes: 'Cabeza larga tríceps' },
      ],
    },
    {
      name: 'Pull Avanzado - Dorsal & Trapecio',
      description: 'Cargas altas en jalones y remos con control escapular estricto.',
      target: 'espalda',
      duration: '60 min',
      assigned_days: ['Martes'],
      exercises: [
        { name: 'Dominadas con Lastre', target_sets: 4, target_reps: '6-8', rest_seconds: 120, notes: 'O Jalón al Pecho pesado' },
        { name: 'Remo Pendlay / Remo con Barra', target_sets: 4, target_reps: '6-8', rest_seconds: 120, notes: 'Desde el suelo o paralelas' },
        { name: 'Remo con Mancuerna a 1 Mano', target_sets: 3, target_reps: '10-12', rest_seconds: 75, notes: 'Máximo rango de recorrido' },
        { name: 'Face Pull con Cuerda', target_sets: 4, target_reps: '15-20', rest_seconds: 45, notes: 'Rotación externa' },
        { name: 'Curl con Barra EZ de Pie', target_sets: 4, target_reps: '8-10', rest_seconds: 60, notes: 'Bíceps estricto' },
        { name: 'Curl Martillo en Polea con Cuerda', target_sets: 3, target_reps: '12-15', rest_seconds: 60, notes: 'Braquial' },
      ],
    },
    {
      name: 'Legs Avanzado - Cuádriceps & Gemelos',
      description: 'Sentadilla pesada, zancadas y volumen de cuádriceps.',
      target: 'pierna',
      duration: '65 min',
      assigned_days: ['Miércoles'],
      exercises: [
        { name: 'Sentadilla con Barra Trasera', target_sets: 4, target_reps: '5-8', rest_seconds: 150, notes: 'Piedra angular de pierna' },
        { name: 'Prensa de Piernas 45°', target_sets: 4, target_reps: '10-12', rest_seconds: 90, notes: 'Descenso profundo controlado' },
        { name: 'Zancadas Búlgaras con Mancuernas', target_sets: 3, target_reps: '8-10 por pierna', rest_seconds: 90, notes: 'Fuerza unilateral' },
        { name: 'Extensión de Cuádriceps', target_sets: 4, target_reps: '12-15', rest_seconds: 45, notes: 'Drop set en última serie' },
        { name: 'Elevación de Talones en Prensa', target_sets: 4, target_reps: '15-20', rest_seconds: 45, notes: 'Gemelo completo' },
      ],
    },
    {
      name: 'Upper Avanzado - Densidad Torso & Brazos',
      description: 'Combinación balanceada de tracciones y empujes para máxima hipertrofia.',
      target: 'torso',
      duration: '55 min',
      assigned_days: ['Viernes'],
      exercises: [
        { name: 'Press Inclinado con Mancuernas', target_sets: 4, target_reps: '8-10', rest_seconds: 90, notes: 'Pectoral superior' },
        { name: 'Remo en Polea Baja (Gironda)', target_sets: 4, target_reps: '10-12', rest_seconds: 75, notes: 'Dorsal medio' },
        { name: 'Fondos en Paralelas con Lastre', target_sets: 3, target_reps: '8-10', rest_seconds: 90, notes: 'Pecho y tríceps' },
        { name: 'Elevaciones Laterales con Mancuernas', target_sets: 4, target_reps: '12-15', rest_seconds: 45, notes: 'Superserie con Face Pull' },
        { name: 'Curl Scott en Banco Predicador', target_sets: 3, target_reps: '10-12', rest_seconds: 60, notes: 'Aislamiento bíceps' },
        { name: 'Extensiones de Tríceps con Cuerda', target_sets: 3, target_reps: '12-15', rest_seconds: 45, notes: 'Bombeo final' },
      ],
    },
    {
      name: 'Lower Avanzado - Isquios & Glúteos',
      description: 'Peso muerto rumano pesado, hip thrust y estabilidad de core.',
      target: 'pierna',
      duration: '55 min',
      assigned_days: ['Sábado'],
      exercises: [
        { name: 'Peso Muerto Rumano con Barra', target_sets: 4, target_reps: '6-8', rest_seconds: 120, notes: 'Tensión isquios' },
        { name: 'Hip Thrust con Barra', target_sets: 4, target_reps: '8-10', rest_seconds: 90, notes: 'Pico de contracción' },
        { name: 'Curl Femoral Tumbado', target_sets: 4, target_reps: '10-12', rest_seconds: 60, notes: 'Cadena posterior' },
        { name: 'Prensa de Piernas (Pies Altos)', target_sets: 3, target_reps: '12-15', rest_seconds: 75, notes: 'Glúteos e isquios' },
        { name: 'Rueda Abdominal o Plancha', target_sets: 4, target_reps: '12-15 reps / 45s', rest_seconds: 45, notes: 'Core antiextensión' },
      ],
    },
  ]
}
