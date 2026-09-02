import React from 'react'
import Svg, { Circle, Rect, Ellipse, Path, G } from 'react-native-svg'

interface Props {
  focus?: string | null
  size?: number
}

export default function BodyDiagram({ focus = '', size = 72 }: Props) {
  const f = (focus || '').toLowerCase()
  const has = (...kw: string[]) => kw.some(k => f.includes(k))

  const A = '#3B82F6' // active muscle
  const D = '#252525' // inactive dim
  const B = '#1A1A1A' // body base

  const chest    = has('pecho', 'chest', 'push') ? A : D
  const shoulder = has('hombro', 'shoulder', 'delt', 'press') ? A : D
  const bicep    = has('bícep', 'bicep', 'bíceps') ? A : D
  const back     = has('espalda', 'back', 'lat', 'pull', 'remo', 'jalón', 'jalon') ? A : D
  const core     = has('core', 'abdomen', 'abs') ? A : D
  const glute    = has('glúteo', 'gluteo', 'glute') ? A : D
  const quad     = has('cuádricep', 'cuadricep', 'quad', 'pierna', 'leg', 'legs') ? A : D
  const ham      = has('isquio', 'ham', 'femoral', 'muerto') ? A : D
  const calf     = has('pantorrill', 'calf', 'gemelo') ? A : D
  const tri      = has('trícep', 'tricep', 'tríceps') ? A : D

  const armColor = bicep !== D ? bicep : tri !== D ? tri : D

  return (
    <Svg
      width={size}
      height={size * 2}
      viewBox="0 0 64 128"
    >
      {/* HEAD */}
      <Circle cx="32" cy="10" r="8.5" fill={B} />

      {/* NECK */}
      <Rect x="28.5" y="17.5" width="7" height="5.5" rx="2" fill={B} />

      {/* SHOULDERS */}
      <Ellipse cx="16" cy="29" rx="9.5" ry="8.5" fill={shoulder} />
      <Ellipse cx="48" cy="29" rx="9.5" ry="8.5" fill={shoulder} />

      {/* UPPER ARMS */}
      <Rect x="7" y="28" width="10" height="22" rx="5" fill={armColor} />
      <Rect x="47" y="28" width="10" height="22" rx="5" fill={armColor} />

      {/* FOREARMS */}
      <Rect x="8" y="51" width="8" height="17" rx="4" fill={D} />
      <Rect x="48" y="51" width="8" height="17" rx="4" fill={D} />

      {/* TORSO BASE */}
      <Path d="M19 23 L45 23 L43 66 L21 66 Z" fill={B} />

      {/* CHEST L */}
      <Path d="M21 25 L32 28.5 L32 58 L23 56 Z" fill={chest} />
      {/* CHEST R */}
      <Path d="M43 25 L32 28.5 L32 58 L41 56 Z" fill={chest} />

      {/* BACK tint */}
      {back !== D && (
        <G opacity={0.6}>
          <Path d="M21 25 L32 28.5 L32 58 L23 56 Z" fill={back} />
          <Path d="M43 25 L32 28.5 L32 58 L41 56 Z" fill={back} />
          <Rect x="21" y="23" width="22" height="6" rx="2" fill={back} opacity={0.5} />
        </G>
      )}

      {/* CORE / ABS */}
      <Rect x="24" y="57" width="16" height="18" rx="3" fill={core} />

      {/* HIPS / GLUTES */}
      <Path d="M21 66 L43 66 L45 78 L19 78 Z" fill={glute} />

      {/* QUADS / HAMSTRINGS */}
      <Rect x="19" y="78" width="12" height="32" rx="6" fill={quad !== D ? quad : ham !== D ? ham : D} />
      <Rect x="33" y="78" width="12" height="32" rx="6" fill={quad !== D ? quad : ham !== D ? ham : D} />

      {/* CALVES */}
      <Rect x="20" y="112" width="10" height="14" rx="5" fill={calf} />
      <Rect x="34" y="112" width="10" height="14" rx="5" fill={calf} />
    </Svg>
  )
}
