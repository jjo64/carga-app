import React, { useEffect, useRef } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Animated, Platform } from 'react-native'
import { useRouter, useSegments } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useActiveWorkout } from '@/lib/hooks/useActiveWorkout'
import { typography } from '@/constants/typography'

export default function ActiveWorkoutFloatingBar() {
  const router = useRouter()
  const segments = useSegments()
  const { activeWorkout, restoreWorkout, toggleSetComplete, skipRest } = useActiveWorkout()

  const pulseAnim = useRef(new Animated.Value(1)).current

  // Pulsing animation for the active indicator
  useEffect(() => {
    if (!activeWorkout || !activeWorkout.isMinimized) return

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.35,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
      ])
    )
    pulse.start()

    return () => pulse.stop()
  }, [activeWorkout?.isMinimized, activeWorkout?.isResting])

  // If there is no active workout or it is not minimized, don't show
  if (!activeWorkout || !activeWorkout.isMinimized) {
    return null
  }

  // If we are currently inside the workout session screen, don't show the floating bar
  const currentPath = segments.join('/')
  if (currentPath.includes('workout/session')) {
    return null
  }

  const formatChronometer = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60)
    const secs = totalSecs % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const activeEx = activeWorkout.exercises[activeWorkout.activeExerciseIndex] || activeWorkout.exercises[0]
  const currentSetData = activeEx?.sets.find((s) => !s.completed) || activeEx?.sets[activeEx.sets.length - 1]
  const currentSetNum = currentSetData ? currentSetData.setNum : 1
  const totalSets = activeEx?.sets.length || 3

  const handleExpand = () => {
    restoreWorkout()
    router.push({
      pathname: '/workout/session/[id]',
      params: { id: activeWorkout.routineId },
    })
  }

  const handleQuickAction = () => {
    if (activeWorkout.isResting) {
      skipRest()
    } else if (currentSetData && !currentSetData.completed) {
      toggleSetComplete(activeWorkout.activeExerciseIndex, currentSetData.id)
    }
  }

  const isResting = activeWorkout.isResting
  const accentColor = isResting ? '#F59E0B' : '#10B981'

  return (
    <View style={styles.floatingContainer} pointerEvents="box-none">
      <TouchableOpacity
        activeOpacity={0.92}
        onPress={handleExpand}
        style={[
          styles.card,
          {
            borderColor: isResting ? 'rgba(245, 158, 11, 0.4)' : 'rgba(39, 39, 42, 0.9)',
          },
        ]}
      >
        {/* Glowing Top Edge Accent Line */}
        <View style={[styles.topAccent, { backgroundColor: accentColor }]} />

        <View style={styles.contentRow}>
          {/* Pulsing Live Dot */}
          <View style={styles.dotContainer}>
            <Animated.View
              style={[
                styles.pulseRing,
                {
                  backgroundColor: accentColor,
                  opacity: pulseAnim,
                },
              ]}
            />
            <View style={[styles.solidDot, { backgroundColor: accentColor }]} />
          </View>

          {/* Exercise & Set Info */}
          <View style={styles.infoCol}>
            <View style={styles.titleRow}>
              <Text style={styles.exerciseName} numberOfLines={1}>
                {activeEx?.exercise.name || activeWorkout.routineTitle}
              </Text>
            </View>

            <View style={styles.subtitleRow}>
              {isResting ? (
                <Text style={styles.restSubtitle}>
                  ⏳ Descanso: <Text style={styles.restSecondsText}>{activeWorkout.restSeconds}s</Text> · Serie {currentSetNum}/{totalSets}
                </Text>
              ) : (
                <Text style={styles.activeSubtitle}>
                  Serie {currentSetNum}/{totalSets} · {currentSetData?.weightKg || currentSetData?.placeholderWeight || '—'} kg x {currentSetData?.reps || currentSetData?.placeholderReps || '10'} reps
                </Text>
              )}
            </View>
          </View>

          {/* Live Chronometer */}
          <View style={styles.timerBadge}>
            <Ionicons name="stopwatch-outline" size={12} color="#A1A1AA" style={{ marginRight: 3 }} />
            <Text style={styles.timerText}>{formatChronometer(activeWorkout.elapsedSeconds)}</Text>
          </View>

          {/* Quick Action Button */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleQuickAction}
            style={[
              styles.quickActionBtn,
              isResting ? styles.skipRestBtn : styles.completeSetBtn,
            ]}
          >
            {isResting ? (
              <>
                <Ionicons name="play-forward" size={13} color="#F59E0B" />
                <Text style={styles.skipRestText}>Saltar</Text>
              </>
            ) : (
              <>
                <Ionicons name="checkmark" size={13} color="#10B981" />
                <Text style={styles.completeSetText}>✓ Serie</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Expand Chevron */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleExpand}
            style={styles.expandBtn}
          >
            <Ionicons name="chevron-up" size={18} color="#FAFAFA" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  floatingContainer: {
    position: 'absolute',
    left: 14,
    right: 14,
    bottom: Platform.OS === 'ios' ? 96 : 74,
    zIndex: 9999,
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
  },
  card: {
    backgroundColor: '#121214',
    borderRadius: 18,
    borderWidth: 1.2,
    overflow: 'hidden',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  topAccent: {
    position: 'absolute',
    top: 0,
    left: 16,
    right: 16,
    height: 2,
    borderRadius: 2,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dotContainer: {
    width: 14,
    height: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseRing: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  solidDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  infoCol: {
    flex: 1,
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  exerciseName: {
    color: '#FAFAFA',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  activeSubtitle: {
    color: '#A1A1AA',
    fontSize: 11,
    fontWeight: '500',
  },
  restSubtitle: {
    color: '#F59E0B',
    fontSize: 11,
    fontWeight: '600',
  },
  restSecondsText: {
    fontWeight: '800',
    color: '#FCD34D',
  },
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#18181B',
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#27272A',
  },
  timerText: {
    color: '#E4E4E7',
    fontSize: 11,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  quickActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 10,
    gap: 3,
  },
  completeSetBtn: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.35)',
  },
  completeSetText: {
    color: '#10B981',
    fontSize: 11,
    fontWeight: '700',
  },
  skipRestBtn: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.35)',
  },
  skipRestText: {
    color: '#F59E0B',
    fontSize: 11,
    fontWeight: '700',
  },
  expandBtn: {
    padding: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
})
