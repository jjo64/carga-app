import * as Notifications from 'expo-notifications'
import { Platform } from 'react-native'

Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const isOngoing = notification.request.content.data?.type === 'workout_ongoing'
    return {
      shouldShowAlert: true,
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

const ONGOING_NOTIFICATION_ID = 'carga_active_workout'
const REST_ALARM_NOTIFICATION_ID = 'carga_rest_finished_alarm'

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
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 300, 150, 300],
        lightColor: '#38BDF8',
        sound: 'default',
        enableLights: true,
        enableVibrate: true,
      })

      await Notifications.setNotificationChannelAsync('workout_rest_channel', {
        name: 'Fin de Descanso',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 400, 200, 400],
        lightColor: '#10B981',
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

/**
 * Schedules a precise OS-level background alarm for when the rest timer ends.
 * Even if the JS thread is frozen outside the app, the native OS will ring this alarm at the exact second.
 */
export async function scheduleRestFinishAlarm({
  seconds,
  exerciseName,
  currentSet,
  totalSets,
}: {
  seconds: number
  exerciseName: string
  currentSet: number
  totalSets: number
}) {
  if (Platform.OS === 'web' || seconds <= 0) return
  try {
    // First cancel any existing rest finish alarm
    await cancelRestFinishAlarm()

    await Notifications.scheduleNotificationAsync({
      identifier: REST_ALARM_NOTIFICATION_ID,
      content: {
        title: '⏰ ¡Descanso Terminado!',
        body: `Es hora de la Serie ${currentSet}/${totalSets} de ${exerciseName}. ¡A por todas!`,
        sound: 'default',
        priority: Notifications.AndroidNotificationPriority.MAX,
        data: { type: 'rest_alarm', exerciseName, currentSet },
        categoryIdentifier: NOTIFICATION_CATEGORIES.WORKOUT_ACTIVE,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: Math.max(1, Math.round(seconds)),
      },
    })
  } catch (err) {
    console.log('Error scheduling rest finish alarm:', err)
  }
}

export async function cancelRestFinishAlarm() {
  if (Platform.OS === 'web') return
  try {
    await Notifications.cancelScheduledNotificationAsync(REST_ALARM_NOTIFICATION_ID).catch(() => {})
    await Notifications.dismissNotificationAsync(REST_ALARM_NOTIFICATION_ID).catch(() => {})
  } catch (err) {
    console.log('Error cancelling rest finish alarm:', err)
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

    await Notifications.scheduleNotificationAsync({
      identifier: ONGOING_NOTIFICATION_ID,
      content: {
        title,
        body,
        data: { type: 'workout_ongoing', exerciseName, currentSet, isResting },
        categoryIdentifier: category,
        sticky: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
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
    await Notifications.dismissNotificationAsync(ONGOING_NOTIFICATION_ID).catch(() => {})
    await Notifications.cancelScheduledNotificationAsync(ONGOING_NOTIFICATION_ID).catch(() => {})
    await cancelRestFinishAlarm()
  } catch (err) {
    console.log('Error clearing workout notifications:', err)
  }
}