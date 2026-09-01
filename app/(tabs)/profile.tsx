import { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native'
import { useAuth } from '@/lib/hooks/useAuth'
import { theme } from '@/constants/theme'
import { Ionicons } from '@expo/vector-icons'
import { calculateBMR, calculateTDEE, calculateTargetCalories, calculateAge } from '@/lib/utils/calories'
import { Goal, ActivityLevel, Gender } from '@/types'

const GOAL_OPTIONS: { value: Goal; label: string; desc: string }[] = [
  { value: 'muscle_gain', label: '💪 Hipertrofia / Ganar Músculo', desc: '+300 kcal (Superávit)' },
  { value: 'fat_loss', label: '🔥 Definición / Perder Grasa', desc: '-400 kcal (Déficit)' },
  { value: 'maintenance', label: '⚖️ Mantenimiento', desc: '0 kcal (Balance neutro)' },
  { value: 'recomp', label: '⚡ Recomposición Corporal', desc: '-150 kcal (Déficit leve)' },
]

const ACTIVITY_OPTIONS: { value: ActivityLevel; label: string; desc: string }[] = [
  { value: 'sedentary', label: 'Sedentario', desc: 'Trabajo de oficina, poco movimiento' },
  { value: 'light', label: 'Ligero', desc: 'Entrenamiento 1-3 días/semana' },
  { value: 'moderate', label: 'Moderado', desc: 'Entrenamiento 3-5 días/semana' },
  { value: 'active', label: 'Activo', desc: 'Entrenamiento 6-7 días/semana' },
  { value: 'very_active', label: 'Muy Activo', desc: 'Trabajo físico + entreno doble' },
]

const GENDER_OPTIONS: { value: Gender; label: string }[] = [
  { value: 'male', label: 'Hombre' },
  { value: 'female', label: 'Mujer' },
  { value: 'other', label: 'Otro' },
]

export default function ProfileScreen() {
  const { user, profile, updateProfile, signOut } = useAuth()

  const [name, setName] = useState(profile?.name || '')
  const [heightCm, setHeightCm] = useState(profile?.height_cm?.toString() || '175')
  const [birthDate, setBirthDate] = useState(profile?.birth_date || '1998-01-01')
  const [gender, setGender] = useState<Gender>(profile?.gender || 'male')
  const [goal, setGoal] = useState<Goal>(profile?.goal || 'muscle_gain')
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>(
    profile?.activity_level || 'moderate'
  )

  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  useEffect(() => {
    if (profile) {
      if (profile.name) setName(profile.name)
      if (profile.height_cm) setHeightCm(profile.height_cm.toString())
      if (profile.birth_date) setBirthDate(profile.birth_date)
      if (profile.gender) setGender(profile.gender)
      if (profile.goal) setGoal(profile.goal)
      if (profile.activity_level) setActivityLevel(profile.activity_level)
    }
  }, [profile])

  // Cálculos en vivo
  const parsedHeight = parseFloat(heightCm) || 175
  const simulatedProfile = {
    height_cm: parsedHeight,
    birth_date: birthDate,
    gender,
    goal,
    activity_level: activityLevel,
  }
  const estimatedBMR = calculateBMR(simulatedProfile, 75)
  const estimatedTDEE = calculateTDEE(estimatedBMR, activityLevel)
  const targetCalories = calculateTargetCalories(estimatedTDEE, goal)
  const userAge = calculateAge(birthDate)

  async function handleSaveProfile() {
    setSaving(true)
    setSaveSuccess(false)

    const { error } = await updateProfile({
      name: name.trim(),
      height_cm: parsedHeight,
      birth_date: birthDate,
      gender,
      goal,
      activity_level: activityLevel,
    })

    setSaving(false)
    if (error) {
      Alert.alert('Error', 'No se pudo guardar el perfil.')
    } else {
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    }
  }

  function handleSignOut() {
    if (Platform.OS === 'web') {
      if (window.confirm('¿Seguro que deseas cerrar sesión?')) {
        signOut()
      }
    } else {
      Alert.alert('Cerrar Sesión', '¿Estás seguro de que deseas salir?', [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Salir', style: 'destructive', onPress: () => signOut() },
      ])
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header del Perfil */}
      <View style={styles.profileHeader}>
        <View style={styles.avatar}>
          <Ionicons name="person" size={40} color={theme.colors.primary} />
        </View>
        <Text style={styles.userName}>{name || user?.email || 'Usuario de Carga'}</Text>
        <Text style={styles.userEmail}>{user?.email}</Text>
      </View>

      {/* Tarjeta de Métricas Calculadas en Vivo */}
      <View style={styles.metricsCard}>
        <View style={styles.metricsHeader}>
          <Ionicons name="calculator-outline" size={20} color={theme.colors.primary} />
          <Text style={styles.metricsTitle}>Metabolismo Estimado</Text>
        </View>
        <View style={styles.metricsGrid}>
          <View style={styles.metricItem}>
            <Text style={styles.metricValue}>{estimatedBMR}</Text>
            <Text style={styles.metricLabel}>BMR (Basal)</Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={styles.metricValue}>{estimatedTDEE}</Text>
            <Text style={styles.metricLabel}>TDEE (Mantenimiento)</Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={[styles.metricValue, { color: theme.colors.primary }]}>
              {targetCalories}
            </Text>
            <Text style={styles.metricLabel}>Objetivo Diario</Text>
          </View>
        </View>
      </View>

      {/* Formulario de Parámetros Físicos */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Datos Personales</Text>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Nombre o Apodo</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Tu nombre"
            placeholderTextColor={theme.colors.textMuted}
          />
        </View>

        <View style={styles.row}>
          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={styles.label}>Altura (cm)</Text>
            <TextInput
              style={styles.input}
              value={heightCm}
              onChangeText={setHeightCm}
              keyboardType="decimal-pad"
              placeholder="175"
              placeholderTextColor={theme.colors.textMuted}
            />
          </View>
          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={styles.label}>Fecha Nacimiento (Edad: {userAge})</Text>
            <TextInput
              style={styles.input}
              value={birthDate}
              onChangeText={setBirthDate}
              placeholder="AAAA-MM-DD"
              placeholderTextColor={theme.colors.textMuted}
            />
          </View>
        </View>

        {/* Género */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Género Biológico (para fórmula BMR)</Text>
          <View style={styles.pillRow}>
            {GENDER_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.pill, gender === opt.value && styles.pillActive]}
                onPress={() => setGender(opt.value)}
              >
                <Text
                  style={[
                    styles.pillText,
                    gender === opt.value && styles.pillTextActive,
                  ]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Objetivo */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Objetivo Principal</Text>
          <View style={styles.optionList}>
            {GOAL_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[
                  styles.optionCard,
                  goal === opt.value && styles.optionCardActive,
                ]}
                onPress={() => setGoal(opt.value)}
              >
                <View style={styles.optionContent}>
                  <Text
                    style={[
                      styles.optionLabel,
                      goal === opt.value && styles.optionLabelActive,
                    ]}
                  >
                    {opt.label}
                  </Text>
                  <Text style={styles.optionDesc}>{opt.desc}</Text>
                </View>
                <Ionicons
                  name={
                    goal === opt.value
                      ? 'checkmark-circle'
                      : 'ellipse-outline'
                  }
                  size={20}
                  color={
                    goal === opt.value
                      ? theme.colors.primary
                      : theme.colors.textMuted
                  }
                />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Nivel de Actividad */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Nivel de Actividad Diaria</Text>
          <View style={styles.optionList}>
            {ACTIVITY_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[
                  styles.optionCard,
                  activityLevel === opt.value && styles.optionCardActive,
                ]}
                onPress={() => setActivityLevel(opt.value)}
              >
                <View style={styles.optionContent}>
                  <Text
                    style={[
                      styles.optionLabel,
                      activityLevel === opt.value && styles.optionLabelActive,
                    ]}
                  >
                    {opt.label}
                  </Text>
                  <Text style={styles.optionDesc}>{opt.desc}</Text>
                </View>
                <Ionicons
                  name={
                    activityLevel === opt.value
                      ? 'checkmark-circle'
                      : 'ellipse-outline'
                  }
                  size={20}
                  color={
                    activityLevel === opt.value
                      ? theme.colors.primary
                      : theme.colors.textMuted
                  }
                />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Guardar Perfil */}
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSaveProfile}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#000" />
          ) : (
            <Text style={styles.saveButtonText}>
              {saveSuccess ? '✅ Guardado Correctamente' : 'Guardar Cambios'}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Botón Cerrar Sesión */}
      <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
        <Ionicons name="log-out-outline" size={20} color={theme.colors.secondary} />
        <Text style={styles.signOutButtonText}>Cerrar Sesión</Text>
      </TouchableOpacity>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    padding: theme.spacing.md,
    gap: theme.spacing.lg,
    paddingBottom: theme.spacing.xl * 2,
  },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    gap: theme.spacing.xs,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: theme.colors.surface,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.xs,
  },
  userName: {
    color: theme.colors.text,
    fontSize: 20,
    fontWeight: 'bold',
  },
  userEmail: {
    color: theme.colors.textMuted,
    fontSize: 13,
  },
  metricsCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: theme.spacing.sm,
  },
  metricsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metricsTitle: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: 'bold',
  },
  metricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: theme.spacing.xs,
  },
  metricItem: {
    alignItems: 'center',
  },
  metricValue: {
    color: theme.colors.text,
    fontSize: 22,
    fontWeight: 'bold',
  },
  metricLabel: {
    color: theme.colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  card: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: theme.spacing.lg,
  },
  sectionTitle: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: 'bold',
  },
  inputGroup: {
    gap: 6,
  },
  row: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  label: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  input: {
    backgroundColor: theme.colors.surfaceSubtle,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    color: theme.colors.text,
    fontSize: 15,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
  },
  pillRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  pill: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: theme.colors.surfaceSubtle,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
  },
  pillActive: {
    backgroundColor: theme.colors.primaryMuted,
    borderColor: theme.colors.primary,
  },
  pillText: {
    color: theme.colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  pillTextActive: {
    color: theme.colors.primary,
  },
  optionList: {
    gap: theme.spacing.sm,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surfaceSubtle,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  optionCardActive: {
    backgroundColor: theme.colors.primaryMuted,
    borderColor: theme.colors.primary,
  },
  optionContent: {
    flex: 1,
    gap: 2,
  },
  optionLabel: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  optionLabelActive: {
    color: theme.colors.primary,
  },
  optionDesc: {
    color: theme.colors.textMuted,
    fontSize: 12,
  },
  saveButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: theme.spacing.sm,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: theme.borderRadius.md,
    backgroundColor: '#1f0d0d',
    borderWidth: 1,
    borderColor: theme.colors.secondary + '44',
    gap: theme.spacing.sm,
  },
  signOutButtonText: {
    color: theme.colors.secondary,
    fontSize: 15,
    fontWeight: 'bold',
  },
})
