import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import Svg, { Path, G } from 'react-native-svg'
import {
  MALE_FRONT_PATHS,
  MALE_BACK_PATHS,
  MUSCLE_MAPPING,
} from '@/constants/muscleMapData'

interface Props {
  selectedMuscle: string | null
  onMuscleSelect: (muscle: string) => void
  width?: number
  userVolumeSets?: Record<string, { sets: number; status: 'optimal' | 'moderate' | 'low' | 'none' }>
}

// Default set volume per muscle group starts at 0 for real tracking
export const muscleVolumeSets: Record<string, { sets: number; status: 'optimal' | 'moderate' | 'low' | 'none' }> = {
  'Pecho': { sets: 0, status: 'none' },
  'Dorsales': { sets: 0, status: 'none' },
  'Hombros': { sets: 0, status: 'none' },
  'Bíceps': { sets: 0, status: 'none' },
  'Tríceps': { sets: 0, status: 'none' },
  'Cuádriceps': { sets: 0, status: 'none' },
  'Isquiotibiales': { sets: 0, status: 'none' },
  'Glúteos': { sets: 0, status: 'none' },
  'Gemelos': { sets: 0, status: 'none' },
  'Abdomen': { sets: 0, status: 'none' },
  'Trapecios': { sets: 0, status: 'none' },
  'Espalda Baja': { sets: 0, status: 'none' },
}

