import { useState, useEffect, useMemo } from 'react'
import { useWorkoutHistory, calculateStreak } from './useWorkout'
import { useSteps } from './useSteps'
import { gamificationService, UserGamificationState } from '../services/gamificationService'

export function useGamification() {
  const { history } = useWorkoutHistory()
  const { todayRecord: todaySteps } = useSteps()

  const currentStreak = useMemo(() => calculateStreak(history), [history])

  const gamificationState = useMemo(() => {
    return gamificationService.calculateGamificationState({
      history,
      currentStreakDays: currentStreak,
      todaySteps: todaySteps?.steps || 0,
    })
  }, [history, currentStreak, todaySteps])

  useEffect(() => {
    // Check if store review can be prompted after workouts
    gamificationService.checkAndPromptStoreReview(history.length, currentStreak)
  }, [history.length, currentStreak])

  return {
    ...gamificationState,
  }
}
