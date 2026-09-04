import React, { useState, useEffect, useMemo } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Platform,
  Alert,
  Share,
  Switch,
  Image,
} from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import * as FileSystem from 'expo-file-system'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useRouter } from 'expo-router'
import {
  Settings,
  Share2,
  Edit3,
  Globe,
  LogOut,
  Check,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Lock,
  MoreHorizontal,
  Play,
  Dumbbell,
  Calendar as CalendarIcon,
  Activity,
  Ruler,
  Trash2,
  Plus,
  Moon,
  Sun,
  Download,
  Upload,
  Bell,
  User as UserIcon,
  Key,
  X,
  Search,
  Flame,
  Award,
  Clock,
  Weight,
  Layers,
  SlidersHorizontal,
  ArrowLeft,
  Camera,
} from 'lucide-react-native'
import Svg, { Circle, Rect, Path } from 'react-native-svg'
import { useAuth } from '@/lib/hooks/useAuth'
import { useTheme } from '@/lib/theme'
import { useLanguage, SUPPORTED_LANGUAGES } from '@/lib/i18n'
import { getSeniorityBadge } from '@/constants/fitnessData'
import { Goal, Gender, ActivityLevel, ExperienceLevel } from '@/types'
import { useWorkoutHistory, UserWorkoutHistoryItem, useRoutines, calculateStreak } from '@/lib/hooks/useWorkout'
import { useBodyMeasurements, BodyMeasurementEntry } from '@/lib/hooks/useBodyMeasurements'
import { exportAllAppData, importAppData } from '@/lib/utils/exportImport'
import { EXERCISE_DATABASE, ExerciseDefinition, getExerciseById, searchExercises } from '@/constants/exerciseDatabase'
import ExerciseProgressView from '@/components/workout/ExerciseProgressView'
import ExerciseIllustration from '@/components/visuals/ExerciseIllustration'
import { supabase } from '@/lib/supabase'

type ProfileTab = 'stats' | 'exercises' | 'calendar' | 'measures'
type SettingsSection = 'profile' | 'account' | 'notifications' | 'preferences'
type FirstDayOfWeek = 'monday' | 'sunday' | 'saturday'

const EXPERIENCE_OPTIONS: { value: ExperienceLevel; label: string; desc: string }[] = [
  { value: 'beginner', label: 'Principiante', desc: '< 1 año entrenando' },
  { value: 'intermediate', label: 'Intermedio', desc: '1 a 3 años de entrenamiento' },
  { value: 'advanced', label: 'Avanzado', desc: '+3 años de entrenamiento' },
]

const GOAL_OPTIONS: { value: Goal; label: string; desc: string }[] = [
  { value: 'muscle_gain', label: 'Hipertrofia', desc: '+300 kcal' },
  { value: 'fat_loss', label: 'Definición', desc: '-400 kcal' },
  { value: 'maintenance', label: 'Mantenimiento', desc: '0 kcal' },
  { value: 'recomp', label: 'Recomposición', desc: '-150 kcal' },
]

const FIRST_DAY_STORAGE_KEY = '@fitness_ia_first_day_of_week'

// Exercise icon fallback for past workout cards
function ExerciseMiniIcon({ muscleGroup }: { muscleGroup: string }) {
  const mg = (muscleGroup || '').toLowerCase()
  const isBiceps = mg.includes('bícep') || mg.includes('bicep') || mg.includes('curl')
  const isPecho = mg.includes('pecho') || mg.includes('press')
  const isEspalda = mg.includes('espalda') || mg.includes('jalón') || mg.includes('jalon') || mg.includes('remo')

  return (
    <View style={styles.exerciseCircleThumb}>
      <Svg width="36" height="36" viewBox="0 0 36 36">
        <Circle cx="18" cy="18" r="17" fill="#FFFFFF" />
        {isBiceps && (
          <>
            <Circle cx="18" cy="12" r="4" fill="#222222" />
            <Rect x="14" y="16" width="8" height="12" rx="2" fill="#222222" />
            <Path d="M 12 20 L 8 26 L 12 28" stroke="#EF4444" strokeWidth="2.5" strokeLinecap="round" fill="none" />
            <Path d="M 24 20 L 28 26 L 24 28" stroke="#EF4444" strokeWidth="2.5" strokeLinecap="round" fill="none" />
          </>
        )}
        {isEspalda && (
          <>
            <Circle cx="18" cy="11" r="3.5" fill="#222222" />
            <Path d="M 13 15 L 23 15 L 21 27 L 15 27 Z" fill="#222222" />
            <Path d="M 14 17 L 22 17" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" />
            <Path d="M 9 13 L 27 13" stroke="#222222" strokeWidth="2" strokeLinecap="round" />
          </>
        )}
        {isPecho && (
          <>
            <Circle cx="18" cy="12" r="3.5" fill="#222222" />
            <Rect x="14" y="16" width="8" height="12" rx="2" fill="#222222" />
            <Path d="M 14 18 L 22 18" stroke="#EF4444" strokeWidth="2.5" strokeLinecap="round" />
          </>
        )}
        {!isBiceps && !isEspalda && !isPecho && (
          <>
            <Circle cx="18" cy="11" r="3.5" fill="#222222" />
            <Rect x="15" y="15" width="6" height="10" rx="2" fill="#222222" />
            <Rect x="14" y="25" width="3" height="7" rx="1" fill="#EF4444" />
            <Rect x="19" y="25" width="3" height="7" rx="1" fill="#EF4444" />
          </>
        )}
      </Svg>
    </View>
  )
}

function WorkoutExerciseRow({
  exerciseName,
  sets,
  muscleGroup,
  colors,
  isDark,
}: {
  exerciseName: string
  sets: number
  muscleGroup: string
  colors?: any
  isDark?: boolean
}) {
  const exerciseDef = useMemo(() => {
    return getExerciseById(exerciseName) || searchExercises(exerciseName)[0] || null
  }, [exerciseName])

  return (
    <View style={styles.weExerciseRow}>
      {exerciseDef?.imageUrl ? (
        <Image
          source={{ uri: exerciseDef.imageUrl }}
          style={[styles.weExerciseImage, { backgroundColor: isDark ? '#27272A' : '#E2E8F0' }]}
          resizeMode="cover"
        />
      ) : (
        <ExerciseMiniIcon muscleGroup={muscleGroup} />
      )}
      <View style={styles.weExerciseInfo}>
        <Text style={styles.weSeriesText}>
          {sets} {sets === 1 ? 'serie' : 'series'}
        </Text>
        <Text style={[styles.weNameText, { color: colors?.text || '#FAFAFA' }]} numberOfLines={2}>
          {exerciseName}
        </Text>
      </View>
    </View>
  )
}

