import React from 'react'
import { View } from 'react-native'
import Svg, { Path, Circle, Defs, LinearGradient, Stop } from 'react-native-svg'

interface Props {
  data: { week: string; weight: number }[]
  height?: number
  width?: number | string
}

export default function PRChart({ data, height = 110 }: Props) {
  if (!data || data.length < 2) return null

  const min = Math.min(...data.map(d => d.weight)) * 0.95
  const max = Math.max(...data.map(d => d.weight)) * 1.02
  const range = max - min || 1
  const W = 320
  const H = height

  const pts = data.map((d, i) => ({
    x: (i / (data.length - 1)) * (W - 20) + 10,
    y: H - ((d.weight - min) / range) * (H * 0.75) - H * 0.12,
  }))

  const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')
  const areaPath = `${linePath} L ${W - 10} ${H} L 10 ${H} Z`

  return (
    <View style={{ width: '100%', height: H }}>
      <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
        <Defs>
          <LinearGradient id="prGradLine" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0%" stopColor="#EF4444" />
            <Stop offset="100%" stopColor="#3B82F6" />
          </LinearGradient>
          <LinearGradient id="prGradArea" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0%" stopColor="#EF4444" stopOpacity="0.3" />
            <Stop offset="100%" stopColor="#3B82F6" stopOpacity="0.3" />
          </LinearGradient>
        </Defs>
        <Path d={areaPath} fill="url(#prGradArea)" />
        <Path
          d={linePath}
          stroke="url(#prGradLine)"
          strokeWidth="3.5"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* First (min/start) and last (max/end) dots */}
        <Circle cx={pts[0].x} cy={pts[0].y} r="5.5" fill="#EF4444" />
        <Circle cx={pts[pts.length - 1].x} cy={pts[pts.length - 1].y} r="5.5" fill="#3B82F6" />
      </Svg>
    </View>
  )
}
