import React, { useEffect, useRef } from 'react'
import { View, Animated, Easing, StyleSheet } from 'react-native'
import Svg, { Circle, Rect, Line, Path, G } from 'react-native-svg'

interface Props {
  muscleGroup: string
  exerciseName?: string
  height?: number
}

export default function ExerciseAnimation({ muscleGroup, exerciseName = '', height = 180 }: Props) {
  const mg = (muscleGroup || '').toLowerCase()
  const name = exerciseName.toLowerCase()

  const isSquat = mg.includes('cuád') || mg.includes('piern') || mg.includes('glút') || name.includes('sentadill') || name.includes('prensa')
  const isEspalda = mg.includes('espalda') || name.includes('remo') || name.includes('jalón') || name.includes('jalon') || name.includes('dominad')
  const isHombros = mg.includes('hombro') || name.includes('militar') || name.includes('lateral')
  const isBiceps = mg.includes('bícep') || mg.includes('bicep') || name.includes('curl')
  const isTriceps = mg.includes('trícep') || mg.includes('tricep') || name.includes('fondo') || name.includes('extension')
  const isPecho = !isSquat && !isEspalda && !isHombros && !isBiceps && !isTriceps

  const anim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, {
          toValue: 1,
          duration: 1600,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(anim, {
          toValue: 0,
          duration: 1600,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    )
    loop.start()
    return () => loop.stop()
  }, [anim])

  // Transforms
  const translateY = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 24],
  })

  const squatTranslateY = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 26],
  })

  const pressTranslateY = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [24, 0],
  })

  const rowTranslateY = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [20, 0],
  })

  return (
    <View style={[styles.container, { height }]}>
      {/* ── 1. BENCH PRESS (PECHO) ── */}
      {isPecho && (
        <View style={styles.sceneWrapper}>
          {/* Base Static Layer */}
          <Svg width="320" height="180" viewBox="0 0 320 180" style={StyleSheet.absoluteFill}>
            <Circle cx="160" cy="90" r="65" fill="#3B82F6" opacity={0.06} />
            <Rect x="90" y="115" width="140" height="12" rx="4" fill="#1C1C1C" />
            <Rect x="105" y="127" width="10" height="35" rx="3" fill="#141414" />
            <Rect x="205" y="127" width="10" height="35" rx="3" fill="#141414" />
            <Circle cx="115" cy="106" r="10" fill="#2E2E2E" />
            <Rect x="125" y="103" width="60" height="14" rx="4" fill="#242424" />
            <Path d="M 185 110 L 215 125 L 215 150" stroke="#242424" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </Svg>

          {/* Animated Barbell & Arms Layer */}
          <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ translateY }] }]}>
            <Svg width="320" height="180" viewBox="0 0 320 180">
              <Line x1="120" y1="75" x2="190" y2="75" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" />
              <Rect x="114" y="60" width="8" height="30" rx="3" fill="#3B82F6" />
              <Rect x="188" y="60" width="8" height="30" rx="3" fill="#3B82F6" />
              <Rect x="108" y="65" width="6" height="20" rx="2" fill="#2563EB" />
              <Rect x="196" y="65" width="6" height="20" rx="2" fill="#2563EB" />
              <Path d="M 145 105 L 140 85 L 145 75" stroke="#3B82F6" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity={0.9} />
              <Path d="M 165 105 L 170 85 L 165 75" stroke="#3B82F6" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity={0.9} />
            </Svg>
          </Animated.View>
        </View>
      )}

      {/* ── 2. SQUAT (CUÁDRICEPS / PIERNAS) ── */}
      {isSquat && (
        <View style={styles.sceneWrapper}>
          <Svg width="320" height="180" viewBox="0 0 320 180" style={StyleSheet.absoluteFill}>
            <Circle cx="160" cy="90" r="65" fill="#3B82F6" opacity={0.06} />
            <Line x1="70" y1="160" x2="250" y2="160" stroke="#1A1A1A" strokeWidth="3" strokeLinecap="round" />
          </Svg>

          <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ translateY: squatTranslateY }] }]}>
            <Svg width="320" height="180" viewBox="0 0 320 180">
              <Circle cx="160" cy="52" r="10" fill="#2E2E2E" />
              <Path d="M 160 62 L 160 100" stroke="#242424" strokeWidth="14" strokeLinecap="round" fill="none" />
              <Line x1="110" y1="65" x2="210" y2="65" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" />
              <Rect x="102" y="48" width="8" height="34" rx="3" fill="#3B82F6" />
              <Rect x="210" y="48" width="8" height="34" rx="3" fill="#3B82F6" />
              <Rect x="94" y="53" width="8" height="24" rx="2" fill="#2563EB" />
              <Rect x="218" y="53" width="8" height="24" rx="2" fill="#2563EB" />
              <Path d="M 154 96 L 142 125 L 145 158" stroke="#3B82F6" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              <Path d="M 166 96 L 178 125 L 175 158" stroke="#3B82F6" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </Svg>
          </Animated.View>
        </View>
      )}

      {/* ── 3. ROW / JALÓN (ESPALDA) ── */}
      {isEspalda && (
        <View style={styles.sceneWrapper}>
          <Svg width="320" height="180" viewBox="0 0 320 180" style={StyleSheet.absoluteFill}>
            <Circle cx="160" cy="90" r="65" fill="#3B82F6" opacity={0.06} />
            <Circle cx="185" cy="65" r="10" fill="#2E2E2E" />
            <Path d="M 180 72 L 145 95" stroke="#3B82F6" strokeWidth="12" strokeLinecap="round" fill="none" />
            <Path d="M 145 95 L 135 125 L 140 158" stroke="#242424" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            <Path d="M 152 95 L 158 125 L 165 158" stroke="#242424" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </Svg>

          <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ translateY: rowTranslateY }] }]}>
            <Svg width="320" height="180" viewBox="0 0 320 180">
              <Line x1="125" y1="108" x2="205" y2="108" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" />
              <Rect x="117" y="93" width="8" height="30" rx="3" fill="#3B82F6" />
              <Rect x="205" y="93" width="8" height="30" rx="3" fill="#3B82F6" />
              <Rect x="110" y="98" width="7" height="20" rx="2" fill="#2563EB" />
              <Rect x="213" y="98" width="7" height="20" rx="2" fill="#2563EB" />
              <Path d="M 165 82 L 165 106" stroke="#60A5FA" strokeWidth="6" strokeLinecap="round" fill="none" />
            </Svg>
          </Animated.View>
        </View>
      )}

      {/* ── 4. OVERHEAD PRESS (HOMBROS) ── */}
      {isHombros && (
        <View style={styles.sceneWrapper}>
          <Svg width="320" height="180" viewBox="0 0 320 180" style={StyleSheet.absoluteFill}>
            <Circle cx="160" cy="90" r="65" fill="#3B82F6" opacity={0.06} />
            <Circle cx="160" cy="70" r="10" fill="#2E2E2E" />
            <Path d="M 160 80 L 160 120" stroke="#242424" strokeWidth="12" strokeLinecap="round" fill="none" />
            <Path d="M 155 120 L 150 160" stroke="#242424" strokeWidth="8" strokeLinecap="round" fill="none" />
            <Path d="M 165 120 L 170 160" stroke="#242424" strokeWidth="8" strokeLinecap="round" fill="none" />
          </Svg>

          <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ translateY: pressTranslateY }] }]}>
            <Svg width="320" height="180" viewBox="0 0 320 180">
              <Line x1="110" y1="42" x2="210" y2="42" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" />
              <Rect x="102" y="27" width="8" height="30" rx="3" fill="#3B82F6" />
              <Rect x="210" y="27" width="8" height="30" rx="3" fill="#3B82F6" />
              <Rect x="94" y="32" width="8" height="20" rx="2" fill="#2563EB" />
              <Rect x="218" y="32" width="8" height="20" rx="2" fill="#2563EB" />
              <Path d="M 152 82 L 140 60 L 145 42" stroke="#3B82F6" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              <Path d="M 168 82 L 180 60 L 175 42" stroke="#3B82F6" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </Svg>
          </Animated.View>
        </View>
      )}

      {/* ── 5. BICEP CURL (BÍCEPS) ── */}
      {isBiceps && (
        <View style={styles.sceneWrapper}>
          <Svg width="320" height="180" viewBox="0 0 320 180" style={StyleSheet.absoluteFill}>
            <Circle cx="160" cy="90" r="65" fill="#3B82F6" opacity={0.06} />
            <Circle cx="150" cy="50" r="10" fill="#2E2E2E" />
            <Path d="M 150 60 L 150 115" stroke="#242424" strokeWidth="12" strokeLinecap="round" fill="none" />
            <Path d="M 145 115 L 140 160" stroke="#242424" strokeWidth="8" strokeLinecap="round" fill="none" />
            <Path d="M 155 115 L 160 160" stroke="#242424" strokeWidth="8" strokeLinecap="round" fill="none" />
            <Line x1="156" y1="68" x2="162" y2="92" stroke="#3B82F6" strokeWidth="8" strokeLinecap="round" />
          </Svg>

          <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ translateY: pressTranslateY }] }]}>
            <Svg width="320" height="180" viewBox="0 0 320 180">
              <Rect x="168" y="70" width="18" height="12" rx="3" fill="#3B82F6" />
              <Rect x="160" y="73" width="34" height="6" rx="2" fill="#FFFFFF" />
              <Rect x="188" y="70" width="18" height="12" rx="3" fill="#3B82F6" />
              <Path d="M 162 92 L 177 75" stroke="#60A5FA" strokeWidth="6" strokeLinecap="round" fill="none" />
            </Svg>
          </Animated.View>
        </View>
      )}

      {/* ── 6. DIPS / EXTENSION (TRÍCEPS) ── */}
      {isTriceps && (
        <View style={styles.sceneWrapper}>
          <Svg width="320" height="180" viewBox="0 0 320 180" style={StyleSheet.absoluteFill}>
            <Circle cx="160" cy="90" r="65" fill="#3B82F6" opacity={0.06} />
            <Line x1="110" y1="100" x2="210" y2="100" stroke="#222222" strokeWidth="5" strokeLinecap="round" />
            <Line x1="125" y1="100" x2="125" y2="165" stroke="#181818" strokeWidth="4" strokeLinecap="round" />
            <Line x1="195" y1="100" x2="195" y2="165" stroke="#181818" strokeWidth="4" strokeLinecap="round" />
          </Svg>

          <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ translateY }] }]}>
            <Svg width="320" height="180" viewBox="0 0 320 180">
              <Circle cx="160" cy="55" r="10" fill="#2E2E2E" />
              <Path d="M 160 65 L 160 115" stroke="#242424" strokeWidth="12" strokeLinecap="round" fill="none" />
              <Path d="M 160 115 L 155 145" stroke="#242424" strokeWidth="7" strokeLinecap="round" fill="none" />
              <Path d="M 154 72 L 140 85 L 138 100" stroke="#3B82F6" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              <Path d="M 166 72 L 180 85 L 182 100" stroke="#3B82F6" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </Svg>
          </Animated.View>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: '#060606',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sceneWrapper: {
    width: 320,
    height: 180,
    position: 'relative',
  },
})
