import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import Svg, { Circle } from 'react-native-svg'
import { typography } from '@/constants/typography'

interface MacroItemProps {
  label: string
  consumed: number
  target: number
  color: string
}

function MacroMiniRing({ label, consumed, target, color }: MacroItemProps) {
  const size = 76
  const strokeWidth = 5
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius

  const safeTarget = Math.max(1, target)
  const remaining = Math.max(0, target - consumed)
  const progress = Math.min(1, consumed / safeTarget)
  const strokeDashoffset = circumference - circumference * progress

  return (
    <View style={styles.macroCol}>
      {/* Circle Ring */}
      <View style={styles.macroSvgBox}>
        <Svg width={size} height={size}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="rgba(255, 255, 255, 0.08)"
            strokeWidth={strokeWidth}
            fill="none"
          />
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="none"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </Svg>
        <View style={styles.macroCenterText}>
          <Text style={styles.macroValueText}>{Math.round(consumed)} g</Text>
        </View>
      </View>

      <Text style={styles.macroLabelText}>{label}</Text>
      <Text style={styles.macroSubText}>{Math.round(remaining)} restante</Text>
    </View>
  )
}

interface Props {
  caloriesConsumed: number
  caloriesTarget: number
  proteinConsumed: number
  proteinTarget: number
  carbsConsumed: number
  carbsTarget: number
  fatConsumed: number
  fatTarget: number
}

export default function NutritionHeroCard({
  caloriesConsumed,
  caloriesTarget,
  proteinConsumed,
  proteinTarget,
  carbsConsumed,
  carbsTarget,
  fatConsumed,
  fatTarget,
}: Props) {
  // Calorie Gauge calculations
  const gaugeSize = 160
  const gaugeStrokeWidth = 14
  const gaugeRadius = (gaugeSize - gaugeStrokeWidth) / 2
  const gaugeCircumference = 2 * Math.PI * gaugeRadius

  const safeCalTarget = Math.max(1, caloriesTarget)
  const remainingCalories = Math.max(0, caloriesTarget - caloriesConsumed)
  const calProgress = Math.min(1, caloriesConsumed / safeCalTarget)
  const gaugeDashoffset = gaugeCircumference - gaugeCircumference * calProgress

  return (
    <View style={styles.card}>
      {/* Top Half: Large Calorie Gauge Ring */}
      <View style={styles.topSection}>
        <View style={styles.gaugeBox}>
          <Svg width={gaugeSize} height={gaugeSize}>
            {/* Background Track */}
            <Circle
              cx={gaugeSize / 2}
              cy={gaugeSize / 2}
              r={gaugeRadius}
              stroke="#27272A" // Zinc 800
              strokeWidth={gaugeStrokeWidth}
              fill="none"
            />
            {/* Active Lime Progress Arc */}
            <Circle
              cx={gaugeSize / 2}
              cy={gaugeSize / 2}
              r={gaugeRadius}
              stroke="#A3E635" // Lima / Matcha
              strokeWidth={gaugeStrokeWidth}
              strokeDasharray={gaugeCircumference}
              strokeDashoffset={gaugeDashoffset}
              strokeLinecap="round"
              fill="none"
              transform={`rotate(-90 ${gaugeSize / 2} ${gaugeSize / 2})`}
            />
          </Svg>

          {/* Center Text: Remaining kcal */}
          <View style={styles.gaugeCenterContent}>
            <Text style={styles.gaugeCaloriesNum}>
              {remainingCalories.toLocaleString('es-ES')}
            </Text>
            <Text style={styles.gaugeCaloriesSub}>kcal restantes</Text>
          </View>
        </View>
      </View>

      {/* Horizontal Divider */}
      <View style={styles.divider} />

      {/* Bottom Half: 3 Circular Macro Rings */}
      <View style={styles.macrosRow}>
        <MacroMiniRing
          label="Proteínas"
          consumed={proteinConsumed}
          target={proteinTarget}
          color="#38BDF8"
        />
        <MacroMiniRing
          label="Carbohidratos"
          consumed={carbsConsumed}
          target={carbsTarget}
          color="#F59E0B"
        />
        <MacroMiniRing
          label="Grasas"
          consumed={fatConsumed}
          target={fatTarget}
          color="#FB7185"
        />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#18181B', // Zinc 900
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#27272A', // Zinc 800
    paddingVertical: 20,
    paddingHorizontal: 16,
    gap: 16,
  },
  topSection: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  gaugeBox: {
    width: 160,
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  gaugeCenterContent: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  gaugeCaloriesNum: {
    color: '#FAFAFA',
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: -0.8,
    fontVariant: ['tabular-nums'],
  },
  gaugeCaloriesSub: {
    color: '#A1A1AA',
    fontSize: 13,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: '#27272A', // Zinc 800 divider
    marginHorizontal: 8,
  },
  macrosRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-start',
    paddingTop: 4,
  },
  macroCol: {
    alignItems: 'center',
    gap: 4,
  },
  macroSvgBox: {
    width: 76,
    height: 76,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  macroCenterText: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  macroValueText: {
    ...typography.macroValue,
  },
  macroLabelText: {
    ...typography.macroLabel,
  },
  macroSubText: {
    ...typography.captionMuted,
  },
})
