import React, { useMemo } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import Svg, { Path, G, Defs, LinearGradient, Stop } from 'react-native-svg'
import { getExerciseById } from '@/constants/exerciseDatabase'
import {
  MALE_FRONT_PATHS,
  MALE_BACK_PATHS,
} from '@/constants/muscleMapData'

interface Props {
  exercises?: Array<string | { name: string; target_sets?: number }>
  width?: number
  height?: number
  showBadge?: boolean
}

/**
 * Normalizes exercise names into canonical anatomical muscle groups
 */
export function getMuscleGroupsForExercises(
  exercises: Array<string | { name: string }> = []
): { activeMuscles: Set<string>; primaryView: 'front' | 'back' } {
  const active = new Set<string>()

  let frontScore = 0
  let backScore = 0

  exercises.forEach((item) => {
    const rawName = typeof item === 'string' ? item : item.name
    if (!rawName) return

    const norm = rawName.toLowerCase()
    const dbEx = getExerciseById(rawName)

    const cat = (dbEx?.category || dbEx?.muscleGroup || '').toLowerCase()
    const target = (dbEx?.target || '').toLowerCase()

    // 1. CHEST (Pecho) -> Front
    if (
      cat === 'pecho' ||
      target === 'pectorales' ||
      norm.includes('pecho') ||
      norm.includes('press banca') ||
      norm.includes('press de banca') ||
      norm.includes('press plano') ||
      norm.includes('press inclinado') ||
      norm.includes('press declinado') ||
      norm.includes('apertura') ||
      norm.includes('pec deck') ||
      norm.includes('flexiones') ||
      norm.includes('push-up') ||
      norm.includes('cruce de poleas') ||
      norm.includes('chest')
    ) {
      active.add('Pecho')
      frontScore += 3
    }

    // 2. BACK / LATS (Dorsales / Espalda) -> Back
    if (
      cat === 'espalda' ||
      target === 'dorsales' ||
      target === 'espalda superior' ||
      norm.includes('jalon') ||
      norm.includes('jalón') ||
      norm.includes('remo') ||
      norm.includes('dominada') ||
      norm.includes('pulldown') ||
      norm.includes('pull-up') ||
      norm.includes('chin-up') ||
      norm.includes('lat pulldown')
    ) {
      active.add('Dorsales')
      backScore += 3
    }

    // 3. TRAPS (Trapecios) -> Back
    if (
      target === 'trapecios' ||
      norm.includes('shrug') ||
      norm.includes('encogimiento') ||
      norm.includes('trapecio')
    ) {
      active.add('Trapecios')
      backScore += 2
    }

    // 4. LOWER BACK / SPINAL ERECTORS (Espalda Baja) -> Back
    if (
      target === 'erectores espinales' ||
      norm.includes('hiperextension') ||
      norm.includes('lumbares') ||
      norm.includes('peso muerto') ||
      norm.includes('deadlift')
    ) {
      active.add('Espalda Baja')
      backScore += 2
    }

    // 5. SHOULDERS (Hombros) -> Front & Back
    if (
      cat === 'hombros' ||
      target === 'deltoides' ||
      norm.includes('hombro') ||
      norm.includes('press militar') ||
      norm.includes('elevacion lateral') ||
      norm.includes('elevación lateral') ||
      norm.includes('elevacion frontal') ||
      norm.includes('elevación frontal') ||
      norm.includes('arnold') ||
      norm.includes('deltoide') ||
      norm.includes('pajaro') ||
      norm.includes('pájaro') ||
      norm.includes('face pull')
    ) {
      active.add('Hombros')
      frontScore += 1.5
      backScore += 1.5
    }

    // 6. BICEPS (Bíceps) -> Front
    if (
      cat === 'biceps' ||
      cat === 'bíceps' ||
      target === 'biceps' ||
      norm.includes('bicep') ||
      norm.includes('bícep') ||
      (norm.includes('curl') &&
        !norm.includes('femoral') &&
        !norm.includes('isquio') &&
        !norm.includes('muñeca') &&
        !norm.includes('nordic'))
    ) {
      active.add('Bíceps')
      frontScore += 2
    }

    // 7. TRICEPS (Tríceps) -> Back
    if (
      cat === 'triceps' ||
      cat === 'tríceps' ||
      target === 'triceps' ||
      norm.includes('tricep') ||
      norm.includes('trícep') ||
      norm.includes('frances') ||
      norm.includes('francés') ||
      norm.includes('fondos en paralelas') ||
      norm.includes('fondos') ||
      norm.includes('pushdown') ||
      norm.includes('skull crusher') ||
      norm.includes('patada de tríceps') ||
      norm.includes('extension de triceps') ||
      norm.includes('extensión de tríceps')
    ) {
      active.add('Tríceps')
      backScore += 2
    }

    // 8. QUADRICEPS (Cuádriceps) -> Front
    if (
      cat === 'cuadriceps' ||
      cat === 'cuádriceps' ||
      target === 'cuádriceps' ||
      norm.includes('cuadricep') ||
      norm.includes('cuádricep') ||
      norm.includes('sentadilla') ||
      norm.includes('squat') ||
      norm.includes('prensa') ||
      norm.includes('extension de pierna') ||
      norm.includes('extensión de pierna') ||
      norm.includes('extension de cuadriceps') ||
      norm.includes('extensión de cuádriceps') ||
      norm.includes('zancada') ||
      norm.includes('lunge') ||
      norm.includes('step-up') ||
      norm.includes('sissy')
    ) {
      active.add('Cuádriceps')
      frontScore += 3
    }

    // 9. HAMSTRINGS (Isquiotibiales) -> Back
    if (
      cat === 'isquiotibiales' ||
      target === 'isquiotibiales' ||
      norm.includes('isquio') ||
      norm.includes('femoral') ||
      norm.includes('rumano') ||
      norm.includes('rdl') ||
      norm.includes('nordic') ||
      norm.includes('buenos dias') ||
      norm.includes('buenos días') ||
      norm.includes('good morning')
    ) {
      active.add('Isquiotibiales')
      backScore += 3
    }

    // 10. GLUTES (Glúteos) -> Back
    if (
      cat === 'gluteos' ||
      cat === 'glúteos' ||
      target === 'glúteos' ||
      norm.includes('gluteo') ||
      norm.includes('glúteo') ||
      norm.includes('hip thrust') ||
      norm.includes('puente de gluteo') ||
      norm.includes('patada de gluteo') ||
      norm.includes('abduccion') ||
      norm.includes('abducción')
    ) {
      active.add('Glúteos')
      backScore += 3
    }

    // 11. CALVES (Gemelos) -> Front & Back
    if (
      cat === 'gemelos' ||
      target === 'gemelos' ||
      norm.includes('gemelo') ||
      norm.includes('talon') ||
      norm.includes('talón') ||
      norm.includes('pantorrilla') ||
      norm.includes('elevacion de talon') ||
      norm.includes('elevación de talón')
    ) {
      active.add('Gemelos')
      frontScore += 1
      backScore += 1
    }

    // 12. ABS / CORE (Abdomen) -> Front
    if (
      cat.includes('abdomen') ||
      cat.includes('core') ||
      target === 'abdominales' ||
      norm.includes('abdomen') ||
      norm.includes('abdominal') ||
      norm.includes('abs') ||
      norm.includes('crunch') ||
      norm.includes('plank') ||
      norm.includes('plancha') ||
      norm.includes('sit-up') ||
      norm.includes('elevacion de piernas') ||
      norm.includes('rueda abdominal')
    ) {
      active.add('Abdomen')
      frontScore += 2
    }

    // 13. FOREARMS (Antebrazos) -> Front
    if (
      cat === 'antebrazos' ||
      target === 'antebrazos' ||
      norm.includes('antebrazo') ||
      norm.includes('muñeca') ||
      norm.includes('paseo del granjero') ||
      norm.includes('farmer')
    ) {
      active.add('Antebrazos')
      frontScore += 1
    }
  })

  return {
    activeMuscles: active,
    primaryView: backScore > frontScore * 1.15 ? 'back' : 'front',
  }
}

