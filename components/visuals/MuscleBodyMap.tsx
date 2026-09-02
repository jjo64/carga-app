import React from 'react'
import { View, StyleSheet, TouchableOpacity } from 'react-native'
import Svg, { Ellipse, Rect, Path, G } from 'react-native-svg'
import { muscleVolumes } from '@/constants/fitnessData'

interface Props {
  selectedMuscle: string | null
  onMuscleSelect: (m: string) => void
  size?: number
}

type Intensity = 'high' | 'medium' | 'low' | 'none'

function getIntensity(muscle: string): Intensity {
  const v = muscleVolumes[muscle] ?? 0
  if (v >= 75) return 'high'
  if (v >= 50) return 'medium'
  if (v >= 20) return 'low'
  return 'none'
}

function muscleColor(muscle: string, selected: boolean): { fill: string; opacity: number } {
  if (selected) return { fill: '#60A5FA', opacity: 1 }
  const i = getIntensity(muscle)
  if (i === 'high')   return { fill: '#3B82F6', opacity: 0.92 }
  if (i === 'medium') return { fill: '#F59E0B', opacity: 0.88 }
  if (i === 'low')    return { fill: '#B45309', opacity: 0.82 }
  return { fill: '#2A2A2A', opacity: 1 }
}

export default function MuscleBodyMap({ selectedMuscle, onMuscleSelect, size = 180 }: Props) {
  const ratio = 370 / 200
  const w = size
  const h = w * ratio

  const mc = (m: string) => muscleColor(m, selectedMuscle === m)

  return (
    <View style={{ width: w, height: h, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={w} height={h} viewBox="0 0 200 370">
        {/* Base body silhouette */}
        <Ellipse cx="100" cy="28" rx="18" ry="21" fill="#1a1a1a" />
        <Rect x="93" y="46" width="14" height="12" rx="4" fill="#1a1a1a" />
        <Path d="M 68 58 Q 58 75 56 100 Q 54 125 58 150 Q 66 162 80 165 L 120 165 Q 134 162 142 150 Q 146 125 144 100 Q 142 75 132 58 Q 118 50 100 50 Q 82 50 68 58 Z" fill="#151515" />
        
        {/* Upper arms */}
        <Path d="M 56 58 Q 44 72 40 96 Q 40 116 46 130 Q 54 120 58 100 Q 64 80 68 60 Z" fill="#151515" />
        <Path d="M 144 58 Q 156 72 160 96 Q 160 116 154 130 Q 146 120 142 100 Q 136 80 132 60 Z" fill="#151515" />
        
        {/* Forearms */}
        <Path d="M 40 98 Q 34 115 30 140 Q 36 145 42 140 Q 46 118 48 100 Z" fill="#151515" />
        <Path d="M 160 98 Q 166 115 170 140 Q 164 145 158 140 Q 154 118 152 100 Z" fill="#151515" />
        
        {/* Hands */}
        <Ellipse cx="35" cy="148" rx="7" ry="9" fill="#111111" />
        <Ellipse cx="165" cy="148" rx="7" ry="9" fill="#111111" />
        
        {/* Hips */}
        <Path d="M 76 162 Q 68 172 68 188 L 94 188 Q 96 175 100 170 Q 104 175 106 188 L 132 188 Q 132 172 124 162 Z" fill="#151515" />
        
        {/* Thighs */}
        <Path d="M 68 188 Q 64 220 66 258 Q 74 262 88 258 Q 92 220 94 188 Z" fill="#151515" />
        <Path d="M 132 188 Q 136 220 134 258 Q 126 262 112 258 Q 108 220 106 188 Z" fill="#151515" />
        
        {/* Knees */}
        <Ellipse cx="77" cy="262" rx="12" ry="8" fill="#111111" />
        <Ellipse cx="123" cy="262" rx="12" ry="8" fill="#111111" />
        
        {/* Calves */}
        <Path d="M 66 268 Q 62 300 66 330 Q 76 336 84 330 Q 86 300 88 268 Z" fill="#151515" />
        <Path d="M 134 268 Q 138 300 134 330 Q 124 336 116 330 Q 114 300 112 268 Z" fill="#151515" />
        
        {/* Feet */}
        <Ellipse cx="74" cy="336" rx="12" ry="8" fill="#111111" />
        <Ellipse cx="126" cy="336" rx="12" ry="8" fill="#111111" />

        {/* ── Interactive Muscle Groups ── */}

        {/* Shoulders */}
        <G onPress={() => onMuscleSelect('Hombros')}>
          <Ellipse cx="62" cy="66" rx="18" ry="12" fill={mc('Hombros').fill} opacity={mc('Hombros').opacity} rotation="-15" origin="62, 66" />
          <Ellipse cx="138" cy="66" rx="18" ry="12" fill={mc('Hombros').fill} opacity={mc('Hombros').opacity} rotation="15" origin="138, 66" />
        </G>

        {/* Chest */}
        <G onPress={() => onMuscleSelect('Pecho')}>
          <Path d="M 80 60 Q 66 66 64 82 Q 64 96 82 98 Q 100 96 100 80 Q 100 64 80 60 Z" fill={mc('Pecho').fill} opacity={mc('Pecho').opacity} />
          <Path d="M 120 60 Q 134 66 136 82 Q 136 96 118 98 Q 100 96 100 80 Q 100 64 120 60 Z" fill={mc('Pecho').fill} opacity={mc('Pecho').opacity} />
        </G>

        {/* Biceps */}
        <G onPress={() => onMuscleSelect('Bíceps')}>
          <Path d="M 56 60 Q 44 74 42 96 Q 46 104 54 100 Q 60 80 66 62 Z" fill={mc('Bíceps').fill} opacity={mc('Bíceps').opacity} />
          <Path d="M 144 60 Q 156 74 158 96 Q 154 104 146 100 Q 140 80 134 62 Z" fill={mc('Bíceps').fill} opacity={mc('Bíceps').opacity} />
        </G>

        {/* Abs */}
        <G onPress={() => onMuscleSelect('Abs')}>
          {[0, 1, 2].map(row => (
            <G key={row}>
              <Rect x="87" y={100 + row * 18} width="12" height="14" rx="4" fill={mc('Abs').fill} opacity={mc('Abs').opacity} />
              <Rect x="101" y={100 + row * 18} width="12" height="14" rx="4" fill={mc('Abs').fill} opacity={mc('Abs').opacity} />
            </G>
          ))}
        </G>

        {/* Tríceps */}
        <G onPress={() => onMuscleSelect('Tríceps')}>
          <Path d="M 40 98 Q 34 116 32 140 Q 38 144 44 140 Q 46 118 50 100 Z" fill={mc('Tríceps').fill} opacity={mc('Tríceps').opacity} />
          <Path d="M 160 98 Q 166 116 168 140 Q 162 144 156 140 Q 154 118 150 100 Z" fill={mc('Tríceps').fill} opacity={mc('Tríceps').opacity} />
        </G>

        {/* Glúteos */}
        <G onPress={() => onMuscleSelect('Glúteos')}>
          <Path d="M 76 154 Q 64 166 64 186 Q 76 190 94 186 Q 100 174 100 165 Z" fill={mc('Glúteos').fill} opacity={mc('Glúteos').opacity} />
          <Path d="M 124 154 Q 136 166 136 186 Q 124 190 106 186 Q 100 174 100 165 Z" fill={mc('Glúteos').fill} opacity={mc('Glúteos').opacity} />
        </G>

        {/* Cuádriceps */}
        <G onPress={() => onMuscleSelect('Cuádriceps')}>
          <Path d="M 66 186 Q 62 218 64 256 Q 72 262 88 256 Q 92 218 94 186 Z" fill={mc('Cuádriceps').fill} opacity={mc('Cuádriceps').opacity} />
          <Path d="M 134 186 Q 138 218 136 256 Q 128 262 112 256 Q 108 218 106 186 Z" fill={mc('Cuádriceps').fill} opacity={mc('Cuádriceps').opacity} />
        </G>

        {/* Isquiotibiales */}
        <G onPress={() => onMuscleSelect('Isquiotibiales')}>
          <Path d="M 80 186 Q 76 218 78 254 Q 86 256 94 252 Q 92 220 90 186 Z" fill={mc('Isquiotibiales').fill} opacity={mc('Isquiotibiales').opacity * 0.8} />
          <Path d="M 120 186 Q 124 218 122 254 Q 114 256 106 252 Q 108 220 110 186 Z" fill={mc('Isquiotibiales').fill} opacity={mc('Isquiotibiales').opacity * 0.8} />
        </G>

        {/* Pantorrillas */}
        <G onPress={() => onMuscleSelect('Pantorrillas')}>
          <Path d="M 64 268 Q 60 302 64 328 Q 74 336 84 328 Q 86 302 88 268 Z" fill={mc('Pantorrillas').fill} opacity={mc('Pantorrillas').opacity} />
          <Path d="M 136 268 Q 140 302 136 328 Q 126 336 116 328 Q 114 302 112 268 Z" fill={mc('Pantorrillas').fill} opacity={mc('Pantorrillas').opacity} />
        </G>

        {/* Selected Highlight Outline */}
        {selectedMuscle === 'Pecho' && (
          <G stroke="#60A5FA" strokeWidth="2.5" fill="none" opacity={0.9}>
            <Path d="M 80 60 Q 66 66 64 82 Q 64 96 82 98 Q 100 96 100 80 Q 100 64 80 60 Z" />
            <Path d="M 120 60 Q 134 66 136 82 Q 136 96 118 98 Q 100 96 100 80 Q 100 64 120 60 Z" />
          </G>
        )}
        {selectedMuscle === 'Hombros' && (
          <G stroke="#60A5FA" strokeWidth="2.5" fill="none" opacity={0.9}>
            <Ellipse cx="62" cy="66" rx="18" ry="12" rotation="-15" origin="62, 66" />
            <Ellipse cx="138" cy="66" rx="18" ry="12" rotation="15" origin="138, 66" />
          </G>
        )}
        {selectedMuscle === 'Cuádriceps' && (
          <G stroke="#60A5FA" strokeWidth="2.5" fill="none" opacity={0.9}>
            <Path d="M 66 186 Q 62 218 64 256 Q 72 262 88 256 Q 92 218 94 186 Z" />
            <Path d="M 134 186 Q 138 218 136 256 Q 128 262 112 256 Q 108 218 106 186 Z" />
          </G>
        )}
      </Svg>
    </View>
  )
}