export default function AnatomicalBodyMap({
  selectedMuscle,
  onMuscleSelect,
  width = 340,
  userVolumeSets,
}: Props) {
  const activeVolumeMap = userVolumeSets || muscleVolumeSets
  const isSelected = (muscle: string) => selectedMuscle?.toLowerCase() === muscle.toLowerCase()
  const getFill = (muscle: string) => {
    const data = activeVolumeMap[muscle]
    if (data?.status === 'optimal') return '#38BDF8' // Óptimo: Cyan / Sky
    if (data?.status === 'moderate') return '#F59E0B' // Moderado: Ámbar
    if (data?.status === 'low') return '#71717A' // Bajo: Gris
    if (isSelected(muscle)) return '#38BDF8' // Seleccionado
    return '#27272A'
  }

  const getStroke = (muscle: string) => {
    if (isSelected(muscle)) return '#FFFFFF'
    return 'rgba(0, 0, 0, 0.4)'
  }

  const getStrokeWidth = (muscle: string) => {
    return isSelected(muscle) ? 1.5 : 0.6
  }

  const figureWidth = Math.min(width * 0.48, 165)
  const figureHeight = figureWidth * (1280 / 727)

  return (
    <View style={styles.container}>
      {/* Side by Side Dual View (Frente y Espalda simultáneamente) */}
      <View style={styles.dualViewRow}>
        {/* ══════════════════ 1. VISTA ANTERIOR (FRENTE) ══════════════════ */}
        <View style={styles.figureColumn}>
          <Text style={styles.figureLabel}>FRENTE</Text>
          <View style={[styles.svgWrapper, { width: figureWidth, height: figureHeight }]}>
            <Svg width={figureWidth} height={figureHeight} viewBox="0 95 727 1280">
              {/* Neutral Head / Base */}
              <G>
                {MALE_FRONT_PATHS.head.map((d, i) => (
                  <Path key={`f-head-${i}`} d={d} fill="#27272A" stroke="rgba(255,255,255,0.1)" strokeWidth={0.5} />
                ))}
              </G>

              {/* Trapecios */}
              <G onPress={() => onMuscleSelect('Trapecios')}>
                {MALE_FRONT_PATHS.trapezius.map((d, i) => (
                  <Path
                    key={`f-trap-${i}`}
                    d={d}
                    fill={getFill('Trapecios')}
                    stroke={getStroke('Trapecios')}
                    strokeWidth={getStrokeWidth('Trapecios')}
                  />
                ))}
              </G>

              {/* Deltoides (Hombros) */}
              <G onPress={() => onMuscleSelect('Hombros')}>
                {MALE_FRONT_PATHS.deltoids.map((d, i) => (
                  <Path
                    key={`f-delt-${i}`}
                    d={d}
                    fill={getFill('Hombros')}
                    stroke={getStroke('Hombros')}
                    strokeWidth={getStrokeWidth('Hombros')}
                  />
                ))}
              </G>

              {/* Pecho (Chest) */}
              <G onPress={() => onMuscleSelect('Pecho')}>
                {MALE_FRONT_PATHS.chest.map((d, i) => (
                  <Path
                    key={`f-chest-${i}`}
                    d={d}
                    fill={getFill('Pecho')}
                    stroke={getStroke('Pecho')}
                    strokeWidth={getStrokeWidth('Pecho')}
                  />
                ))}
              </G>

              {/* Bíceps */}
              <G onPress={() => onMuscleSelect('Bíceps')}>
                {MALE_FRONT_PATHS.biceps.map((d, i) => (
                  <Path
                    key={`f-biceps-${i}`}
                    d={d}
                    fill={getFill('Bíceps')}
                    stroke={getStroke('Bíceps')}
                    strokeWidth={getStrokeWidth('Bíceps')}
                  />
                ))}
              </G>

              {/* Tríceps */}
              <G onPress={() => onMuscleSelect('Tríceps')}>
                {MALE_FRONT_PATHS.triceps.map((d, i) => (
                  <Path
                    key={`f-tri-${i}`}
                    d={d}
                    fill={getFill('Tríceps')}
                    stroke={getStroke('Tríceps')}
                    strokeWidth={getStrokeWidth('Tríceps')}
                  />
                ))}
              </G>

              {/* Abdomen & Oblicuos */}
              <G onPress={() => onMuscleSelect('Abdomen')}>
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
              </G>

              {/* Antebrazos */}
              <G>
                {MALE_FRONT_PATHS.forearms.map((d, i) => (
                  <Path key={`f-fore-${i}`} d={d} fill="#27272A" stroke="rgba(255,255,255,0.1)" strokeWidth={0.5} />
                ))}
              </G>

              {/* Cuádriceps & Aductores */}
              <G onPress={() => onMuscleSelect('Cuádriceps')}>
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
              </G>

              {/* Gemelos & Tibiales */}
              <G onPress={() => onMuscleSelect('Gemelos')}>
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
            </Svg>
          </View>
        </View>

        {/* ══════════════════ 2. VISTA POSTERIOR (ESPALDA) ══════════════════ */}
        <View style={styles.figureColumn}>
          <Text style={styles.figureLabel}>ESPALDA</Text>
          <View style={[styles.svgWrapper, { width: figureWidth, height: figureHeight }]}>
            <Svg width={figureWidth} height={figureHeight} viewBox="718 95 727 1280">
              {/* Neutral Head / Base */}
              <G>
                {MALE_BACK_PATHS.head.map((d, i) => (
                  <Path key={`b-head-${i}`} d={d} fill="#27272A" stroke="rgba(255,255,255,0.1)" strokeWidth={0.5} />
                ))}
              </G>

              {/* Trapecios */}
              <G onPress={() => onMuscleSelect('Trapecios')}>
                {MALE_BACK_PATHS.trapezius.map((d, i) => (
                  <Path
                    key={`b-trap-${i}`}
                    d={d}
                    fill={getFill('Trapecios')}
                    stroke={getStroke('Trapecios')}
                    strokeWidth={getStrokeWidth('Trapecios')}
                  />
                ))}
              </G>

              {/* Deltoides Posterior (Hombros) */}
              <G onPress={() => onMuscleSelect('Hombros')}>
                {MALE_BACK_PATHS.deltoids.map((d, i) => (
                  <Path
                    key={`b-delt-${i}`}
                    d={d}
                    fill={getFill('Hombros')}
                    stroke={getStroke('Hombros')}
                    strokeWidth={getStrokeWidth('Hombros')}
                  />
                ))}
              </G>

              {/* Dorsales / Espalda Alta */}
              <G onPress={() => onMuscleSelect('Dorsales')}>
                {MALE_BACK_PATHS.dorsales.map((d, i) => (
                  <Path
                    key={`b-lat-${i}`}
                    d={d}
                    fill={getFill('Dorsales')}
                    stroke={getStroke('Dorsales')}
                    strokeWidth={getStrokeWidth('Dorsales')}
                  />
                ))}
              </G>

              {/* Tríceps */}
              <G onPress={() => onMuscleSelect('Tríceps')}>
                {MALE_BACK_PATHS.triceps.map((d, i) => (
                  <Path
                    key={`b-tri-${i}`}
                    d={d}
                    fill={getFill('Tríceps')}
                    stroke={getStroke('Tríceps')}
                    strokeWidth={getStrokeWidth('Tríceps')}
                  />
                ))}
              </G>

              {/* Espalda Baja / Lumbares */}
              <G onPress={() => onMuscleSelect('Espalda Baja')}>
                {MALE_BACK_PATHS.lowerBack.map((d, i) => (
                  <Path
                    key={`b-low-${i}`}
                    d={d}
                    fill={getFill('Espalda Baja')}
                    stroke={getStroke('Espalda Baja')}
                    strokeWidth={getStrokeWidth('Espalda Baja')}
                  />
                ))}
              </G>

              {/* Glúteos */}
              <G onPress={() => onMuscleSelect('Glúteos')}>
                {MALE_BACK_PATHS.gluteal.map((d, i) => (
                  <Path
                    key={`b-glut-${i}`}
                    d={d}
                    fill={getFill('Glúteos')}
                    stroke={getStroke('Glúteos')}
                    strokeWidth={getStrokeWidth('Glúteos')}
                  />
                ))}
              </G>

              {/* Isquiotibiales */}
              <G onPress={() => onMuscleSelect('Isquiotibiales')}>
                {MALE_BACK_PATHS.hamstrings.map((d, i) => (
                  <Path
                    key={`b-ham-${i}`}
                    d={d}
                    fill={getFill('Isquiotibiales')}
                    stroke={getStroke('Isquiotibiales')}
                    strokeWidth={getStrokeWidth('Isquiotibiales')}
                  />
                ))}
              </G>

              {/* Gemelos Posteriores */}
              <G onPress={() => onMuscleSelect('Gemelos')}>
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
            </Svg>
          </View>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    width: '100%',
  },
  dualViewRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 2,
  },
  figureColumn: {
    alignItems: 'center',
    gap: 6,
  },
  figureLabel: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  svgWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
})