export default function RoutineAnatomicalCover({
  exercises = [],
  width = 105,
  height = 150,
  showBadge = false,
}: Props) {
  const { activeMuscles, primaryView } = useMemo(() => {
    return getMuscleGroupsForExercises(exercises)
  }, [exercises])

  const isActive = (muscle: string) => activeMuscles.has(muscle)

  // Color functions: Vivid Red (#EF4444) if active in routine, dark steel (#27272A) if inactive
  const getFill = (muscle: string) => (isActive(muscle) ? 'url(#activeMuscleRed)' : '#27272A')
  const getStroke = (muscle: string) => (isActive(muscle) ? '#F87171' : 'rgba(255,255,255,0.06)')
  const getStrokeWidth = (muscle: string) => (isActive(muscle) ? 1.2 : 0.4)

  const svgHeight = showBadge ? height - 20 : height

  return (
    <View style={[styles.container, { width, height }]}>
      <Svg
        width={width}
        height={svgHeight}
        viewBox={primaryView === 'front' ? '0 95 727 1280' : '718 95 727 1280'}
      >
        <Defs>
          {/* Active Red Intensity Gradient */}
          <LinearGradient id="activeMuscleRed" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#EF4444" />
            <Stop offset="100%" stopColor="#B91C1C" />
          </LinearGradient>
        </Defs>

        {primaryView === 'front' ? (
          /* ══════════════════ VISTA FRENTE ══════════════════ */
          <G>
            {/* Neutral Head */}
            {MALE_FRONT_PATHS.head.map((d, i) => (
              <Path key={`f-h-${i}`} d={d} fill="#18181B" stroke="rgba(255,255,255,0.05)" strokeWidth={0.4} />
            ))}

            {/* Trapecios */}
            {MALE_FRONT_PATHS.trapezius.map((d, i) => (
              <Path
                key={`f-trap-${i}`}
                d={d}
                fill={getFill('Trapecios')}
                stroke={getStroke('Trapecios')}
                strokeWidth={getStrokeWidth('Trapecios')}
              />
            ))}

            {/* Hombros (Deltoides) */}
            {MALE_FRONT_PATHS.deltoids.map((d, i) => (
              <Path
                key={`f-delt-${i}`}
                d={d}
                fill={getFill('Hombros')}
                stroke={getStroke('Hombros')}
                strokeWidth={getStrokeWidth('Hombros')}
              />
            ))}

            {/* Pecho (Chest) */}
            {MALE_FRONT_PATHS.chest.map((d, i) => (
              <Path
                key={`f-chest-${i}`}
                d={d}
                fill={getFill('Pecho')}
                stroke={getStroke('Pecho')}
                strokeWidth={getStrokeWidth('Pecho')}
              />
            ))}

            {/* Bíceps */}
            {MALE_FRONT_PATHS.biceps.map((d, i) => (
              <Path
                key={`f-bic-${i}`}
                d={d}
                fill={getFill('Bíceps')}
                stroke={getStroke('Bíceps')}
                strokeWidth={getStrokeWidth('Bíceps')}
              />
            ))}

            {/* Tríceps */}
            {MALE_FRONT_PATHS.triceps.map((d, i) => (
              <Path
                key={`f-tri-${i}`}
                d={d}
                fill={getFill('Tríceps')}
                stroke={getStroke('Tríceps')}
                strokeWidth={getStrokeWidth('Tríceps')}
              />
            ))}

            {/* Abdomen & Oblicuos */}
            {MALE_FRONT_PATHS.abs.map((d, i) => (
              <Path
                key={`f-abs-${i}`}
                d={d}
                fill={getFill('Abdomen')}
                stroke={getStroke('Abdomen')}
                strokeWidth={getStrokeWidth('Abdomen')}
              />
            ))}
            {MALE_FRONT_PATHS.obliques.map((d, i) => (
              <Path
                key={`f-obl-${i}`}
                d={d}
                fill={getFill('Abdomen')}
                stroke={getStroke('Abdomen')}
                strokeWidth={getStrokeWidth('Abdomen')}
              />
            ))}

            {/* Antebrazos */}
            {MALE_FRONT_PATHS.forearms.map((d, i) => (
              <Path
                key={`f-fore-${i}`}
                d={d}
                fill={getFill('Antebrazos')}
                stroke={getStroke('Antebrazos')}
                strokeWidth={getStrokeWidth('Antebrazos')}
              />
            ))}

            {/* Cuádriceps & Aductores */}
            {MALE_FRONT_PATHS.quadriceps.map((d, i) => (
              <Path
                key={`f-quad-${i}`}
                d={d}
                fill={getFill('Cuádriceps')}
                stroke={getStroke('Cuádriceps')}
                strokeWidth={getStrokeWidth('Cuádriceps')}
              />
            ))}
            {MALE_FRONT_PATHS.adductors.map((d, i) => (
              <Path
                key={`f-add-${i}`}
                d={d}
                fill={getFill('Cuádriceps')}
                stroke={getStroke('Cuádriceps')}
                strokeWidth={getStrokeWidth('Cuádriceps')}
              />
            ))}

            {/* Gemelos */}
            {MALE_FRONT_PATHS.calves.map((d, i) => (
              <Path
                key={`f-calf-${i}`}
                d={d}
                fill={getFill('Gemelos')}
                stroke={getStroke('Gemelos')}
                strokeWidth={getStrokeWidth('Gemelos')}
              />
            ))}
          </G>
        ) : (
          /* ══════════════════ VISTA ESPALDA ══════════════════ */
          <G>
            {/* Neutral Head */}
            {MALE_BACK_PATHS.head.map((d, i) => (
              <Path key={`b-h-${i}`} d={d} fill="#18181B" stroke="rgba(255,255,255,0.05)" strokeWidth={0.4} />
            ))}

            {/* Trapecios */}
            {MALE_BACK_PATHS.trapezius.map((d, i) => (
              <Path
                key={`b-trap-${i}`}
                d={d}
                fill={getFill('Trapecios')}
                stroke={getStroke('Trapecios')}
                strokeWidth={getStrokeWidth('Trapecios')}
              />
            ))}

            {/* Hombros Posteriores */}
            {MALE_BACK_PATHS.deltoids.map((d, i) => (
              <Path
                key={`b-delt-${i}`}
                d={d}
                fill={getFill('Hombros')}
                stroke={getStroke('Hombros')}
                strokeWidth={getStrokeWidth('Hombros')}
              />
            ))}

            {/* Dorsales / Espalda Alta */}
            {MALE_BACK_PATHS.dorsales.map((d, i) => (
              <Path
                key={`b-lat-${i}`}
                d={d}
                fill={getFill('Dorsales')}
                stroke={getStroke('Dorsales')}
                strokeWidth={getStrokeWidth('Dorsales')}
              />
            ))}

            {/* Tríceps */}
            {MALE_BACK_PATHS.triceps.map((d, i) => (
              <Path
                key={`b-tri-${i}`}
                d={d}
                fill={getFill('Tríceps')}
                stroke={getStroke('Tríceps')}
                strokeWidth={getStrokeWidth('Tríceps')}
              />
            ))}

            {/* Espalda Baja / Lumbares */}
            {MALE_BACK_PATHS.lowerBack.map((d, i) => (
              <Path
                key={`b-low-${i}`}
                d={d}
                fill={getFill('Espalda Baja')}
                stroke={getStroke('Espalda Baja')}
                strokeWidth={getStrokeWidth('Espalda Baja')}
              />
            ))}

            {/* Glúteos */}
            {MALE_BACK_PATHS.gluteal.map((d, i) => (
              <Path
                key={`b-glut-${i}`}
                d={d}
                fill={getFill('Glúteos')}
                stroke={getStroke('Glúteos')}
                strokeWidth={getStrokeWidth('Glúteos')}
              />
            ))}

            {/* Isquiotibiales */}
            {MALE_BACK_PATHS.hamstrings.map((d, i) => (
              <Path
                key={`b-ham-${i}`}
                d={d}
                fill={getFill('Isquiotibiales')}
                stroke={getStroke('Isquiotibiales')}
                strokeWidth={getStrokeWidth('Isquiotibiales')}
              />
            ))}

            {/* Gemelos */}
            {MALE_BACK_PATHS.calves.map((d, i) => (
              <Path
                key={`b-calf-${i}`}
                d={d}
                fill={getFill('Gemelos')}
                stroke={getStroke('Gemelos')}
                strokeWidth={getStrokeWidth('Gemelos')}
              />
            ))}
          </G>
        )}
      </Svg>

      {/* Muscle tags badge */}
      {showBadge && activeMuscles.size > 0 && (
        <View style={styles.badgeRow}>
          {Array.from(activeMuscles)
            .slice(0, 2)
            .map((m) => (
              <View key={m} style={styles.musclePill}>
                <Text style={styles.musclePillText}>{m}</Text>
              </View>
            ))}
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 4,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  musclePill: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.35)',
  },
  musclePillText: {
    color: '#EF4444',
    fontSize: 9,
    fontWeight: '800',
  },
})
