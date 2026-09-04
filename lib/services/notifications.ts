import * as Notifications from 'expo-notifications'
import { Platform } from 'react-native'

Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const isOngoing = notification.request.content.data?.type === 'workout_ongoing'
    return {
      shouldShowAlert: !isOngoing,
      shouldPlaySound: !isOngoing,
      shouldSetBadge: false,
    }
  },
})

export const NOTIFICATION_CATEGORIES = {
  WORKOUT_ACTIVE: 'workout_active_category',
  WORKOUT_RESTING: 'workout_resting_category',
}

export const NOTIFICATION_ACTIONS = {
  COMPLETE_SET: 'action_complete_set',
  REST_PLUS_30: 'action_rest_plus_30',
  SKIP_REST: 'action_skip_rest',
}

let activeWorkoutNotificationId: string | null = null

export async function setupWorkoutNotifications(): Promise<boolean> {
  if (Platform.OS === 'web') return false
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync()
    let finalStatus = existingStatus
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync()
      finalStatus = status
    }
    if (finalStatus !== 'granted') return false

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('workout_channel', {
        name: 'Entrenamiento en Vivo',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 300, 150, 300],
        lightColor: '#38BDF8',
        sound: 'default',
        enableLights: true,
        enableVibrate: true,
      })
    }

    // Category when doing a set: Action to complete set
    await Notifications.setNotificationCategoryAsync(NOTIFICATION_CATEGORIES.WORKOUT_ACTIVE, [
      {
        identifier: NOTIFICATION_ACTIONS.COMPLETE_SET,
        buttonTitle: '✓ Completar Serie',
        options: { opensAppToForeground: false },
      },
    ])

    // Category when resting: Actions to add +30s or skip rest
    await Notifications.setNotificationCategoryAsync(NOTIFICATION_CATEGORIES.WORKOUT_RESTING, [
      {
        identifier: NOTIFICATION_ACTIONS.REST_PLUS_30,
        buttonTitle: '+30s Descanso',
        options: { opensAppToForeground: false },
      },
      {
        identifier: NOTIFICATION_ACTIONS.SKIP_REST,
        buttonTitle: 'Saltar Descanso',
        options: { opensAppToForeground: false },
      },
    ])

    return true
  } catch (error) {
    console.log('Error setting up notifications:', error)
    return false
  }
}

export async function updateWorkoutActiveNotification({
  routineName,
  exerciseName,
  currentSet,
  totalSets,
  targetWeight,
  targetReps,
  durationFormatted,
  isResting,
  restSecondsLeft,
  isRestFinished,
}: {
  routineName: string
  exerciseName: string
  currentSet: number
  totalSets: number
  targetWeight?: string
  targetReps?: string
  durationFormatted: string
  isResting?: boolean
  restSecondsLeft?: number
  isRestFinished?: boolean
}) {
  if (Platform.OS === 'web') return
  try {
    let title = ''
    let body = ''
    let category = NOTIFICATION_CATEGORIES.WORKOUT_ACTIVE
    let playSound = false

    if (isRestFinished) {
      title = '⏰ ¡Descanso Terminado!'
      body = `Es hora de la Serie ${currentSet}/${totalSets} de ${exerciseName}. ¡A por todas!`
      category = NOTIFICATION_CATEGORIES.WORKOUT_ACTIVE
      playSound = true
    } else if (isResting) {
      const mins = Math.floor((restSecondsLeft || 0) / 60)
      const secs = (restSecondsLeft || 0) % 60
      const formattedTime = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`
      title = `⏳ Descanso: ${formattedTime} restantes`
      body = `Próximo: Serie ${currentSet}/${totalSets} de ${exerciseName} | Tiempo: ${durationFormatted}`
      category = NOTIFICATION_CATEGORIES.WORKOUT_RESTING
    } else {
      title = `🏋️ ${exerciseName} · Serie ${currentSet}/${totalSets}`
      body = `Objetivo: ${targetWeight ? `${targetWeight} kg` : '—'} x ${targetReps || '10'} reps | Tiempo: ${durationFormatted}`
      category = NOTIFICATION_CATEGORIES.WORKOUT_ACTIVE
    }

    activeWorkoutNotificationId = await Notifications.scheduleNotificationAsync({
      identifier: 'carga_active_workout',
      content: {
        title,
        body,
        data: { type: 'workout_ongoing', exerciseName, currentSet, isResting },
        categoryIdentifier: category,
        sticky: true,
        priority: Notifications.AndroidNotificationPriority.MAX,
        sound: playSound ? 'default' : undefined,
      },
      trigger: null,
    })
  } catch (err) {
    console.log('Error showing workout active notification:', err)
  }
}

export async function clearAllWorkoutNotifications() {
  if (Platform.OS === 'web') return
  try {
    await Notifications.dismissNotificationAsync('carga_active_workout').catch(() => {})
    await Notifications.cancelScheduledNotificationAsync('carga_active_workout').catch(() => {})
    activeWorkoutNotificationId = null
  } catch (err) {
    console.log('Error clearing workout notifications:', err)
  }
}