import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import Svg, { Circle } from 'react-native-svg'
import { ChevronRight } from 'lucide-react-native'
import { typography } from '@/constants/typography'

interface MacroRingProps {
  label: string
  consumed: number
  target: number
  color: string
}

function SingleMacroRing({ label, consumed, target, color }: MacroRingProps) {
  const size = 76
  const strokeWidth = 5
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius

  const safeTarget = Math.max(1, target)
  const remaining = Math.max(0, target - consumed)
  const progress = Math.min(1, consumed / safeTarget)
  const strokeDashoffset = circumference - circumference * progress

  return (
    <View style={styles.ringColumn}>
      {/* Circle SVG */}
      <View style={styles.svgBox}>
        <Svg width={size} height={size}>
          {/* Background circle track */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="rgba(255, 255, 255, 0.08)"
            strokeWidth={strokeWidth}
            fill="none"
          />
          {/* Active progress arc */}
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
        {/* Center Text: 35 g */}
        <View style={styles.centerTextBox}>
          <Text style={styles.centerValueText}>
            {Math.round(consumed)} g
          </Text>
        </View>
      </View>

      {/* Label and Remaining Text */}
      <Text style={styles.ringLabelText}>{label}</Text>
      <Text style={styles.ringSubText}>
        {Math.round(remaining)} restante
      </Text>
    </View>
  )
}

interface Props {
  calories: number
  caloriesTarget: number
  protein: number
  proteinTarget: number
  carbs: number
  carbsTarget: number
  fat: number
  fatTarget: number
  onPress?: () => void
}

export default function MacroProgressRings({
  calories,
  caloriesTarget,
  protein,
  proteinTarget,
  carbs,
  carbsTarget,
  fat,
  fatTarget,
  onPress,
}: Props) {
  const calPercent = Math.min(100, Math.max(0, (calories / Math.max(1, caloriesTarget)) * 100))

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={onPress ? 0.85 : 1}
      onPress={onPress}
      disabled={!onPress}
    >
      {/* Header: Title + Chevron */}
      <View style={styles.headerRow}>
        <Text style={styles.cardTitle}>Nutrición progreso</Text>
        {onPress && <ChevronRight size={16} color="#71717A" />}
      </View>

      {/* 3 Circular Macro Rings */}
      <View style={styles.ringsRow}>
        <SingleMacroRing
          label="Proteínas"
          consumed={protein}
          target={proteinTarget}
          color="#38BDF8" // Cyan / Sky
        />
        <SingleMacroRing
          label="Carbohidratos"
          consumed={carbs}
          target={carbsTarget}
          color="#F59E0B" // Amber Solar
        />
        <SingleMacroRing
          label="Grasas"
          consumed={fat}
          target={fatTarget}
          color="#FB7185" // Salmon / Rose
        />
      </View>

      {/* Bottom Calories Progress Bar */}
      <View style={styles.calorieSection}>
        <View style={styles.calorieHeaderRow}>
          <Text style={styles.calorieLabel}>Calorías</Text>
          <Text style={styles.calorieValue}>
            {Math.round(calories)} kcal <Text style={styles.calorieSubText}>/ día</Text>
          </Text>
        </View>

        {/* Lime Progress Bar */}
        <View style={styles.progressBarBg}>
          <View
            style={[
              styles.progressBarFill,
              { width: `${calPercent}%` },
            ]}
          />
        </View>
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#18181B', // Zinc 900
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#27272A', // Zinc 800
    gap: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTitle: {
    ...typography.cardTitle,
  },
  ringsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-start',
    paddingVertical: 2,
  },
  ringColumn: {
    alignItems: 'center',
    gap: 4,
  },
  svgBox: {
    width: 76,
    height: 76,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  centerTextBox: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerValueText: {
    ...typography.macroValue,
  },
  ringLabelText: {
    ...typography.macroLabel,
  },
  ringSubText: {
    ...typography.captionMuted,
  },
  calorieSection: {
    gap: 8,
    paddingTop: 4,
  },
  calorieHeaderRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  calorieLabel: {
    ...typography.calorieLabel,
  },
  calorieValue: {
    ...typography.calorieValue,
  },
  calorieSubText: {
    fontSize: 12,
    fontWeight: '400',
    color: '#71717A',
  },
  progressBarBg: {
    height: 6,
    backgroundColor: '#27272A', // Zinc 800
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#A3E635', // Lima eléctrico
    borderRadius: 3,
  },
})
