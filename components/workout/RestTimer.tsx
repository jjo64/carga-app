import { useState, useEffect, useRef } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  Vibration,
  StyleSheet,
  Platform,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { theme } from '@/constants/theme'

interface Props {
  initialSeconds?: number
  onClose?: () => void
  onComplete?: () => void
}

export function RestTimer({
  initialSeconds = 90,
  onClose,
  onComplete,
}: Props) {
  const [timeLeft, setTimeLeft] = useState(initialSeconds)
  const [isRunning, setIsRunning] = useState(true)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    setTimeLeft(initialSeconds)
    setIsRunning(true)
  }, [initialSeconds])

  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            if (intervalRef.current) clearInterval(intervalRef.current)
            if (Platform.OS !== 'web') {
              Vibration.vibrate([0, 400, 200, 400])
            }
            onComplete?.()
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [isRunning, timeLeft, onComplete])

  const minutes = Math.floor(timeLeft / 60)
  const seconds = timeLeft % 60
  const isWarning = timeLeft <= 10 && timeLeft > 0

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.badge}>
          <Ionicons name="timer-outline" size={16} color={theme.colors.primary} />
          <Text style={styles.label}>DESCANSO</Text>
        </View>
        {onClose && (
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={20} color={theme.colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      <Text style={[styles.timer, isWarning && styles.timerWarning]}>
        {minutes}:{seconds.toString().padStart(2, '0')}
      </Text>

      <View style={styles.controls}>
        <TouchableOpacity
          onPress={() => setTimeLeft((prev) => prev + 15)}
          style={styles.btn}
        >
          <Text style={styles.btnText}>+15s</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setIsRunning((prev) => !prev)}
          style={[styles.btn, styles.btnPrimary]}
        >
          <Ionicons
            name={isRunning ? 'pause' : 'play'}
            size={18}
            color="#000"
          />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => {
            setTimeLeft(0)
            onClose?.()
          }}
          style={styles.btn}
        >
          <Text style={styles.btnText}>Saltar</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    alignItems: 'center',
    marginVertical: theme.spacing.sm,
  },
  headerRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  label: {
    color: theme.colors.primary,
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  closeBtn: {
    padding: 4,
  },
  timer: {
    color: theme.colors.primary,
    fontSize: 48,
    fontWeight: '900',
    marginVertical: theme.spacing.xs,
  },
  timerWarning: {
    color: theme.colors.secondary,
  },
  controls: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.xs,
  },
  btn: {
    backgroundColor: theme.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: theme.borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 64,
  },
  btnPrimary: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  btnText: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
})
