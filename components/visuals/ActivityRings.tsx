import React from 'react'
import { View } from 'react-native'
import Svg, { Circle, G } from 'react-native-svg'

interface Props {
  caloriesPct: number // 0 - 1
  proteinPct: number  // 0 - 1
  workoutPct: number  // 0 - 1
  size?: number
}

function RingCircle({
  radius,
  strokeWidth = 10,
  color,
  pct,
}: {
  radius: number
  strokeWidth?: number
  color: string
  pct: number
}) {
  const circ = 2 * Math.PI * radius
  const clampedPct = Math.min(Math.max(pct, 0), 1)
  const offset = circ * (1 - clampedPct)

  return (
    <>
      {/* Background ring */}
      <Circle
        cx="80"
        cy="80"
        r={radius}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeOpacity={0.15}
        fill="none"
      />
      {/* Progress ring */}
      <Circle
        cx="80"
        cy="80"
        r={radius}
        stroke={color}
        strokeWidth={strokeWidth}
        fill="none"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        strokeLinecap="round"
      />
    </>
  )
}

export default function ActivityRings({
  caloriesPct = 0,
  proteinPct = 0,
  workoutPct = 0,
  size = 160,
}: Props) {
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox="0 0 160 160">
        <G rotation="-90" origin="80, 80">
          {/* Outer ring: Calories (#3B82F6) */}
          <RingCircle radius={62} strokeWidth={11} color="#3B82F6" pct={caloriesPct} />
          {/* Middle ring: Protein (#FFFFFF) */}
          <RingCircle radius={47} strokeWidth={11} color="#FFFFFF" pct={proteinPct} />
          {/* Inner ring: Workout (#60A5FA) */}
          <RingCircle radius={32} strokeWidth={11} color="#60A5FA" pct={workoutPct} />
        </G>
      </Svg>
    </View>
  )
}