export default function ProfileScreen() {
  const router = useRouter()
  const { user, profile, updateProfile, updateAccountEmail, updateAccountPassword, signOut } = useAuth()
  const { isDark, setMode, colors } = useTheme()
  const { language, setLanguage, t } = useLanguage()
  const { history, loading: historyLoading, deleteWorkout, updateWorkout } = useWorkoutHistory()
  const { routines } = useRoutines()
  const {
    measurements,
    latestMeasurement,
    addMeasurement,
    deleteMeasurement,
  } = useBodyMeasurements()

  // Active Sub-Tab: 'stats' | 'exercises' | 'calendar' | 'measures'
  const [activeTab, setActiveTab] = useState<ProfileTab>('stats')
  const [expandedWorkoutIds, setExpandedWorkoutIds] = useState<Record<string, boolean>>({})

  const toggleExpandWorkout = (workoutId: string) => {
    setExpandedWorkoutIds((prev) => ({
      ...prev,
      [workoutId]: !prev[workoutId],
    }))
  }

  // Calendar configuration
  const [firstDayOfWeek, setFirstDayOfWeek] = useState<FirstDayOfWeek>('monday')

  // Form State inside Profile Settings
  const [avatarUrl, setAvatarUrl] = useState<string | null>(profile?.avatar_url || null)
  const [name, setName] = useState(profile?.name || 'Usuario')
  const [heightCm, setHeightCm] = useState(profile?.height_cm?.toString() || '175')
  const [birthDate, setBirthDate] = useState(profile?.birth_date || '1998-01-01')
  const [weightKg, setWeightKg] = useState(
    profile?.initial_weight_kg?.toString() ||
    profile?.weight_kg?.toString() ||
    latestMeasurement?.weightKg?.toString() ||
    '70'
  )
  const [gender, setGender] = useState<Gender>(profile?.gender || 'male')
  const [goal, setGoal] = useState<Goal>(profile?.goal || 'muscle_gain')
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel>(profile?.experience_level || 'advanced')
  const [showBirthDatePickerModal, setShowBirthDatePickerModal] = useState(false)
  const [tempBirthYear, setTempBirthYear] = useState(1998)
  const [tempBirthMonth, setTempBirthMonth] = useState(1)
  const [tempBirthDay, setTempBirthDay] = useState(1)

  // Account Security state
  const [newUsername, setNewUsername] = useState(profile?.name || 'Usuario')
  const [newEmail, setNewEmail] = useState(user?.email || '')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [updatingAccount, setUpdatingAccount] = useState(false)

  // Notification toggles
  const [workoutReminders, setWorkoutReminders] = useState(true)
  const [mealReminders, setMealReminders] = useState(true)
  const [waterReminders, setWaterReminders] = useState(false)
  const [weeklySummary, setWeeklySummary] = useState(true)

  // Modal States
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [activeSettingsSection, setActiveSettingsSection] = useState<SettingsSection>('profile')
  const [showLanguageModal, setShowLanguageModal] = useState(false)
  const [showAddMeasureModal, setShowAddMeasureModal] = useState(false)
  const [showEditWorkoutModal, setShowEditWorkoutModal] = useState(false)
  const [showWorkoutActionModal, setShowWorkoutActionModal] = useState(false)
  const [showExerciseSelectorModal, setShowExerciseSelectorModal] = useState(false)
  const [showCalendarModal, setShowCalendarModal] = useState(false)
  const [showCalendarFilterModal, setShowCalendarFilterModal] = useState(false)
  const [showDayWorkoutsModal, setShowDayWorkoutsModal] = useState(false)
  const [showMeasuresModal, setShowMeasuresModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [importJsonText, setImportJsonText] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  // Selected Workout for Actions / Editing
  const [selectedWorkout, setSelectedWorkout] = useState<UserWorkoutHistoryItem | null>(null)
  const [editRoutineName, setEditRoutineName] = useState('')
  const [editDuration, setEditDuration] = useState('45')
  const [editVolume, setEditVolume] = useState('0')
  const [editDate, setEditDate] = useState('')
  const [editNotes, setEditNotes] = useState('')

  // Selected Exercise for Progress modal & detail
  const [activeExerciseForPR, setActiveExerciseForPR] = useState<ExerciseDefinition | null>(null)
  const [exerciseSearchQuery, setExerciseSearchQuery] = useState('')

  // Calendar State (Defaults to current date 2026-09)
  const currentDateNow = new Date()
  const [currentCalendarDate, setCurrentCalendarDate] = useState(new Date(2026, 8, 2)) // Sept 2026
  const [selectedCalendarDay, setSelectedCalendarDay] = useState<string>(
    new Date(2026, 8, 2).toISOString().split('T')[0]
  )

  // New Measurement Form State
  const [newMeasureDate, setNewMeasureDate] = useState(new Date().toISOString().split('T')[0])
  const [newWeight, setNewWeight] = useState(latestMeasurement?.weightKg?.toString() || '70')
  const [newChest, setNewChest] = useState(latestMeasurement?.chestCm?.toString() || '104')
  const [newWaist, setNewWaist] = useState(latestMeasurement?.waistCm?.toString() || '84')
  const [newHips, setNewHips] = useState(latestMeasurement?.hipsCm?.toString() || '99')
  const [newBiceps, setNewBiceps] = useState(latestMeasurement?.bicepsCm?.toString() || '38.5')
  const [newThigh, setNewThigh] = useState(latestMeasurement?.thighCm?.toString() || '59')
  const [newCalves, setNewCalves] = useState(latestMeasurement?.calvesCm?.toString() || '38')
  const [newNeck, setNewNeck] = useState(latestMeasurement?.neckCm?.toString() || '39')
  const [newMeasureNotes, setNewMeasureNotes] = useState('')

  const displayName = profile?.name || name || 'Usuario'
  const badge = getSeniorityBadge(profile?.created_at || '2023-08-01')

  const realStreakDays = useMemo(() => calculateStreak(history), [history])
  const realStreakWeeks = Math.floor(realStreakDays / 7)

  useEffect(() => {
    async function loadFirstDaySetting() {
      try {
        const saved = await AsyncStorage.getItem(FIRST_DAY_STORAGE_KEY)
        if (saved === 'monday' || saved === 'sunday' || saved === 'saturday') {
          setFirstDayOfWeek(saved)
        }
      } catch (e) {
        console.log('Error loading first day of week setting:', e)
      }
    }
    loadFirstDaySetting()
  }, [])

  const handleSetFirstDayOfWeek = async (val: FirstDayOfWeek) => {
    setFirstDayOfWeek(val)
    try {
      await AsyncStorage.setItem(FIRST_DAY_STORAGE_KEY, val)
    } catch (e) {
      console.log('Error saving first day of week setting:', e)
    }
    setShowCalendarFilterModal(false)
  }

  useEffect(() => {
    if (profile) {
      if (profile.name) {
        setName(profile.name)
        setNewUsername(profile.name)
      }
      if (profile.avatar_url) setAvatarUrl(profile.avatar_url)
      if (profile.height_cm) setHeightCm(profile.height_cm.toString())
      if (profile.birth_date) setBirthDate(profile.birth_date)
      if (profile.initial_weight_kg) setWeightKg(profile.initial_weight_kg.toString())
      else if (profile.weight_kg) setWeightKg(profile.weight_kg.toString())
      else if (latestMeasurement?.weightKg) setWeightKg(latestMeasurement.weightKg.toString())
      if (profile.gender) setGender(profile.gender)
      if (profile.goal) setGoal(profile.goal)
      if (profile.experience_level) setExperienceLevel(profile.experience_level)
    }
  }, [profile, latestMeasurement])

  const handlePickAvatar = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (status !== 'granted') {
        Alert.alert('Permiso requerido', 'Se necesita acceso a la galería para cambiar tu foto de perfil.')
        return
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      })

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0]
        let persistentUri = asset.uri

        // En plataformas móviles nativas, copiar la imagen de la caché temporal a documentDirectory permanente
        if (FileSystem.documentDirectory) {
          const avatarsDir = `${FileSystem.documentDirectory}avatars/`
          const dirInfo = await FileSystem.getInfoAsync(avatarsDir)
          if (!dirInfo.exists) {
            await FileSystem.makeDirectoryAsync(avatarsDir, { intermediates: true })
          }
          const filename = `avatar_${user?.id || 'local'}_${Date.now()}.jpg`
          const targetPath = `${avatarsDir}${filename}`
          await FileSystem.copyAsync({
            from: asset.uri,
            to: targetPath,
          })
          persistentUri = targetPath
        }

        setAvatarUrl(persistentUri)
        await updateProfile({ avatar_url: persistentUri })
        Alert.alert('Éxito', 'Foto de perfil actualizada correctamente.')
      }
    } catch (err) {
      console.log('Error picking avatar image:', err)
      Alert.alert('Error', 'No se pudo guardar la imagen de perfil.')
    }
  }

  // Dynamic activity level calculated according to completed workouts
  const workoutsCount = history.length
  const computedActivityLevel: ActivityLevel = useMemo((): ActivityLevel => {
    if (workoutsCount === 0) return 'sedentary'
    if (workoutsCount <= 3) return 'light'
    if (workoutsCount <= 12) return 'moderate'
    if (workoutsCount <= 25) return 'active'
    return 'very_active'
  }, [workoutsCount])

  const parsedHeight = parseFloat(heightCm) || 179

  // Global Statistics Aggregations
  const totalVolumeAccumulated = useMemo(() => {
    return history.reduce((sum, item) => sum + (item.volumeKg || 0), 0)
  }, [history])

  const totalMinutesTrained = useMemo(() => {
    return history.reduce((sum, item) => sum + (item.durationMinutes || 0), 0)
  }, [history])

  const totalRecordsAchieved = useMemo(() => {
    return history.reduce((sum, item) => sum + (item.recordsCount || 0), 0)
  }, [history])

  // Completed Exercises ever completed by the user, ordered from the most recently completed
  const completedExercisesList = useMemo(() => {
    const seenNames = new Set<string>()
    const list: { exercise: ExerciseDefinition; lastCompletedDate: string; timesCompleted: number }[] = []

    history.forEach((workout) => {
      workout.exercises.forEach((exItem) => {
        const normName = (exItem.name || '').trim().toLowerCase()
        if (!normName) return

        if (!seenNames.has(normName)) {
          seenNames.add(normName)
          const matchedDb = EXERCISE_DATABASE.find(
            (e) => e.name.toLowerCase() === normName || normName.includes(e.name.toLowerCase()) || e.name.toLowerCase().includes(normName)
          ) || {
            ...EXERCISE_DATABASE[0],
            id: `custom-${normName}`,
            name: exItem.name,
            muscleGroup: exItem.muscleGroup || 'Pecho',
          }

          list.push({
            exercise: matchedDb,
            lastCompletedDate: workout.dateLabel || workout.date,
            timesCompleted: 1,
          })
        } else {
          const existing = list.find((item) => item.exercise.name.toLowerCase() === normName)
          if (existing) existing.timesCompleted += 1
        }
      })
    })

    if (list.length < 3) {
      EXERCISE_DATABASE.slice(0, 8).forEach((dbEx) => {
        if (!seenNames.has(dbEx.name.toLowerCase())) {
          seenNames.add(dbEx.name.toLowerCase())
          list.push({
            exercise: dbEx,
            lastCompletedDate: 'Reciente',
            timesCompleted: 1,
          })
        }
      })
    }

    return list
  }, [history])

  // Filtered exercises for Exercise Selector Popup
  const filteredCompletedExercises = useMemo(() => {
    if (!exerciseSearchQuery.trim()) return completedExercisesList
    const q = exerciseSearchQuery.toLowerCase()
    return completedExercisesList.filter(
      (item) =>
        item.exercise.name.toLowerCase().includes(q) ||
        item.exercise.muscleGroup.toLowerCase().includes(q) ||
        item.exercise.category.toLowerCase().includes(q)
    )
  }, [completedExercisesList, exerciseSearchQuery])

  // Map of date -> workouts
  const workoutsByDate = useMemo(() => {
    const map: Record<string, UserWorkoutHistoryItem[]> = {}
    history.forEach((w) => {
      const dateKey = w.date || (w.finishedAt ? w.finishedAt.split('T')[0] : '')
      if (dateKey) {
        if (!map[dateKey]) map[dateKey] = []
        map[dateKey].push(w)
      }
    })
    return map
  }, [history])

  const selectedDayWorkouts = workoutsByDate[selectedCalendarDay] || []

  // Month and Year Calculations for Calendar
  const currentYear = 2026
  const currentMonth = 8 // September (0-indexed = 8)
  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ]

  const weekdayLabels = useMemo(() => {
    if (firstDayOfWeek === 'sunday') {
      return ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
    }
    if (firstDayOfWeek === 'saturday') {
      return ['Sáb', 'Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie']
    }
    return ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
  }, [firstDayOfWeek])

  const getWeekdayShortName = (year: number, month: number, day: number) => {
    const d = new Date(year, month, day)
    const names = ['Dom', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
    return names[d.getDay()]
  }

  // Generate calendar months to display: September 2026 and August 2026 (up to current month only)
  const calendarMonthsToRender = useMemo(() => {
    const months = []
    // 1. Current Month (Septiembre 2026)
    months.push({ year: 2026, month: 8, name: 'Septiembre de 2026', daysCount: 30 })
    // 2. Previous Month (Agosto 2026)
    months.push({ year: 2026, month: 7, name: 'Agosto de 2026', daysCount: 31 })
    return months
  }, [])

  // Profile Save
  async function handleSaveProfile() {
    setSaving(true)
    setSaveSuccess(false)

    const parsedHeight = parseInt(heightCm, 10) || 175
    const parsedWeight = parseFloat(weightKg.replace(',', '.')) || null

    const { error } = await updateProfile({
      name: name.trim(),
      height_cm: parsedHeight,
      birth_date: birthDate,
      initial_weight_kg: parsedWeight,
      weight_kg: parsedWeight,
      avatar_url: avatarUrl,
      gender,
      goal,
      experience_level: experienceLevel,
      activity_level: computedActivityLevel,
    })

    if (user && parsedWeight) {
      const todayStr = new Date().toISOString().split('T')[0]
      try {
        await supabase.from('body_weight').insert({
          user_id: user.id,
          date: todayStr,
          weight_kg: parsedWeight,
        })
      } catch (e) {
        console.log('Error inserting weight log:', e)
      }
    }

    setSaving(false)
    if (error) {
      Alert.alert('Error', 'No se pudo guardar el perfil.')
    } else {
      setSaveSuccess(true)
      setTimeout(() => {
        setSaveSuccess(false)
        setShowSettingsModal(false)
      }, 1000)
    }
  }

  // Account Security Updates
  async function handleUpdateUsername() {
    if (!newUsername.trim()) return
    setUpdatingAccount(true)
    const { error } = await updateProfile({ name: newUsername.trim() })
    setUpdatingAccount(false)
    if (error) {
      Alert.alert('Error', 'No se pudo actualizar el nombre de usuario.')
    } else {
      Alert.alert('Éxito', 'Nombre de usuario actualizado correctamente.')
    }
  }

  async function handleUpdateEmail() {
    if (!newEmail.trim() || !newEmail.includes('@')) {
      Alert.alert('Error', 'Por favor ingresa un correo electrónico válido.')
      return
    }
    setUpdatingAccount(true)
    const { error } = await updateAccountEmail(newEmail.trim())
    setUpdatingAccount(false)
    if (error) {
      Alert.alert('Error', error.message || 'No se pudo actualizar el email.')
    } else {
      Alert.alert('Email actualizado', 'Se ha enviado un enlace de confirmación a tu nuevo correo.')
    }
  }

  async function handleUpdatePassword() {
    if (newPassword.length < 6) {
      Alert.alert('Error', 'La contraseña debe tener al menos 6 caracteres.')
      return
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Las contraseñas no coinciden.')
      return
    }
    setUpdatingAccount(true)
    const { error } = await updateAccountPassword(newPassword)
    setUpdatingAccount(false)
    if (error) {
      Alert.alert('Error', error.message || 'No se pudo actualizar la contraseña.')
    } else {
      setNewPassword('')
      setConfirmPassword('')
      Alert.alert('Éxito', 'Contraseña actualizada con éxito.')
    }
  }

  // Share profile
  const handleShareProfile = async () => {
    try {
      const totalVol = history.reduce((sum, w) => sum + (w.volumeKg || 0), 0)
      const shareText = `🔥 ¡Echa un vistazo a mi perfil de entrenamiento en Carga App!\n👤 Usuario: ${displayName}\n💪 Entrenamientos completados: ${history.length}\n🔥 Racha activa: ${realStreakDays} días (${realStreakWeeks} sem)\n🏋️ Volumen total levantado: ${(totalVol / 1000).toFixed(1)} toneladas\n🎯 Objetivo actual: ${GOAL_OPTIONS.find((g) => g.value === goal)?.label || 'Hipertrofia'}\n\n¡Entrena al máximo con Carga App! ⚡`
      await Share.share({
        title: `Perfil de ${displayName}`,
        message: shareText,
      })
    } catch (err) {
      console.log('Share error:', err)
    }
  }

  // Share single workout
  const handleShareWorkout = async (workout: UserWorkoutHistoryItem) => {
    try {
      const exerciseListText = workout.exercises
        .map((e) => `• ${e.sets} series de ${e.name}`)
        .join('\n')

      const shareText = `⚡ Entrenamiento completado: ${workout.routineName}\n📅 Fecha: ${workout.dateLabel}\n⏱️ Duración: ${workout.durationFormatted}\n🏋️ Volumen: ${workout.volumeKg.toLocaleString('es-ES')} kg\n🥇 Récords: ${workout.recordsCount}\n\nComposición de la rutina:\n${exerciseListText}\n\nRegistrado en Carga App 💪`

      await Share.share({
        title: `Entrenamiento - ${workout.routineName}`,
        message: shareText,
      })
    } catch (err) {
      console.log('Error sharing workout:', err)
    }
  }

  // Share monthly calendar summary
  const handleShareCalendarSummary = async () => {
    try {
      await Share.share({
        title: 'Resumen de Entrenamientos',
        message: `📅 ¡He completado ${history.length} entrenamientos en Carga App! Racha activa de ${realStreakDays} días (${realStreakWeeks} semanas). 💪⚡`,
      })
    } catch (err) {
      console.log('Calendar share error:', err)
    }
  }

  // Open Edit Workout Modal
  const handleOpenEditWorkout = (workout: UserWorkoutHistoryItem) => {
    setSelectedWorkout(workout)
    setEditRoutineName(workout.routineName)
    setEditDuration(workout.durationMinutes?.toString() || '45')
    setEditVolume(workout.volumeKg?.toString() || '0')
    setEditDate(workout.date || new Date().toISOString().split('T')[0])
    setEditNotes(workout.notes || '')
    setShowWorkoutActionModal(false)
    setShowEditWorkoutModal(true)
  }

  // Save Edited Workout
  const handleSaveEditedWorkout = async () => {
    if (!selectedWorkout) return
    const parsedMin = parseInt(editDuration, 10) || 45
    const parsedVol = parseFloat(editVolume) || 0

    await updateWorkout(selectedWorkout.id, {
      routineName: editRoutineName.trim() || 'Entrenamiento',
      durationMinutes: parsedMin,
      volumeKg: parsedVol,
      date: editDate,
      notes: editNotes.trim() || undefined,
    })

    setShowEditWorkoutModal(false)
    setSelectedWorkout(null)
    Alert.alert('Éxito', 'Entrenamiento actualizado correctamente.')
  }

  // Delete Workout with confirmation
  const handleDeleteWorkout = (workout: UserWorkoutHistoryItem) => {
    setShowWorkoutActionModal(false)
    Alert.alert(
      'Borrar Entrenamiento',
      `¿Estás seguro de que deseas eliminar "${workout.routineName}" del ${workout.dateLabel}? Esta acción no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Borrar',
          style: 'destructive',
          onPress: async () => {
            await deleteWorkout(workout.id)
          },
        },
      ]
    )
  }

  // Save new body measurement
  const handleSaveMeasurement = async () => {
    await addMeasurement({
      date: newMeasureDate,
      weightKg: parseFloat(newWeight) || null,
      chestCm: parseFloat(newChest) || null,
      waistCm: parseFloat(newWaist) || null,
      hipsCm: parseFloat(newHips) || null,
      bicepsCm: parseFloat(newBiceps) || null,
      thighCm: parseFloat(newThigh) || null,
      calvesCm: parseFloat(newCalves) || null,
      neckCm: parseFloat(newNeck) || null,
      notes: newMeasureNotes.trim() || null,
    })

    setShowAddMeasureModal(false)
    setNewMeasureNotes('')
    Alert.alert('Éxito', 'Medida corporal registrada correctamente.')
  }

  // Export Data
  const handleExportData = async () => {
    const res = await exportAllAppData({
      profile,
      workoutHistory: history,
      bodyMeasurements: measurements,
      routines,
      notifications: { workoutReminders, mealReminders, waterReminders, weeklySummary },
    })

    if (!res.success && res.error) {
      Alert.alert('Error', res.error)
    }
  }

  // Import Data
  const handleImportData = async () => {
    if (!importJsonText.trim()) {
      Alert.alert('Error', 'Pega el código JSON de tu copia de seguridad.')
      return
    }

    const res = await importAppData(importJsonText.trim())
    if (res.success) {
      setShowImportModal(false)
      setImportJsonText('')
      Alert.alert(
        'Importación Exitosa',
        `Se han restaurado correctamente:\n• ${res.importedCounts?.measurementsCount || 0} mediciones corporales\n• ${res.importedCounts?.historyCount || 0} entrenamientos`
      )
    } else {
      Alert.alert('Error al importar', res.error || 'JSON no válido')
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* ── Top Bar Header with Edit, Share, Settings Icons ── */}
      <View style={[styles.topBar, { backgroundColor: colors.background }]}>
        <View style={{ width: 40 }} />

        <View style={styles.topBarIconsRow}>
          {/* Edit icon -> Opens Profile Settings */}
          <TouchableOpacity
            style={styles.topBarIconBtn}
            onPress={() => {
              setActiveSettingsSection('profile')
              setShowSettingsModal(true)
            }}
            activeOpacity={0.7}
          >
            <Edit3 size={20} color={colors.text} strokeWidth={2} />
          </TouchableOpacity>

          {/* Share profile icon */}
          <TouchableOpacity
            style={styles.topBarIconBtn}
            onPress={handleShareProfile}
            activeOpacity={0.7}
          >
            <Share2 size={20} color={colors.text} strokeWidth={2} />
          </TouchableOpacity>

          {/* Settings gear icon */}
          <TouchableOpacity
            style={styles.topBarIconBtn}
            onPress={() => {
              setActiveSettingsSection('profile')
              setShowSettingsModal(true)
            }}
            activeOpacity={0.7}
          >
            <Settings size={20} color={colors.text} strokeWidth={2} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* ── Profile Hero Section (Centered Avatar + Name + Capsule Pill) ── */}
        <View style={styles.profileHeroSectionCentered}>
          {/* Centered Avatar */}
          <TouchableOpacity
            onPress={handlePickAvatar}
            activeOpacity={0.8}
            style={[styles.heroAvatarCircle, { backgroundColor: isDark ? '#18181B' : '#F1F5F9', borderColor: isDark ? '#27272A' : colors.border }]}
          >
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.heroAvatarImg} />
            ) : (
              <View style={[styles.avatarInner, { backgroundColor: isDark ? '#27272A' : '#E2E8F0' }]}>
                <Text style={styles.heroAvatarInitial}>{displayName.charAt(0).toUpperCase()}</Text>
              </View>
            )}
            <View style={styles.heroAvatarEditBadge}>
              <Camera size={12} color="#FFFFFF" />
            </View>
          </TouchableOpacity>

          {/* Display Name */}
          <Text style={[styles.heroDisplayName, { color: colors.text }]}>{displayName}</Text>

          {/* Level • Goal Pill (Toca para editar en Ajustes) */}
          <TouchableOpacity
            onPress={() => {
              setActiveSettingsSection('profile')
              setShowSettingsModal(true)
            }}
            activeOpacity={0.8}
            style={[styles.heroCapsulePill, { backgroundColor: isDark ? '#18181B' : '#F1F5F9', borderColor: isDark ? '#27272A' : colors.border }]}
          >
            <Text style={styles.heroCapsuleText}>
              {(EXPERIENCE_OPTIONS.find((e) => e.value === experienceLevel)?.label || 'AVANZADO').toUpperCase()} • {(GOAL_OPTIONS.find((g) => g.value === goal)?.label || 'HIPERTROFIA').toUpperCase()}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── Sub-navigation 4 Pills (Estadísticas, Ejercicios, Calendario, Medidas) ── */}
        <View style={styles.navPillsRow}>
          {/* Estadísticas (Always Selected / Active) */}
          <TouchableOpacity
            style={[
              styles.navPill,
              {
                backgroundColor: isDark ? '#27272A' : '#E2E8F0',
                borderColor: isDark ? '#52525B' : '#CBD5E1',
              },
              styles.navPillActive,
            ]}
            activeOpacity={0.85}
          >
            <Text style={[styles.navPillText, { color: colors.text }, styles.navPillTextActive]}>
              Estadísticas
            </Text>
          </TouchableOpacity>

          {/* Ejercicios (Modal Popup) */}
          <TouchableOpacity
            style={[
              styles.navPill,
              {
                backgroundColor: isDark ? '#18181B' : '#F1F5F9',
                borderColor: isDark ? '#27272A' : '#E2E8F0',
              },
            ]}
            onPress={() => setShowExerciseSelectorModal(true)}
            activeOpacity={0.7}
          >
            <Text style={[styles.navPillText, { color: isDark ? '#A1A1AA' : '#64748B' }]}>
              Ejercicios
            </Text>
          </TouchableOpacity>

          {/* Calendario (Modal Popup) */}
          <TouchableOpacity
            style={[
              styles.navPill,
              {
                backgroundColor: isDark ? '#18181B' : '#F1F5F9',
                borderColor: isDark ? '#27272A' : '#E2E8F0',
              },
            ]}
            onPress={() => setShowCalendarModal(true)}
            activeOpacity={0.7}
          >
            <Text style={[styles.navPillText, { color: isDark ? '#A1A1AA' : '#64748B' }]}>
              Calendario
            </Text>
          </TouchableOpacity>

          {/* Medidas (Modal Popup) */}
          <TouchableOpacity
            style={[
              styles.navPill,
              {
                backgroundColor: isDark ? '#18181B' : '#F1F5F9',
                borderColor: isDark ? '#27272A' : '#E2E8F0',
              },
            ]}
            onPress={() => setShowMeasuresModal(true)}
            activeOpacity={0.7}
          >
            <Text style={[styles.navPillText, { color: isDark ? '#A1A1AA' : '#64748B' }]}>
              Medidas
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── ESTADÍSTICAS GLOBALES CARD (Always Visible) ── */}
        <View style={[styles.globalStatsCard, { backgroundColor: isDark ? '#121215' : colors.card, borderColor: isDark ? '#27272A' : colors.border }]}>
          <Text style={styles.globalStatsHeaderTitle}>ESTADÍSTICAS GLOBALES</Text>

          <View style={styles.globalStatsGrid}>
            <View style={[styles.globalStatItem, { backgroundColor: isDark ? '#18181B' : colors.cardSubtle }]}>
              <View style={styles.globalStatIconRow}>
                <Weight size={14} color="#38BDF8" />
                <Text style={styles.globalStatItemLabel}>Volumen Total</Text>
              </View>
              <Text style={[styles.globalStatItemVal, { color: colors.text }]}>
                {(totalVolumeAccumulated / 1000).toFixed(1)} <Text style={styles.globalStatUnit}>t</Text>
              </Text>
            </View>

            <View style={[styles.globalStatItem, { backgroundColor: isDark ? '#18181B' : colors.cardSubtle }]}>
              <View style={styles.globalStatIconRow}>
                <Clock size={14} color="#60A5FA" />
                <Text style={styles.globalStatItemLabel}>Tiempo Total</Text>
              </View>
              <Text style={[styles.globalStatItemVal, { color: colors.text }]}>
                {(totalMinutesTrained / 60).toFixed(1)} <Text style={styles.globalStatUnit}>h</Text>
              </Text>
            </View>

            <View style={[styles.globalStatItem, { backgroundColor: isDark ? '#18181B' : colors.cardSubtle }]}>
              <View style={styles.globalStatIconRow}>
                <Award size={14} color="#FBBF24" />
                <Text style={styles.globalStatItemLabel}>Récords PRs</Text>
              </View>
              <Text style={[styles.globalStatItemVal, { color: colors.text }]}>
                {totalRecordsAchieved}
              </Text>
            </View>

            <View style={[styles.globalStatItem, { backgroundColor: isDark ? '#18181B' : colors.cardSubtle }]}>
              <View style={styles.globalStatIconRow}>
                <Flame size={14} color="#EF4444" />
                <Text style={styles.globalStatItemLabel}>Entrenamientos</Text>
              </View>
              <Text style={[styles.globalStatItemVal, { color: colors.text }]}>
                {history.length}
              </Text>
            </View>
          </View>
        </View>

        {/* ── WORKOUTS FEED / HISTORY SECTION (Always Visible) ── */}
        <View style={styles.historySection}>
            {historyLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator color="#38BDF8" size="large" />
              </View>
            ) : history.length === 0 ? (
              /* Empty State */
              <View style={[styles.emptyWorkoutCard, { backgroundColor: isDark ? '#121215' : colors.card, borderColor: isDark ? '#27272A' : colors.border }]}>
                <View style={styles.emptyIconCircle}>
                  <Dumbbell size={28} color="#38BDF8" />
                </View>
                <Text style={[styles.emptyWorkoutTitle, { color: colors.text }]}>Sin entrenamientos registrados</Text>
                <Text style={styles.emptyWorkoutSub}>
                  Inicia una rutina cronometrada para registrar tu tiempo, volumen levantado y récords personales.
                </Text>
                <TouchableOpacity
                  style={styles.startFirstWorkoutBtn}
                  onPress={() => router.push('/(tabs)/workout')}
                  activeOpacity={0.85}
                >
                  <Play size={15} color="#FFFFFF" fill="#FFFFFF" />
                  <Text style={styles.startFirstWorkoutBtnText}>IR A ENTRENAR</Text>
                </TouchableOpacity>
              </View>
            ) : (
              /* Dynamic Workout Feed Cards */
              <View style={styles.pastWorkoutsList}>
                {history.map((workout) => {
                  const isExpanded = !!expandedWorkoutIds[workout.id]
                  const exercisesToDisplay = isExpanded ? workout.exercises : workout.exercises.slice(0, 3)
                  const remainingCount = workout.exercises.length - 3

                  return (
                    <View
                      key={workout.id}
                      style={[
                        styles.wfCard,
                        {
                          backgroundColor: isDark ? '#121215' : colors.card,
                          borderColor: isDark ? '#27272A' : colors.border,
                        },
                      ]}
                    >
                      {/* Card Header: User avatar + Display Name + Date + 3-dots */}
                      <View style={styles.wfHeaderRow}>
                        <View style={styles.wfUserInfo}>
                          {avatarUrl ? (
                            <Image source={{ uri: avatarUrl }} style={styles.wfAvatarImg} />
                          ) : (
                            <View style={[styles.wfAvatarPlaceholder, { backgroundColor: isDark ? '#27272A' : '#E2E8F0' }]}>
                              <Text style={styles.wfAvatarInitial}>{displayName.charAt(0).toUpperCase()}</Text>
                            </View>
                          )}
                          <View style={{ marginLeft: 10 }}>
                            <Text style={[styles.wfUserName, { color: colors.text }]}>{displayName}</Text>
                            <Text style={styles.wfDateText}>{workout.dateLabel}</Text>
                          </View>
                        </View>

                        {/* 3-dots Menu Button */}
                        <TouchableOpacity
                          style={styles.wfDotsBtn}
                          onPress={() => {
                            setSelectedWorkout(workout)
                            setShowWorkoutActionModal(true)
                          }}
                          activeOpacity={0.7}
                        >
                          <MoreHorizontal size={18} color={isDark ? '#71717A' : '#94A3B8'} />
                        </TouchableOpacity>
                      </View>

                      {/* Workout Routine Title */}
                      <Text style={[styles.wfRoutineTitle, { color: colors.text }]}>{workout.routineName}</Text>

                      {/* Workout Metric Badges: Tiempo | Volumen | PRs */}
                      <View style={[styles.wfMetricsRow, { backgroundColor: isDark ? '#18181B' : colors.cardSubtle }]}>
                        <View style={styles.wfMetricItem}>
                          <Clock size={13} color="#71717A" />
                          <Text style={[styles.wfMetricValue, { color: colors.text }]}>{workout.durationFormatted}</Text>
                        </View>

                        <View style={styles.wfMetricDivider} />

                        <View style={styles.wfMetricItem}>
                          <Weight size={13} color="#71717A" />
                          <Text style={[styles.wfMetricValue, { color: colors.text }]}>
                            {workout.volumeKg.toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 1 })}{' '}
                            <Text style={{ fontSize: 11, color: '#71717A' }}>kg</Text>
                          </Text>
                        </View>

                        {workout.recordsCount > 0 && (
                          <>
                            <View style={styles.wfMetricDivider} />
                            <View style={styles.wfMetricItem}>
                              <Text style={{ fontSize: 12 }}>🥇</Text>
                              <Text style={[styles.wfMetricValue, { color: colors.text }]}>
                                {workout.recordsCount} {workout.recordsCount === 1 ? 'PR' : 'PRs'}
                              </Text>
                            </View>
                          </>
                        )}
                      </View>

                      {/* Divider */}
                      <View style={[styles.wfDivider, { backgroundColor: isDark ? '#27272A' : '#E2E8F0' }]} />

                      {/* Exercise Rows with Real Image Thumbnails */}
                      <View style={styles.wfExercisesContainer}>
                        {exercisesToDisplay.map((ex, i) => (
                          <WorkoutExerciseRow
                            key={i}
                            exerciseName={ex.name}
                            sets={ex.sets}
                            muscleGroup={ex.muscleGroup}
                            colors={colors}
                            isDark={isDark}
                          />
                        ))}
                      </View>

                      {/* Expand / Collapse Button if workout has > 3 exercises */}
                      {workout.exercises.length > 3 && (
                        <TouchableOpacity
                          style={[styles.wfExpandBtn, { borderTopColor: isDark ? '#1E1E24' : '#F1F5F9' }]}
                          onPress={() => toggleExpandWorkout(workout.id)}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.wfExpandBtnText}>
                            {isExpanded
                              ? 'Ver menos ejercicios'
                              : `+ Ver ${remainingCount} ejercicios más`}
                          </Text>
                          <ChevronDown
                            size={14}
                            color="#71717A"
                            style={{ transform: [{ rotate: isExpanded ? '180deg' : '0deg' }] }}
                          />
                        </TouchableOpacity>
                      )}
                    </View>
                  )
                })}
              </View>
            )}
          </View>
      </ScrollView>

      {/* ── POPUP MODAL: CALENDARIO (Matching Image Reference) ── */}
      <Modal
        visible={showCalendarModal}
        animationType="slide"
        onRequestClose={() => setShowCalendarModal(false)}
      >
        <View style={styles.calendarModalContainer}>
          {/* Top Bar Header */}
          <View style={styles.calendarModalTopBar}>
            <TouchableOpacity
              onPress={() => setShowCalendarModal(false)}
              style={styles.calendarModalIconBtn}
              activeOpacity={0.7}
            >
              <ArrowLeft size={22} color="#FFFFFF" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.calendarMonthDropdownBtn} activeOpacity={0.7}>
              <Text style={styles.calendarMonthDropdownText}>Month</Text>
              <ChevronDown size={16} color="#FFFFFF" />
            </TouchableOpacity>

            <View style={styles.calendarModalTopRightActions}>
              <TouchableOpacity
                style={styles.calendarModalIconBtn}
                onPress={handleShareCalendarSummary}
                activeOpacity={0.7}
              >
                <Share2 size={20} color="#FFFFFF" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.calendarModalIconBtn}
                onPress={() => setShowCalendarFilterModal(true)}
                activeOpacity={0.7}
              >
                <SlidersHorizontal size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Stats Bar: Racha & Días de descanso */}
          <View style={styles.calendarBannerRow}>
            <View style={styles.calendarBannerBox}>
              <Flame size={15} color="#F59E0B" />
              <Text style={styles.calendarBannerText}>
                {realStreakDays > 0
                  ? `Racha de ${realStreakDays} ${realStreakDays === 1 ? 'día' : 'días'}`
                  : 'Sin racha activa'}
              </Text>
            </View>
            <View style={styles.calendarBannerBox}>
              <Moon size={15} color="#38BDF8" />
              <Text style={styles.calendarBannerText}>
                0 días de descanso
              </Text>
            </View>
          </View>

          {/* Sticky Weekday Column Headers */}
          <View style={styles.calendarWeekdaysRow}>
            {weekdayLabels.map((w, idx) => (
              <Text key={idx} style={styles.calendarWeekdayColText}>
                {w}
              </Text>
            ))}
          </View>

          {/* Scrollable Calendar Body */}
          <ScrollView contentContainerStyle={styles.calendarModalScroll} showsVerticalScrollIndicator={false}>
            {calendarMonthsToRender.map((mObj, mIdx) => {
              // Calculate first day offset for this month
              const firstDayDate = new Date(mObj.year, mObj.month, 1)
              let offset = (firstDayDate.getDay() + 6) % 7 // Default Monday = 0
              if (firstDayOfWeek === 'sunday') {
                offset = firstDayDate.getDay() // Sunday = 0
              } else if (firstDayOfWeek === 'saturday') {
                offset = (firstDayDate.getDay() + 1) % 7 // Saturday = 0
              }

              return (
                <View key={mIdx} style={styles.calendarMonthSection}>
                  {/* Month Section Title */}
                  <Text style={styles.calendarSectionMonthName}>{mObj.name}</Text>

                  {/* Grid of Days */}
                  <View style={styles.calendarMonthGrid}>
                    {/* Leading empty cells */}
                    {Array.from({ length: offset }).map((_, i) => (
                      <View key={`empty-${mIdx}-${i}`} style={styles.calendarGridCell} />
                    ))}

                    {/* Month Days */}
                    {Array.from({ length: mObj.daysCount }).map((_, i) => {
                      const dayNum = i + 1
                      const dayStr = `${mObj.year}-${String(mObj.month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`
                      const dayWorkouts = workoutsByDate[dayStr] || []
                      const hasCompletedWorkout = dayWorkouts.length > 0
                      const weekdaySub = getWeekdayShortName(mObj.year, mObj.month, dayNum)

                      return (
                        <TouchableOpacity
                          key={`day-${mIdx}-${dayNum}`}
                          style={styles.calendarGridCell}
                          onPress={() => {
                            if (hasCompletedWorkout) {
                              setSelectedCalendarDay(dayStr)
                              setShowDayWorkoutsModal(true)
                            } else {
                              Alert.alert(
                                'Sin entrenamientos',
                                `El día ${dayNum} de ${monthNames[mObj.month]} fue un día de descanso.`
                              )
                            }
                          }}
                          activeOpacity={hasCompletedWorkout ? 0.75 : 1}
                        >
                          {hasCompletedWorkout ? (
                            <View style={styles.calendarActiveDayCircle}>
                              <Text style={styles.calendarActiveDayNumber}>{dayNum}</Text>
                              <Text style={styles.calendarActiveDaySub} numberOfLines={1}>
                                {weekdaySub}
                              </Text>
                            </View>
                          ) : (
                            <Text style={styles.calendarInactiveDayNumber}>{dayNum}</Text>
                          )}
                        </TouchableOpacity>
                      )
                    })}
                  </View>
                </View>
              )
            })}
          </ScrollView>
        </View>
      </Modal>

      {/* ── MODAL: Configuración del Calendario ("La semana comienza el...") ── */}
      <Modal
        visible={showCalendarFilterModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCalendarFilterModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowCalendarFilterModal(false)}
        >
          <View style={[styles.filterActionSheet, { backgroundColor: '#141414' }]}>
            <View style={styles.modalHandle} />
            <Text style={styles.filterSheetTitle}>La semana del calendario comienza el...</Text>
            <Text style={styles.filterSheetSub}>
              Esto cambiará el primer día de la semana en tu calendario y gráficos.
            </Text>

            <TouchableOpacity
              style={styles.filterOptionItem}
              onPress={() => handleSetFirstDayOfWeek('monday')}
            >
              <Text style={styles.filterOptionText}>Lunes</Text>
              {firstDayOfWeek === 'monday' && <Check size={18} color="#38BDF8" />}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.filterOptionItem}
              onPress={() => handleSetFirstDayOfWeek('sunday')}
            >
              <Text style={styles.filterOptionText}>Domingo</Text>
              {firstDayOfWeek === 'sunday' && <Check size={18} color="#38BDF8" />}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterOptionItem, { borderBottomWidth: 0 }]}
              onPress={() => handleSetFirstDayOfWeek('saturday')}
            >
              <Text style={styles.filterOptionText}>Sábado</Text>
              {firstDayOfWeek === 'saturday' && <Check size={18} color="#38BDF8" />}
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── MODAL: Detalles del Entrenamiento al Pulsar un Día ── */}
      <Modal
        visible={showDayWorkoutsModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDayWorkoutsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { maxHeight: '80%', backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.modalHandle} />
            <View style={styles.settingsHeaderRow}>
              <View>
                <Text style={[styles.settingsTitle, { color: colors.text }]}>Entrenamientos Realizados</Text>
                <Text style={styles.popupSubTitle}>Fecha: {selectedCalendarDay}</Text>
              </View>
              <TouchableOpacity onPress={() => setShowDayWorkoutsModal(false)}>
                <X size={20} color="rgba(255,255,255,0.5)" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ marginVertical: 6 }}>
              {selectedDayWorkouts.map((w) => (
                <View key={w.id} style={[styles.pastWorkoutCard, { backgroundColor: colors.cardSubtle, borderColor: colors.border, marginBottom: 12 }]}>
                  <View style={styles.pwHeader}>
                    <View style={styles.pwAvatarCircle}>
                      <Text style={styles.pwAvatarInitial}>{displayName.charAt(0).toUpperCase()}</Text>
                    </View>
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={[styles.pwUserName, { color: colors.text }]}>{w.routineName}</Text>
                      <Text style={styles.pwDateText}>{w.durationFormatted} · {w.volumeKg} kg levantados</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.pwDotsBtn}
                      onPress={() => {
                        setSelectedWorkout(w)
                        setShowWorkoutActionModal(true)
                      }}
                    >
                      <MoreHorizontal size={18} color="rgba(255,255,255,0.6)" />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.pwDivider} />

                  <View style={styles.pwExercisesList}>
                    {w.exercises.map((ex, i) => (
                      <View key={i} style={styles.pwExerciseRow}>
                        <ExerciseMiniIcon muscleGroup={ex.muscleGroup} />
                        <Text style={[styles.pwExerciseText, { color: colors.text }]}>
                          {ex.sets} {ex.sets === 1 ? 'serie' : 'series'} {ex.name}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── POPUP: Seleccionar Ejercicio Completado (con Récords) ── */}
      <Modal
        visible={showExerciseSelectorModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowExerciseSelectorModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { maxHeight: '88%', backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.modalHandle} />
            <View style={styles.settingsHeaderRow}>
              <View>
                <Text style={[styles.settingsTitle, { color: colors.text }]}>Ejercicios Completados</Text>
                <Text style={styles.popupSubTitle}>Ordenados desde el más reciente</Text>
              </View>
              <TouchableOpacity onPress={() => setShowExerciseSelectorModal(false)}>
                <X size={20} color="rgba(255,255,255,0.5)" />
              </TouchableOpacity>
            </View>

            {/* Search Box inside Popup */}
            <View style={[styles.searchBoxRow, { backgroundColor: colors.cardSubtle, borderColor: colors.border, marginBottom: 12 }]}>
              <Search size={16} color="rgba(255,255,255,0.4)" />
              <TextInput
                style={[styles.searchInput, { color: colors.text }]}
                placeholder="Buscar ejercicio completado..."
                placeholderTextColor="rgba(255,255,255,0.3)"
                value={exerciseSearchQuery}
                onChangeText={setExerciseSearchQuery}
              />
              {exerciseSearchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setExerciseSearchQuery('')}>
                  <X size={15} color="rgba(255,255,255,0.4)" />
                </TouchableOpacity>
              )}
            </View>

            {/* List of completed exercises */}
            <ScrollView showsVerticalScrollIndicator={false} style={{ marginVertical: 4 }}>
              <View style={{ gap: 8 }}>
                {filteredCompletedExercises.map((item) => (
                  <TouchableOpacity
                    key={item.exercise.id}
                    style={[styles.exercisePopupItemCard, { backgroundColor: colors.cardSubtle, borderColor: colors.border }]}
                    onPress={() => {
                      setShowExerciseSelectorModal(false)
                      setActiveExerciseForPR(item.exercise)
                    }}
                    activeOpacity={0.8}
                  >
                    <ExerciseIllustration
                      exerciseId={item.exercise.id}
                      exerciseName={item.exercise.name}
                      imageUrl={item.exercise.imageUrl}
                      size={46}
                      variant="circle-thumb"
                    />

                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={[styles.exerciseItemName, { color: colors.text }]} numberOfLines={1}>
                        {item.exercise.name}
                      </Text>
                      <View style={styles.exerciseItemBadgeRow}>
                        <Text style={styles.exercisePopupMuscleBadge}>{item.exercise.muscleGroup}</Text>
                        <Text style={styles.exercisePopupDateBadge}>Último: {item.lastCompletedDate}</Text>
                      </View>
                      <Text style={styles.exercisePopupStatsText}>
                        Máx: <Text style={{ color: '#FFFFFF', fontWeight: '800' }}>{item.exercise.records.maxWeight} kg</Text> · 1RM: <Text style={{ color: '#38BDF8', fontWeight: '800' }}>{item.exercise.records.oneRepMax}</Text>
                      </Text>
                    </View>

                    <ChevronRight size={18} color="#38BDF8" />
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Workout Action Menu Modal (Compartir, Editar, Borrar) ── */}
      <Modal
        visible={showWorkoutActionModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowWorkoutActionModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowWorkoutActionModal(false)}
        >
          <View style={[styles.actionSheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.modalHandle} />
            <Text style={[styles.actionSheetTitle, { color: colors.text }]} numberOfLines={1}>
              {selectedWorkout?.routineName}
            </Text>

            <TouchableOpacity
              style={styles.actionSheetItem}
              onPress={() => {
                if (selectedWorkout) {
                  setShowWorkoutActionModal(false)
                  handleShareWorkout(selectedWorkout)
                }
              }}
            >
              <Share2 size={18} color="#38BDF8" />
              <Text style={styles.actionSheetItemText}>Compartir entrenamiento</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionSheetItem}
              onPress={() => {
                if (selectedWorkout) {
                  handleOpenEditWorkout(selectedWorkout)
                }
              }}
            >
              <Edit3 size={18} color="#60A5FA" />
              <Text style={styles.actionSheetItemText}>Editar entrenamiento</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionSheetItem, { borderBottomWidth: 0 }]}
              onPress={() => {
                if (selectedWorkout) {
                  handleDeleteWorkout(selectedWorkout)
                }
              }}
            >
              <Trash2 size={18} color="#EF4444" />
              <Text style={[styles.actionSheetItemText, { color: '#EF4444' }]}>Borrar entrenamiento</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── Edit Workout Modal ── */}
      <Modal
        visible={showEditWorkoutModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowEditWorkoutModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.modalHandle} />
            <View style={styles.settingsHeaderRow}>
              <Text style={[styles.settingsTitle, { color: colors.text }]}>Editar Entrenamiento</Text>
              <TouchableOpacity onPress={() => setShowEditWorkoutModal(false)}>
                <X size={20} color="rgba(255,255,255,0.5)" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>NOMBRE DE RUTINA / SESIÓN</Text>
                <TextInput
                  style={[styles.regularInput, { backgroundColor: colors.cardSubtle, color: colors.text }]}
                  value={editRoutineName}
                  onChangeText={setEditRoutineName}
                />
              </View>

              <View style={styles.formRow}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>DURACIÓN (MIN)</Text>
                  <TextInput
                    style={[styles.regularInput, { backgroundColor: colors.cardSubtle, color: colors.text }]}
                    value={editDuration}
                    onChangeText={setEditDuration}
                    keyboardType="number-pad"
                  />
                </View>

                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>VOLUMEN (KG)</Text>
                  <TextInput
                    style={[styles.regularInput, { backgroundColor: colors.cardSubtle, color: colors.text }]}
                    value={editVolume}
                    onChangeText={setEditVolume}
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>FECHA (YYYY-MM-DD)</Text>
                <TextInput
                  style={[styles.regularInput, { backgroundColor: colors.cardSubtle, color: colors.text }]}
                  value={editDate}
                  onChangeText={setEditDate}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>NOTAS / COMENTARIOS</Text>
                <TextInput
                  style={[styles.regularInput, { backgroundColor: colors.cardSubtle, color: colors.text, minHeight: 60 }]}
                  value={editNotes}
                  onChangeText={setEditNotes}
                  multiline
                />
              </View>

              <TouchableOpacity
                style={styles.saveProfileBtn}
                onPress={handleSaveEditedWorkout}
                activeOpacity={0.85}
              >
                <Text style={styles.saveProfileBtnText}>GUARDAR CAMBIOS</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── POPUP MODAL: MEDIDAS CORPORALES ── */}
      <Modal
        visible={showMeasuresModal}
        animationType="slide"
        onRequestClose={() => setShowMeasuresModal(false)}
      >
        <View style={[styles.measuresModalContainer, { backgroundColor: colors.background }]}>
          {/* Top Bar Header */}
          <View style={[styles.measuresModalTopBar, { backgroundColor: colors.background, borderBottomColor: isDark ? '#27272A' : colors.border }]}>
            <TouchableOpacity
              onPress={() => setShowMeasuresModal(false)}
              style={styles.measuresModalIconBtn}
              activeOpacity={0.7}
            >
              <ArrowLeft size={22} color={colors.text} />
            </TouchableOpacity>

            <Text style={[styles.measuresModalTitle, { color: colors.text }]}>Medidas Corporales</Text>

            <TouchableOpacity
              style={styles.measuresModalAddBtn}
              onPress={() => setShowAddMeasureModal(true)}
              activeOpacity={0.8}
            >
              <Plus size={15} color="#FFFFFF" strokeWidth={2.5} />
              <Text style={styles.measuresModalAddBtnText}>AÑADIR</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.measuresModalContent} showsVerticalScrollIndicator={false}>
            {/* Latest Measurement Big Summary Card */}
            {latestMeasurement ? (
              <View style={[styles.card, { backgroundColor: isDark ? '#121215' : colors.card, borderColor: isDark ? '#27272A' : colors.border }]}>
                <View style={styles.cardHeaderRow}>
                  <Text style={styles.cardTitle}>ÚLTIMO REGISTRO ({latestMeasurement.date})</Text>
                </View>

                <View style={styles.measuresGrid}>
                  <View style={[styles.measureGridItem, { backgroundColor: isDark ? '#18181B' : colors.cardSubtle }]}>
                    <Text style={styles.measureItemLabel}>PESO</Text>
                    <Text style={[styles.measureItemVal, { color: colors.text }]}>
                      {latestMeasurement.weightKg || '--'} <Text style={styles.measureItemUnit}>kg</Text>
                    </Text>
                  </View>

                  <View style={[styles.measureGridItem, { backgroundColor: isDark ? '#18181B' : colors.cardSubtle }]}>
                    <Text style={styles.measureItemLabel}>PECHO</Text>
                    <Text style={[styles.measureItemVal, { color: colors.text }]}>
                      {latestMeasurement.chestCm || '--'} <Text style={styles.measureItemUnit}>cm</Text>
                    </Text>
                  </View>

                  <View style={[styles.measureGridItem, { backgroundColor: isDark ? '#18181B' : colors.cardSubtle }]}>
                    <Text style={styles.measureItemLabel}>CINTURA</Text>
                    <Text style={[styles.measureItemVal, { color: colors.text }]}>
                      {latestMeasurement.waistCm || '--'} <Text style={styles.measureItemUnit}>cm</Text>
                    </Text>
                  </View>

                  <View style={[styles.measureGridItem, { backgroundColor: isDark ? '#18181B' : colors.cardSubtle }]}>
                    <Text style={styles.measureItemLabel}>CADERA</Text>
                    <Text style={[styles.measureItemVal, { color: colors.text }]}>
                      {latestMeasurement.hipsCm || '--'} <Text style={styles.measureItemUnit}>cm</Text>
                    </Text>
                  </View>

                  <View style={[styles.measureGridItem, { backgroundColor: isDark ? '#18181B' : colors.cardSubtle }]}>
                    <Text style={styles.measureItemLabel}>BÍCEPS</Text>
                    <Text style={[styles.measureItemVal, { color: colors.text }]}>
                      {latestMeasurement.bicepsCm || '--'} <Text style={styles.measureItemUnit}>cm</Text>
                    </Text>
                  </View>

                  <View style={[styles.measureGridItem, { backgroundColor: isDark ? '#18181B' : colors.cardSubtle }]}>
                    <Text style={styles.measureItemLabel}>MUSLO</Text>
                    <Text style={[styles.measureItemVal, { color: colors.text }]}>
                      {latestMeasurement.thighCm || '--'} <Text style={styles.measureItemUnit}>cm</Text>
                    </Text>
                  </View>
                </View>
              </View>
            ) : (
              <View style={[styles.emptyWorkoutCard, { backgroundColor: isDark ? '#121215' : colors.card, borderColor: isDark ? '#27272A' : colors.border }]}>
                <Ruler size={32} color="#38BDF8" />
                <Text style={[styles.emptyWorkoutTitle, { color: colors.text }]}>Sin medidas registradas</Text>
                <Text style={styles.emptyWorkoutSub}>
                  Registra tu peso, cintura, pecho y otras medidas para monitorizar tu evolución corporal.
                </Text>
                <TouchableOpacity
                  style={styles.startFirstWorkoutBtn}
                  onPress={() => setShowAddMeasureModal(true)}
                  activeOpacity={0.85}
                >
                  <Plus size={15} color="#FFFFFF" strokeWidth={2.5} />
                  <Text style={styles.startFirstWorkoutBtnText}>REGISTRAR PRIMERA MEDIDA</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Measurement History List */}
            {measurements.length > 0 && (
              <View style={styles.measurementHistoryList}>
                <Text style={[styles.historySubTitle, { color: colors.textSecondary }]}>Historial de Registros</Text>
                {measurements.map((m) => (
                  <View key={m.id} style={[styles.measurementHistoryRow, { backgroundColor: isDark ? '#121215' : colors.card, borderColor: isDark ? '#27272A' : colors.border }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.measureHistDate, { color: colors.text }]}>{m.date}</Text>
                      <Text style={styles.measureHistSummary}>
                        Peso: {m.weightKg || '--'} kg · Pecho: {m.chestCm || '--'} cm · Cintura: {m.waistCm || '--'} cm
                      </Text>
                      {m.notes && <Text style={styles.measureHistNotes}>{m.notes}</Text>}
                    </View>
                    <TouchableOpacity
                      onPress={() => deleteMeasurement(m.id)}
                      style={styles.deleteMeasureBtn}
                      activeOpacity={0.7}
                    >
                      <Trash2 size={16} color="rgba(255,255,255,0.4)" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>

      {/* ── Add Measurement Modal ── */}
      <Modal
        visible={showAddMeasureModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddMeasureModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.modalHandle} />
            <View style={styles.settingsHeaderRow}>
              <Text style={[styles.settingsTitle, { color: colors.text }]}>Nueva Medida Corporal</Text>
              <TouchableOpacity onPress={() => setShowAddMeasureModal(false)}>
                <X size={20} color="rgba(255,255,255,0.5)" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>FECHA (YYYY-MM-DD)</Text>
                <TextInput
                  style={[styles.regularInput, { backgroundColor: colors.cardSubtle, color: colors.text }]}
                  value={newMeasureDate}
                  onChangeText={setNewMeasureDate}
                />
              </View>

              <View style={styles.formRow}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>PESO (KG)</Text>
                  <TextInput
                    style={[styles.regularInput, { backgroundColor: colors.cardSubtle, color: colors.text }]}
                    value={newWeight}
                    onChangeText={setNewWeight}
                    keyboardType="decimal-pad"
                  />
                </View>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>PECHO (CM)</Text>
                  <TextInput
                    style={[styles.regularInput, { backgroundColor: colors.cardSubtle, color: colors.text }]}
                    value={newChest}
                    onChangeText={setNewChest}
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>

              <View style={styles.formRow}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>CINTURA (CM)</Text>
                  <TextInput
                    style={[styles.regularInput, { backgroundColor: colors.cardSubtle, color: colors.text }]}
                    value={newWaist}
                    onChangeText={setNewWaist}
                    keyboardType="decimal-pad"
                  />
                </View>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>CADERA (CM)</Text>
                  <TextInput
                    style={[styles.regularInput, { backgroundColor: colors.cardSubtle, color: colors.text }]}
                    value={newHips}
                    onChangeText={setNewHips}
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>

              <View style={styles.formRow}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>BÍCEPS (CM)</Text>
                  <TextInput
                    style={[styles.regularInput, { backgroundColor: colors.cardSubtle, color: colors.text }]}
                    value={newBiceps}
                    onChangeText={setNewBiceps}
                    keyboardType="decimal-pad"
                  />
                </View>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>MUSLO (CM)</Text>
                  <TextInput
                    style={[styles.regularInput, { backgroundColor: colors.cardSubtle, color: colors.text }]}
                    value={newThigh}
                    onChangeText={setNewThigh}
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>

              <TouchableOpacity
                style={styles.saveProfileBtn}
                onPress={handleSaveMeasurement}
                activeOpacity={0.85}
              >
                <Text style={styles.saveProfileBtnText}>REGISTRAR MEDIDA</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Settings Modal (Ajustes de Cuenta, Notificaciones y Preferencias) ── */}
      <Modal
        visible={showSettingsModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSettingsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.modalHandle} />
            
            <View style={styles.settingsHeaderRow}>
              <Text style={[styles.settingsTitle, { color: colors.text }]}>{t('account_settings')}</Text>
              <TouchableOpacity
                onPress={() => setShowSettingsModal(false)}
                style={styles.modalCloseIconBtn}
              >
                <X size={20} color="rgba(255,255,255,0.5)" />
              </TouchableOpacity>
            </View>

            {/* Settings Navigation Chips */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.settingsNavRow}>
              <TouchableOpacity
                style={[styles.settingsNavChip, activeSettingsSection === 'profile' && styles.settingsNavChipActive]}
                onPress={() => setActiveSettingsSection('profile')}
              >
                <UserIcon size={14} color={activeSettingsSection === 'profile' ? '#FFFFFF' : 'rgba(255,255,255,0.5)'} />
                <Text style={[styles.settingsNavChipText, activeSettingsSection === 'profile' && styles.settingsNavChipTextActive]}>
                  Perfil
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.settingsNavChip, activeSettingsSection === 'account' && styles.settingsNavChipActive]}
                onPress={() => setActiveSettingsSection('account')}
              >
                <Key size={14} color={activeSettingsSection === 'account' ? '#FFFFFF' : 'rgba(255,255,255,0.5)'} />
                <Text style={[styles.settingsNavChipText, activeSettingsSection === 'account' && styles.settingsNavChipTextActive]}>
                  Cuenta
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.settingsNavChip, activeSettingsSection === 'notifications' && styles.settingsNavChipActive]}
                onPress={() => setActiveSettingsSection('notifications')}
              >
                <Bell size={14} color={activeSettingsSection === 'notifications' ? '#FFFFFF' : 'rgba(255,255,255,0.5)'} />
                <Text style={[styles.settingsNavChipText, activeSettingsSection === 'notifications' && styles.settingsNavChipTextActive]}>
                  Notificaciones
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.settingsNavChip, activeSettingsSection === 'preferences' && styles.settingsNavChipActive]}
                onPress={() => setActiveSettingsSection('preferences')}
              >
                <Globe size={14} color={activeSettingsSection === 'preferences' ? '#FFFFFF' : 'rgba(255,255,255,0.5)'} />
                <Text style={[styles.settingsNavChipText, activeSettingsSection === 'preferences' && styles.settingsNavChipTextActive]}>
                  Preferencias
                </Text>
              </TouchableOpacity>
            </ScrollView>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.settingsScrollView}>
              {/* SECTION 1: PERFIL */}
              {activeSettingsSection === 'profile' && (
                <View style={[styles.settingsCardSection, { backgroundColor: colors.cardSubtle, borderColor: colors.border }]}>
                  <Text style={styles.settingsSectionTitle}>DATOS PERSONALES & FÍSICOS</Text>

                  {/* Avatar Picker Row in Settings */}
                  <View style={styles.settingsAvatarRow}>
                    <TouchableOpacity onPress={handlePickAvatar} activeOpacity={0.8} style={styles.settingsAvatarCircle}>
                      {avatarUrl ? (
                        <Image source={{ uri: avatarUrl }} style={styles.settingsAvatarImg} />
                      ) : (
                        <View style={[styles.avatarInner, { backgroundColor: isDark ? '#1E293B' : '#E2E8F0' }]}>
                          <Text style={styles.avatarInitial}>{displayName.charAt(0).toUpperCase()}</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                    <View style={{ flex: 1, gap: 4 }}>
                      <Text style={[styles.settingsAvatarLabel, { color: colors.text }]}>Foto de Perfil</Text>
                      <TouchableOpacity onPress={handlePickAvatar} style={styles.changePhotoBtn}>
                        <Camera size={13} color="#38BDF8" />
                        <Text style={styles.changePhotoBtnText}>Cambiar foto</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Name Input */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>NOMBRE</Text>
                    <TextInput
                      style={[styles.regularInput, { color: colors.text }]}
                      value={name}
                      onChangeText={setName}
                      placeholder="Tu nombre"
                      placeholderTextColor="rgba(255,255,255,0.3)"
                    />
                  </View>

                  {/* Biological Sex */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>SEXO</Text>
                    <View style={styles.genderRow}>
                      {(['male', 'female', 'other'] as const).map((g) => (
                        <TouchableOpacity
                          key={g}
                          onPress={() => setGender(g)}
                          style={[
                            styles.genderBtn,
                            gender === g && styles.genderBtnActive,
                          ]}
                          activeOpacity={0.8}
                        >
                          <Text
                            style={[
                              styles.genderBtnText,
                              gender === g && styles.genderBtnTextActive,
                            ]}
                          >
                            {g === 'male' ? 'Hombre' : g === 'female' ? 'Mujer' : 'Otro'}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  {/* Birthdate, Weight, Height */}
                  <View style={styles.threeInputsRow}>
                    <View style={{ flex: 1.2 }}>
                      <Text style={styles.inputLabel}>CUMPLEAÑOS</Text>
                      <TouchableOpacity
                        style={[styles.smallInput, styles.datePickerBtn, { borderColor: colors.border }]}
                        onPress={() => {
                          const parts = (birthDate || '1998-01-01').split('-')
                          setTempBirthYear(parseInt(parts[0], 10) || 1998)
                          setTempBirthMonth(parseInt(parts[1], 10) || 1)
                          setTempBirthDay(parseInt(parts[2], 10) || 1)
                          setShowBirthDatePickerModal(true)
                        }}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.datePickerBtnText, { color: colors.text }]} numberOfLines={1}>
                          {birthDate || 'Elegir'}
                        </Text>
                        <CalendarIcon size={14} color="#38BDF8" />
                      </TouchableOpacity>
                    </View>

                    <View style={{ flex: 0.9 }}>
                      <Text style={styles.inputLabel}>PESO (KG)</Text>
                      <TextInput
                        style={[styles.smallInput, { color: colors.text }]}
                        value={weightKg}
                        onChangeText={setWeightKg}
                        keyboardType="decimal-pad"
                        placeholder="Ej. 61"
                        placeholderTextColor="rgba(255,255,255,0.3)"
                      />
                    </View>

                    <View style={{ flex: 0.9 }}>
                      <Text style={styles.inputLabel}>ALTURA (CM)</Text>
                      <TextInput
                        style={[styles.smallInput, { color: colors.text }]}
                        value={heightCm}
                        onChangeText={setHeightCm}
                        keyboardType="decimal-pad"
                        placeholder="Ej. 175"
                        placeholderTextColor="rgba(255,255,255,0.3)"
                      />
                    </View>
                  </View>

                  {/* Experience Level Selector */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>NIVEL DE EXPERIENCIA EN GIMNASIO</Text>
                    <View style={styles.goalsGrid}>
                      {EXPERIENCE_OPTIONS.map((e) => (
                        <TouchableOpacity
                          key={e.value}
                          onPress={() => setExperienceLevel(e.value)}
                          style={[
                            styles.goalOptionBtn,
                            experienceLevel === e.value && styles.goalOptionBtnActive,
                          ]}
                          activeOpacity={0.8}
                        >
                          <Text
                            style={[
                              styles.goalOptionTitle,
                              experienceLevel === e.value && styles.goalOptionTitleActive,
                            ]}
                          >
                            {e.label}
                          </Text>
                          <Text
                            style={[
                              styles.goalOptionDesc,
                              experienceLevel === e.value && styles.goalOptionDescActive,
                            ]}
                          >
                            {e.desc}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  {/* Goal Selector */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>OBJETIVO</Text>
                    <View style={styles.goalsGrid}>
                      {GOAL_OPTIONS.map((g) => (
                        <TouchableOpacity
                          key={g.value}
                          onPress={() => setGoal(g.value)}
                          style={[
                            styles.goalOptionBtn,
                            goal === g.value && styles.goalOptionBtnActive,
                          ]}
                          activeOpacity={0.8}
                        >
                          <Text
                            style={[
                              styles.goalOptionTitle,
                              goal === g.value && styles.goalOptionTitleActive,
                            ]}
                          >
                            {g.label}
                          </Text>
                          <Text
                            style={[
                              styles.goalOptionDesc,
                              goal === g.value && styles.goalOptionDescActive,
                            ]}
                          >
                            {g.desc}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  {/* Save Profile Button */}
                  <TouchableOpacity
                    style={styles.saveProfileBtn}
                    onPress={handleSaveProfile}
                    disabled={saving}
                    activeOpacity={0.85}
                  >
                    {saving ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <Text style={styles.saveProfileBtnText}>
                        {saveSuccess ? '✓ CAMBIOS GUARDADOS' : 'GUARDAR CAMBIOS'}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}

              {/* SECTION 2: CUENTA & SEGURIDAD */}
              {activeSettingsSection === 'account' && (
                <View style={[styles.settingsCardSection, { backgroundColor: colors.cardSubtle, borderColor: colors.border }]}>
                  <Text style={styles.settingsSectionTitle}>GESTIÓN DE CUENTA</Text>

                  {/* Change Username */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>CAMBIAR NOMBRE DE USUARIO</Text>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <TextInput
                        style={[styles.regularInput, { flex: 1, color: colors.text }]}
                        value={newUsername}
                        onChangeText={setNewUsername}
                        placeholder="Nuevo nombre"
                        placeholderTextColor="rgba(255,255,255,0.3)"
                      />
                      <TouchableOpacity
                        style={styles.smallActionBtn}
                        onPress={handleUpdateUsername}
                        disabled={updatingAccount}
                      >
                        <Text style={styles.smallActionBtnText}>Guardar</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Change Email */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>CAMBIAR EMAIL</Text>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <TextInput
                        style={[styles.regularInput, { flex: 1, color: colors.text }]}
                        value={newEmail}
                        onChangeText={setNewEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        placeholder="nuevo@email.com"
                        placeholderTextColor="rgba(255,255,255,0.3)"
                      />
                      <TouchableOpacity
                        style={styles.smallActionBtn}
                        onPress={handleUpdateEmail}
                        disabled={updatingAccount}
                      >
                        <Text style={styles.smallActionBtnText}>Actualizar</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Update Password */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>ACTUALIZAR CONTRASEÑA</Text>
                    <TextInput
                      style={[styles.regularInput, { color: colors.text, marginBottom: 8 }]}
                      value={newPassword}
                      onChangeText={setNewPassword}
                      secureTextEntry
                      placeholder="Nueva contraseña (mín. 6 caracteres)"
                      placeholderTextColor="rgba(255,255,255,0.3)"
                    />
                    <TextInput
                      style={[styles.regularInput, { color: colors.text, marginBottom: 8 }]}
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      secureTextEntry
                      placeholder="Confirmar nueva contraseña"
                      placeholderTextColor="rgba(255,255,255,0.3)"
                    />
                    <TouchableOpacity
                      style={[styles.saveProfileBtn, { marginTop: 0 }]}
                      onPress={handleUpdatePassword}
                      disabled={updatingAccount}
                    >
                      <Text style={styles.saveProfileBtnText}>CAMBIAR CONTRASEÑA</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* SECTION 3: NOTIFICACIONES */}
              {activeSettingsSection === 'notifications' && (
                <View style={[styles.settingsCardSection, { backgroundColor: colors.cardSubtle, borderColor: colors.border }]}>
                  <Text style={styles.settingsSectionTitle}>RECORDATORIOS Y ALERTAS</Text>

                  <View style={styles.notificationToggleRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.notifTitle, { color: colors.text }]}>Recordatorio de Entrenamiento</Text>
                      <Text style={styles.notifDesc}>Notificación diaria para mantener tu racha</Text>
                    </View>
                    <Switch
                      value={workoutReminders}
                      onValueChange={setWorkoutReminders}
                      trackColor={{ false: '#333333', true: '#0284C7' }}
                      thumbColor={workoutReminders ? '#38BDF8' : '#888888'}
                    />
                  </View>

                  <View style={styles.notificationToggleRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.notifTitle, { color: colors.text }]}>Recordatorio de Comidas</Text>
                      <Text style={styles.notifDesc}>Alertas para registrar tus comidas diarias</Text>
                    </View>
                    <Switch
                      value={mealReminders}
                      onValueChange={setMealReminders}
                      trackColor={{ false: '#333333', true: '#0284C7' }}
                      thumbColor={mealReminders ? '#38BDF8' : '#888888'}
                    />
                  </View>

                  <View style={styles.notificationToggleRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.notifTitle, { color: colors.text }]}>Recordatorio de Hidratación</Text>
                      <Text style={styles.notifDesc}>Recordatorio para beber agua durante el día</Text>
                    </View>
                    <Switch
                      value={waterReminders}
                      onValueChange={setWaterReminders}
                      trackColor={{ false: '#333333', true: '#0284C7' }}
                      thumbColor={waterReminders ? '#38BDF8' : '#888888'}
                    />
                  </View>

                  <View style={styles.notificationToggleRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.notifTitle, { color: colors.text }]}>Resumen Semanal de Progreso</Text>
                      <Text style={styles.notifDesc}>Informe de volumen y récords cada domingo</Text>
                    </View>
                    <Switch
                      value={weeklySummary}
                      onValueChange={setWeeklySummary}
                      trackColor={{ false: '#333333', true: '#0284C7' }}
                      thumbColor={weeklySummary ? '#38BDF8' : '#888888'}
                    />
                  </View>
                </View>
              )}

              {/* SECTION 4: PREFERENCIAS (Idioma, Tema, Exportar/Importar) */}
              {activeSettingsSection === 'preferences' && (
                <View style={[styles.settingsCardSection, { backgroundColor: colors.cardSubtle, borderColor: colors.border }]}>
                  <Text style={styles.settingsSectionTitle}>APARIENCIA & DATOS</Text>

                  {/* Theme Selector */}
                  <View style={styles.preferenceRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      {isDark ? <Moon size={20} color="#38BDF8" /> : <Sun size={20} color="#F59E0B" />}
                      <Text style={[styles.preferenceLabel, { color: colors.text }]}>Tema de la Aplicación</Text>
                    </View>

                    <View style={styles.themeToggleRow}>
                      <TouchableOpacity
                        style={[styles.themePillBtn, isDark && styles.themePillBtnActive]}
                        onPress={() => setMode('dark')}
                      >
                        <Text style={[styles.themePillText, isDark && styles.themePillTextActive]}>Oscuro</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.themePillBtn, !isDark && styles.themePillBtnActive]}
                        onPress={() => setMode('light')}
                      >
                        <Text style={[styles.themePillText, !isDark && styles.themePillTextActive]}>Claro</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Change Language Button */}
                  <TouchableOpacity
                    style={styles.settingsItemBtn}
                    onPress={() => {
                      setShowSettingsModal(false)
                      setShowLanguageModal(true)
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <Globe size={20} color="#38BDF8" strokeWidth={2} />
                      <Text style={[styles.settingsItemText, { color: colors.text }]}>{t('change_language')}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={{ fontSize: 16 }}>
                        {SUPPORTED_LANGUAGES.find((l) => l.code === language)?.flag || '🇪🇸'}
                      </Text>
                      <ChevronRight size={16} color="rgba(255,255,255,0.4)" />
                    </View>
                  </TouchableOpacity>

                  {/* Export App Data */}
                  <TouchableOpacity
                    style={styles.settingsItemBtn}
                    onPress={handleExportData}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <Download size={20} color="#10B981" strokeWidth={2} />
                      <Text style={[styles.settingsItemText, { color: colors.text }]}>Exportar datos (JSON)</Text>
                    </View>
                    <ChevronRight size={16} color="rgba(255,255,255,0.4)" />
                  </TouchableOpacity>

                  {/* Import App Data */}
                  <TouchableOpacity
                    style={styles.settingsItemBtn}
                    onPress={() => {
                      setShowSettingsModal(false)
                      setShowImportModal(true)
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <Upload size={20} color="#F59E0B" strokeWidth={2} />
                      <Text style={[styles.settingsItemText, { color: colors.text }]}>Importar datos (JSON)</Text>
                    </View>
                    <ChevronRight size={16} color="rgba(255,255,255,0.4)" />
                  </TouchableOpacity>

                  {/* Sign Out */}
                  <TouchableOpacity
                    style={[styles.settingsItemBtn, { borderBottomWidth: 0, marginTop: 10 }]}
                    onPress={() => {
                      setShowSettingsModal(false)
                      signOut()
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <LogOut size={20} color="#EF4444" strokeWidth={2} />
                      <Text style={styles.signOutText}>{t('sign_out')}</Text>
                    </View>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Import JSON Modal ── */}
      <Modal
        visible={showImportModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowImportModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.modalHandle} />
            <View style={styles.settingsHeaderRow}>
              <Text style={[styles.settingsTitle, { color: colors.text }]}>Importar Datos (JSON)</Text>
              <TouchableOpacity onPress={() => setShowImportModal(false)}>
                <X size={20} color="rgba(255,255,255,0.5)" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubInstruction}>
              Pega aquí el contenido del archivo JSON exportado previamente para restaurar tus medidas y entrenamientos.
            </Text>

            <TextInput
              style={[styles.regularInput, { backgroundColor: colors.cardSubtle, color: colors.text, height: 160, textAlignVertical: 'top' }]}
              value={importJsonText}
              onChangeText={setImportJsonText}
              multiline
              placeholder='{"version": "1.0.0", "bodyMeasurements": [...]}'
              placeholderTextColor="rgba(255,255,255,0.3)"
            />

            <TouchableOpacity
              style={styles.saveProfileBtn}
              onPress={handleImportData}
              activeOpacity={0.85}
            >
              <Text style={styles.saveProfileBtnText}>IMPORTAR DATOS</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Language Selector Modal ── */}
      <Modal
        visible={showLanguageModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowLanguageModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { maxHeight: '80%', backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.modalHandle} />
            <Text style={[styles.settingsTitle, { color: colors.text }]}>{t('change_language')}</Text>

            <ScrollView showsVerticalScrollIndicator={false} style={{ marginVertical: 10 }}>
              {SUPPORTED_LANGUAGES.map((langItem) => {
                const isSelected = language === langItem.code
                return (
                  <TouchableOpacity
                    key={langItem.code}
                    style={[
                      styles.languageOptionRow,
                      isSelected && styles.languageOptionRowActive,
                    ]}
                    onPress={() => {
                      setLanguage(langItem.code)
                      setShowLanguageModal(false)
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <Text style={{ fontSize: 24 }}>{langItem.flag}</Text>
                      <View>
                        <Text style={[styles.langLabelText, isSelected && { color: '#38BDF8', fontWeight: '700' }]}>
                          {langItem.nameNative}
                        </Text>
                        <Text style={styles.langSubText}>{langItem.label}</Text>
                      </View>
                    </View>

                    {isSelected && <Check size={18} color="#38BDF8" strokeWidth={2.5} />}
                  </TouchableOpacity>
                )
              })}
            </ScrollView>

            <TouchableOpacity
              style={styles.closeSettingsBtn}
              onPress={() => setShowLanguageModal(false)}
            >
              <Text style={styles.closeSettingsBtnText}>{t('ready')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Exercise Detail / PR Modal ── */}
      {activeExerciseForPR && (
        <ExerciseProgressView
          exercise={activeExerciseForPR}
          visible={!!activeExerciseForPR}
          onClose={() => setActiveExerciseForPR(null)}
        />
      )}

      {/* ── MODAL: Selector de Cumpleaños Interactivo ── */}
      <Modal
        visible={showBirthDatePickerModal}
        animationType="fade"
        transparent
        onRequestClose={() => setShowBirthDatePickerModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.datePickerModalContent, { backgroundColor: '#131622', borderColor: 'rgba(255,255,255,0.1)' }]}>
            <View style={styles.datePickerModalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <CalendarIcon size={20} color="#38BDF8" />
                <Text style={styles.datePickerModalTitle}>Fecha de Cumpleaños</Text>
              </View>
              <TouchableOpacity onPress={() => setShowBirthDatePickerModal(false)} style={{ padding: 4 }}>
                <X size={20} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <Text style={styles.datePickerModalSub}>
              Selecciona tu fecha de nacimiento para ajustar tus calorías exactas.
            </Text>

            {/* Selectors for Day, Month, Year */}
            <View style={styles.datePickerColumnsRow}>
              {/* Day */}
              <View style={styles.datePickerCol}>
                <Text style={styles.datePickerColLabel}>DÍA</Text>
                <ScrollView style={styles.datePickerColScroll} showsVerticalScrollIndicator={false}>
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                    <TouchableOpacity
                      key={d}
                      onPress={() => setTempBirthDay(d)}
                      style={[styles.datePickerItemBtn, tempBirthDay === d && styles.datePickerItemBtnActive]}
                    >
                      <Text style={[styles.datePickerItemText, tempBirthDay === d && styles.datePickerItemTextActive]}>
                        {d}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Month */}
              <View style={[styles.datePickerCol, { flex: 1.4 }]}>
                <Text style={styles.datePickerColLabel}>MES</Text>
                <ScrollView style={styles.datePickerColScroll} showsVerticalScrollIndicator={false}>
                  {[
                    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
                  ].map((mName, mIdx) => (
                    <TouchableOpacity
                      key={mName}
                      onPress={() => setTempBirthMonth(mIdx + 1)}
                      style={[styles.datePickerItemBtn, tempBirthMonth === mIdx + 1 && styles.datePickerItemBtnActive]}
                    >
                      <Text style={[styles.datePickerItemText, tempBirthMonth === mIdx + 1 && styles.datePickerItemTextActive]}>
                        {mName}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Year (from 1940 up to current year) */}
              <View style={styles.datePickerCol}>
                <Text style={styles.datePickerColLabel}>AÑO</Text>
                <ScrollView style={styles.datePickerColScroll} showsVerticalScrollIndicator={false}>
                  {Array.from({ length: new Date().getFullYear() - 1939 }, (_, i) => new Date().getFullYear() - i).map((y) => (
                    <TouchableOpacity
                      key={y}
                      onPress={() => setTempBirthYear(y)}
                      style={[styles.datePickerItemBtn, tempBirthYear === y && styles.datePickerItemBtnActive]}
                    >
                      <Text style={[styles.datePickerItemText, tempBirthYear === y && styles.datePickerItemTextActive]}>
                        {y}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>

            {/* Selected Date Preview */}
            <View style={styles.datePickerPreviewBox}>
              <Text style={styles.datePickerPreviewText}>
                Fecha elegida: {String(tempBirthDay).padStart(2, '0')}/{String(tempBirthMonth).padStart(2, '0')}/{tempBirthYear}
              </Text>
            </View>

            {/* Action buttons */}
            <View style={styles.datePickerActionsRow}>
              <TouchableOpacity
                style={styles.datePickerCancelBtn}
                onPress={() => setShowBirthDatePickerModal(false)}
              >
                <Text style={styles.datePickerCancelText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.datePickerConfirmBtn}
                onPress={() => {
                  const maxDaysInMonth = new Date(tempBirthYear, tempBirthMonth, 0).getDate()
                  const validDay = Math.min(tempBirthDay, maxDaysInMonth)
                  const chosenDate = new Date(tempBirthYear, tempBirthMonth - 1, validDay)
                  const now = new Date()

                  if (chosenDate > now) {
                    Alert.alert('Fecha inválida', 'La fecha de cumpleaños no puede ser posterior a hoy.')
                    return
                  }

                  const formatted = `${tempBirthYear}-${String(tempBirthMonth).padStart(2, '0')}-${String(validDay).padStart(2, '0')}`
                  setBirthDate(formatted)
                  setShowBirthDatePickerModal(false)
                }}
              >
                <Text style={styles.datePickerConfirmText}>Confirmar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 52 : 36,
    paddingBottom: 14,
  },
  topBarUsername: {
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  topBarIconsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  topBarIconBtn: {
    padding: 4,
  },
  content: {
    padding: 16,
    gap: 16,
    paddingBottom: 60,
  },
  profileHeroSectionCentered: {
    alignItems: 'center',
    paddingVertical: 12,
    gap: 10,
  },
  heroAvatarCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 1.5,
    overflow: 'visible',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroAvatarImg: {
    width: 88,
    height: 88,
    borderRadius: 44,
  },
  heroAvatarInitial: {
    color: '#38BDF8',
    fontSize: 34,
    fontWeight: '900',
  },
  avatarInner: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    color: '#38BDF8',
    fontSize: 34,
    fontWeight: '900',
  },
  heroAvatarEditBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#2563EB',
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#09090B',
  },
  heroDisplayName: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  heroCapsulePill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
  },
  heroCapsuleText: {
    color: '#A1A1AA',
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  navPillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginVertical: 4,
  },
  navPill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
  },
  navPillActive: {},
  navPillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  navPillTextActive: {
    fontWeight: '800',
  },
  globalStatsCard: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    gap: 12,
  },
  globalStatsHeaderTitle: {
    color: '#71717A',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  globalStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  globalStatItem: {
    width: '48.5%',
    borderRadius: 14,
    padding: 12,
    gap: 6,
  },
  globalStatIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  globalStatItemLabel: {
    color: '#71717A',
    fontSize: 11,
    fontWeight: '600',
  },
  globalStatItemVal: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  globalStatUnit: {
    fontSize: 12,
    color: '#71717A',
    fontWeight: '600',
  },
  tabContentContainer: {
    gap: 14,
  },
  card: {
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    gap: 14,
  },
  cardTitle: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  quickCardTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  quickCardSub: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
    marginTop: 2,
  },
  iconCircleThumb: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statGridItem: {
    width: '48.5%',
    borderRadius: 16,
    padding: 14,
    gap: 4,
  },
  statGridVal: {
    fontSize: 20,
    fontWeight: '900',
    marginTop: 4,
  },
  statGridLabel: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
    fontWeight: '600',
  },
  searchBoxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 4,
  },
  popupSubTitle: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    marginTop: 2,
  },
  exercisePopupItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
  },
  exerciseItemName: {
    fontSize: 14,
    fontWeight: '700',
  },
  exerciseItemBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 3,
    marginBottom: 4,
  },
  exercisePopupMuscleBadge: {
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    color: '#38BDF8',
    fontSize: 10,
    fontWeight: '800',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  exercisePopupDateBadge: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 11,
  },
  exercisePopupStatsText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
  },
  measuresActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  measuresSectionTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  addMeasureBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0284C7',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 4,
  },
  addMeasureBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  measuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  measureGridItem: {
    width: '31.5%',
    borderRadius: 14,
    padding: 10,
    alignItems: 'center',
  },
  measureItemLabel: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 1,
  },
  measureItemVal: {
    fontSize: 16,
    fontWeight: '900',
    marginTop: 4,
  },
  measureItemUnit: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.35)',
  },
  measurementHistoryList: {
    gap: 8,
    marginTop: 4,
  },
  historySubTitle: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  measurementHistoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
  },
  measureHistDate: {
    fontSize: 14,
    fontWeight: '700',
  },
  measureHistSummary: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    marginTop: 2,
  },
  measureHistNotes: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 11,
    fontStyle: 'italic',
    marginTop: 2,
  },
  deleteMeasureBtn: {
    padding: 6,
  },
  historySection: {
    marginTop: 8,
    gap: 12,
  },
  historyHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  historySectionTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  historyCountText: {
    color: '#38BDF8',
    fontSize: 12,
    fontWeight: '700',
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyWorkoutCard: {
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    gap: 10,
    marginVertical: 4,
  },
  emptyIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(56,189,248,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyWorkoutTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  emptyWorkoutSub: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 260,
  },
  startFirstWorkoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#2563EB',
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 10,
    marginTop: 6,
  },
  startFirstWorkoutBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
  },
  pastWorkoutsList: {
    gap: 14,
  },
  wfCard: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    gap: 12,
  },
  wfHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  wfUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  wfAvatarImg: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  wfAvatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wfAvatarInitial: {
    color: '#38BDF8',
    fontSize: 15,
    fontWeight: '800',
  },
  wfUserName: {
    fontSize: 14,
    fontWeight: '700',
  },
  wfDateText: {
    color: '#71717A',
    fontSize: 11,
    marginTop: 1,
  },
  wfDotsBtn: {
    padding: 6,
  },
  wfRoutineTitle: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  wfMetricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 12,
  },
  wfMetricItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  wfMetricDivider: {
    width: 1,
    height: 12,
    backgroundColor: '#3F3F46',
  },
  wfMetricValue: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  wfDivider: {
    height: 1,
    marginVertical: 2,
  },
  wfExercisesContainer: {
    gap: 10,
  },
  wfExpandBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    gap: 4,
  },
  wfExpandBtnText: {
    color: '#A1A1AA',
    fontSize: 12,
    fontWeight: '700',
  },
  weExerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  weExerciseImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  weExerciseInfo: {
    flex: 1,
    gap: 2,
  },
  weSeriesText: {
    color: '#71717A',
    fontSize: 11,
    fontWeight: '600',
  },
  weNameText: {
    fontSize: 13.5,
    fontWeight: '700',
  },
  exerciseCircleThumb: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pastWorkoutCard: {
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
  },
  pwHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pwAvatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1C1C1E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pwAvatarInitial: {
    color: '#38BDF8',
    fontSize: 15,
    fontWeight: '800',
  },
  pwUserName: {
    fontSize: 14,
    fontWeight: '700',
  },
  pwDateText: {
    color: '#71717A',
    fontSize: 11,
    marginTop: 1,
  },
  pwDotsBtn: {
    padding: 6,
  },
  pwDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginVertical: 10,
  },
  pwExercisesList: {
    gap: 8,
  },
  pwExerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  pwExerciseText: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    borderTopWidth: 1,
    maxHeight: '90%',
  },
  actionSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 36 : 20,
    borderTopWidth: 1,
    gap: 6,
  },
  actionSheetTitle: {
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  actionSheetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  actionSheetItemText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  measuresModalContainer: {
    flex: 1,
  },
  measuresModalTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 52 : 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  measuresModalIconBtn: {
    padding: 6,
  },
  measuresModalTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  measuresModalAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#2563EB',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  measuresModalAddBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  measuresModalContent: {
    padding: 16,
    gap: 16,
    paddingBottom: 40,
  },
  settingsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  settingsTitle: {
    fontSize: 20,
    fontWeight: '900',
  },
  modalCloseIconBtn: {
    padding: 4,
  },
  settingsNavRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  settingsNavChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.04)',
    marginRight: 8,
  },
  settingsNavChipActive: {
    backgroundColor: '#0284C7',
  },
  settingsNavChipText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    fontWeight: '700',
  },
  settingsNavChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  settingsScrollView: {
    marginVertical: 4,
  },
  settingsCardSection: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    gap: 14,
    marginBottom: 16,
  },
  settingsSectionTitle: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  inputGroup: {
    gap: 6,
    marginBottom: 8,
  },
  formRow: {
    flexDirection: 'row',
    gap: 8,
  },
  inputLabel: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  regularInput: {
    backgroundColor: '#121212',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    fontSize: 14,
    fontWeight: '600',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  smallActionBtn: {
    backgroundColor: '#0284C7',
    paddingHorizontal: 16,
    justifyContent: 'center',
    borderRadius: 12,
  },
  smallActionBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  genderRow: {
    flexDirection: 'row',
    gap: 8,
  },
  genderBtn: {
    flex: 1,
    backgroundColor: '#121212',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    paddingVertical: 10,
    alignItems: 'center',
  },
  genderBtnActive: {
    backgroundColor: 'rgba(59,130,246,0.12)',
    borderColor: '#3B82F6',
  },
  genderBtnText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 13,
    fontWeight: '700',
  },
  genderBtnTextActive: {
    color: '#60A5FA',
  },
  threeInputsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  smallInput: {
    backgroundColor: '#121212',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    paddingVertical: 8,
  },
  goalsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  goalOptionBtn: {
    width: '48%',
    backgroundColor: '#121212',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    padding: 12,
  },
  goalOptionBtnActive: {
    backgroundColor: 'rgba(59,130,246,0.1)',
    borderColor: '#3B82F6',
  },
  goalOptionTitle: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    fontWeight: '800',
  },
  goalOptionTitleActive: {
    color: '#60A5FA',
  },
  goalOptionDesc: {
    color: 'rgba(255,255,255,0.25)',
    fontSize: 10,
    marginTop: 2,
  },
  goalOptionDescActive: {
    color: 'rgba(96,165,250,0.6)',
  },
  saveProfileBtn: {
    backgroundColor: '#0284C7',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 6,
  },
  saveProfileBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  notificationToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  notifTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  notifDesc: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 11,
    marginTop: 2,
  },
  preferenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  preferenceLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  themeToggleRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 10,
    padding: 3,
  },
  themePillBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  themePillBtnActive: {
    backgroundColor: '#0284C7',
  },
  themePillText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    fontWeight: '700',
  },
  themePillTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  settingsItemBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  settingsItemText: {
    fontSize: 15,
    fontWeight: '600',
  },
  signOutText: {
    color: '#EF4444',
    fontSize: 15,
    fontWeight: '700',
  },
  modalSubInstruction: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 10,
  },
  languageOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: 'transparent',
    marginBottom: 6,
  },
  languageOptionRowActive: {
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
  },
  langLabelText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  langSubText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    marginTop: 2,
  },
  closeSettingsBtn: {
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  closeSettingsBtnText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
    fontWeight: '700',
  },
  // Calendar Modal Styles (matching reference screenshot)
  calendarModalContainer: {
    flex: 1,
    backgroundColor: '#09090B',
  },
  calendarModalTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 52 : 36,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  calendarModalIconBtn: {
    padding: 8,
  },
  calendarMonthDropdownBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  calendarMonthDropdownText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  calendarModalTopRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  calendarBannerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  calendarBannerBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  calendarBannerText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  calendarWeekdaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
    backgroundColor: '#09090B',
  },
  calendarWeekdayColText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    fontWeight: '600',
    width: `${100 / 7}%`,
    textAlign: 'center',
  },
  calendarModalScroll: {
    paddingHorizontal: 12,
    paddingBottom: 60,
  },
  calendarMonthSection: {
    marginTop: 20,
  },
  calendarSectionMonthName: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 14,
    marginLeft: 6,
  },
  calendarMonthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarGridCell: {
    width: `${100 / 7}%`,
    height: 62,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
  },
  calendarActiveDayCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2563EB',
    shadowOpacity: 0.4,
    shadowRadius: 6,
  },
  calendarActiveDayNumber: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
    lineHeight: 16,
  },
  calendarActiveDaySub: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 7,
    fontWeight: '800',
    textTransform: 'capitalize',
    marginTop: 1,
  },
  calendarInactiveDayNumber: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 15,
    fontWeight: '600',
  },
  filterActionSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 22,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    gap: 12,
  },
  filterSheetTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
  },
  filterSheetSub: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 6,
  },
  filterOptionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  filterOptionText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
    borderRadius: 40,
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#38BDF8',
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#0B0D14',
  },
  settingsAvatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
    marginBottom: 12,
  },
  settingsAvatarCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#38BDF8',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E293B',
  },
  settingsAvatarImg: {
    width: '100%',
    height: '100%',
  },
  settingsAvatarLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  changePhotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
  },
  changePhotoBtnText: {
    color: '#38BDF8',
    fontSize: 12,
    fontWeight: '700',
  },
  datePickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    height: 48,
  },
  datePickerBtnText: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  datePickerModalContent: {
    width: '92%',
    maxWidth: 420,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
  },
  datePickerModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  datePickerModalTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  datePickerModalSub: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    marginBottom: 16,
    lineHeight: 16,
  },
  datePickerColumnsRow: {
    flexDirection: 'row',
    gap: 10,
    height: 180,
    marginBottom: 14,
  },
  datePickerCol: {
    flex: 1,
    backgroundColor: '#0D0F17',
    borderRadius: 14,
    padding: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  datePickerColLabel: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 10,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 6,
    letterSpacing: 1,
  },
  datePickerColScroll: {
    flex: 1,
  },
  datePickerItemBtn: {
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 2,
  },
  datePickerItemBtnActive: {
    backgroundColor: '#2563EB',
  },
  datePickerItemText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    fontWeight: '600',
  },
  datePickerItemTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  datePickerPreviewBox: {
    backgroundColor: 'rgba(56, 189, 248, 0.08)',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.25)',
    alignItems: 'center',
    marginBottom: 16,
  },
  datePickerPreviewText: {
    color: '#38BDF8',
    fontSize: 13,
    fontWeight: '700',
  },
  datePickerActionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  datePickerCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
  },
  datePickerCancelText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    fontWeight: '700',
  },
  datePickerConfirmBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#2563EB',
    alignItems: 'center',
  },
  datePickerConfirmText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
})
