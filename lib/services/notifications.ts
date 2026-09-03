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
}

export const NOTIFICATION_ACTIONS = {
  COMPLETE_SET: 'action_complete_set',
  REST_PLUS_30: 'action_rest_plus_30',
  SKIP_REST: 'action_skip_rest',
}

let activeWorkoutNotificationId: string | null = null
let restFinishedNotificationId: string | null = null

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
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#38BDF8',
        sound: 'default',
        enableLights: true,
        enableVibrate: true,
      })

      await Notifications.setNotificationChannelAsync('rest_channel', {
        name: 'Alertas de Descanso',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 400, 200, 400],
        lightColor: '#38BDF8',
        sound: 'default',
        enableLights: true,
        enableVibrate: true,
      })
    }

    await Notifications.setNotificationCategoryAsync(NOTIFICATION_CATEGORIES.WORKOUT_ACTIVE, [
      {
        identifier: NOTIFICATION_ACTIONS.COMPLETE_SET,
        buttonTitle: 'Completar Serie',
        options: { opensAppToForeground: false },
      },
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
}) {
  if (Platform.OS === 'web') return
  try {
    const title = isResting
      ? `Descanso: ${restSecondsLeft || 0}s restantes`
      : `${exerciseName} · Serie ${currentSet}/${totalSets}`

    const body = isResting
      ? `Próximo: Serie ${currentSet} de ${exerciseName} | Tiempo: ${durationFormatted}`
      : `Objetivo: ${targetWeight ? `${targetWeight} kg` : '—'} x ${targetReps || '10'} reps | ${durationFormatted}`

    activeWorkoutNotificationId = await Notifications.scheduleNotificationAsync({
      identifier: 'carga_active_workout',
      content: {
        title,
        body,
        data: { type: 'workout_ongoing', exerciseName, currentSet },
        categoryIdentifier: NOTIFICATION_CATEGORIES.WORKOUT_ACTIVE,
        sticky: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
        sound: false,
      },
      trigger: null,
    })
  } catch (err) {
    console.log('Error showing workout active notification:', err)
  }
}

export async function scheduleRestFinishedNotification(
  nextExerciseName: string,
  nextSetNum: number,
  restSeconds: number
) {
  if (Platform.OS === 'web' || restSeconds <= 0) return
  try {
    await Notifications.cancelScheduledNotificationAsync('carga_rest_finished').catch(() => {})

    restFinishedNotificationId = await Notifications.scheduleNotificationAsync({
      identifier: 'carga_rest_finished',
      content: {
        title: 'Descanso Terminado',
        body: `Es hora de la Serie ${nextSetNum} de ${nextExerciseName}. ¡A por todas!`,
        data: { type: 'rest_finished' },
        sound: 'default',
        vibrate: [0, 500, 200, 500],
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: Math.max(1, Math.round(restSeconds)),
      },
    })
  } catch (err) {
    console.log('Error scheduling rest finished notification:', err)
  }
}

export async function cancelRestFinishedNotification() {
  if (Platform.OS === 'web') return
  try {
    await Notifications.cancelScheduledNotificationAsync('carga_rest_finished').catch(() => {})
    await Notifications.dismissNotificationAsync('carga_rest_finished').catch(() => {})
    restFinishedNotificationId = null
  } catch (err) {
    console.log('Error canceling rest notification:', err)
  }
}

export async function clearAllWorkoutNotifications() {
  if (Platform.OS === 'web') return
  try {
    await Notifications.dismissNotificationAsync('carga_active_workout').catch(() => {})
    await Notifications.cancelScheduledNotificationAsync('carga_active_workout').catch(() => {})
    await Notifications.dismissNotificationAsync('carga_rest_finished').catch(() => {})
    await Notifications.cancelScheduledNotificationAsync('carga_rest_finished').catch(() => {})
    activeWorkoutNotificationId = null
    restFinishedNotificationId = null
  } catch (err) {
    console.log('Error clearing workout notifications:', err)
  }
}