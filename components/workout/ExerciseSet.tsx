import { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { theme } from '@/constants/theme'

interface Props {
  setNumber: number
  targetReps?: string
  previousSet?: {
    weight_kg: number
    reps: number
  }
  isCompleted?: boolean
  initialWeight?: number
  initialReps?: number
  onComplete: (data: {
    weightKg: number
    reps: number
    rpe?: number
    isWarmup: boolean
  }) => void
}

export function ExerciseSet({
  setNumber,
  targetReps = '8-10',
  previousSet,
  isCompleted = false,
  initialWeight,
  initialReps,
  onComplete,
}: Props) {
  const [weight, setWeight] = useState(
    initialWeight?.toString() || previousSet?.weight_kg?.toString() || ''
  )
  const [reps, setReps] = useState(
    initialReps?.toString() || previousSet?.reps?.toString() || ''
  )
  const [isWarmup, setIsWarmup] = useState(false)
  const [completed, setCompleted] = useState(isCompleted)

  function handleComplete() {
    const w = parseFloat(weight)
    const r = parseInt(reps, 10)

    if (isNaN(w) || isNaN(r)) return

    setCompleted(true)
    onComplete({
      weightKg: w,
      reps: r,
      isWarmup,
    })
  }

  return (
    <View
      style={[
        styles.container,
        completed && styles.completedContainer,
        isWarmup && styles.warmupContainer,
      ]}
    >
      {/* Set Number / Calentamiento */}
      <TouchableOpacity
        onPress={() => !completed && setIsWarmup(!isWarmup)}
        style={styles.setNumberBtn}
        disabled={completed}
      >
        <Text style={[styles.setNumber, isWarmup && styles.warmupText]}>
          {isWarmup ? 'W' : setNumber}
        </Text>
      </TouchableOpacity>

      {/* Comparativa Sesión Previa */}
      <View style={styles.previousCol}>
        <Text style={styles.previousLabel}>Previo</Text>
        <Text style={styles.previousValue}>
          {previousSet
            ? `${previousSet.weight_kg}k × ${previousSet.reps}`
            : '—'}
        </Text>
      </View>

      {/* Input de Peso */}
      <View style={styles.inputGroup}>
        <TextInput
          style={[styles.input, completed && styles.completedInput]}
          value={weight}
          onChangeText={setWeight}
          keyboardType="decimal-pad"
          placeholder={previousSet?.weight_kg?.toString() || '0'}
          placeholderTextColor={theme.colors.textMuted}
          editable={!completed}
        />
        <Text style={styles.unitText}>kg</Text>
      </View>

      {/* Input de Reps */}
      <View style={styles.inputGroup}>
        <TextInput
          style={[styles.input, completed && styles.completedInput]}
          value={reps}
          onChangeText={setReps}
          keyboardType="number-pad"
          placeholder={targetReps}
          placeholderTextColor={theme.colors.textMuted}
          editable={!completed}
        />
        <Text style={styles.unitText}>reps</Text>
      </View>

      {/* Botón Completar Serie */}
      <TouchableOpacity
        style={[
          styles.checkBtn,
          completed && styles.checkBtnCompleted,
          (!weight || !reps) && !completed && styles.checkBtnDisabled,
        ]}
        onPress={handleComplete}
        disabled={completed || !weight || !reps}
      >
        <Ionicons
          name={completed ? 'checkmark-sharp' : 'checkmark-outline'}
          size={20}
          color={completed ? '#000' : theme.colors.textMuted}
        />
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceSubtle,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.sm,
    gap: 8,
    borderWidth: 1,
    borderColor: 'transparent',
    marginVertical: 3,
  },
  completedContainer: {
    backgroundColor: '#0a1d12',
    borderColor: '#00ff8833',
  },
  warmupContainer: {
    backgroundColor: '#1f1a0e',
    borderColor: '#ffb70333',
  },
  setNumberBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  setNumber: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    fontWeight: 'bold',
  },
  warmupText: {
    color: theme.colors.warning,
  },
  previousCol: {
    width: 76,
    alignItems: 'center',
  },
  previousLabel: {
    color: theme.colors.textMuted,
    fontSize: 9,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  previousValue: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  inputGroup: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.sm,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  input: {
    flex: 1,
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: 'bold',
    textAlign: 'center',
    paddingVertical: Platform.OS === 'ios' ? 8 : 4,
  },
  completedInput: {
    color: theme.colors.primary,
  },
  unitText: {
    color: theme.colors.textMuted,
    fontSize: 11,
  },
  checkBtn: {
    width: 36,
    height: 36,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  checkBtnCompleted: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  checkBtnDisabled: {
    opacity: 0.5,
  },
})
