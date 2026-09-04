import React, { useState, useEffect, useRef } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
  Image,
  Platform,
  Alert,
  KeyboardAvoidingView,
  PanResponder,
  Animated,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import AsyncStorage from '@react-native-async-storage/async-storage'
import {
  Utensils,
  Sun,
  Moon,
  Coffee,
  Apple,
  Camera,
  Image as GalleryIcon,
  AlertTriangle,
  Plus,
  Minus,
  Trash2,
  X,
  Flame,
  Sparkles,
  Check,
  ChevronRight,
  ChevronLeft,
  Calendar as CalendarIcon,
  TrendingUp,
  HeartPulse,
  ShieldCheck,
  Zap,
  Copy,
  RotateCcw,
  Layers,
  ChevronDown,
  CheckCircle2,
  SlidersHorizontal,
  Footprints,
  Mic,
  Barcode,
  FileText,
} from 'lucide-react-native'
import { useNutrition } from '@/lib/hooks/useNutrition'
import { useSteps } from '@/lib/hooks/useSteps'
import { MealType, FoodItemParsed } from '@/types'
import SmartFoodScannerModal, { ScannerMode } from '@/components/nutrition/SmartFoodScannerModal'
import NutritionEvolutionModal from '@/components/nutrition/NutritionEvolutionModal'
import NutritionHealthAuditModal from '@/components/nutrition/NutritionHealthAuditModal'
import NutritionDatePickerModal from '@/components/nutrition/NutritionDatePickerModal'
import NutritionHeroCard from '@/components/nutrition/NutritionHeroCard'
import CommonFoodsSelector from '@/components/nutrition/CommonFoodsSelector'
import { CommonFoodItem } from '@/constants/commonFoodsDatabase'
import { aiService } from '@/lib/services/ai'
import { typography } from '@/constants/typography'

const MEAL_DRAFT_STORAGE_KEY = '@nutrition_active_meal_draft'
type ModalTabType = 'ai' | 'basic' | 'frequent' | 'plate'

const mealLabel: Record<string, string> = {
  breakfast: 'Desayuno',
  lunch: 'Almuerzo',
  dinner: 'Cena',
  snack: 'Snack',
}

function getMealIcon(type: string, size = 16, color = '#38BDF8') {
  switch (type) {
    case 'breakfast':
      return <Coffee size={size} color={color} />
    case 'lunch':
      return <Sun size={size} color={color} />
    case 'dinner':
      return <Moon size={size} color={color} />
    case 'snack':
      return <Apple size={size} color={color} />
    default:
      return <Utensils size={size} color={color} />
  }
}

const FOOD_DB: Record<
  string,
  { name: string; calories: number; protein: number; carbs: number; fat: number; grams: number }
> = {
  pollo: { name: 'Pechuga de pollo', calories: 165, protein: 31, carbs: 0, fat: 3.6, grams: 100 },
  arroz: { name: 'Arroz cocido', calories: 130, protein: 2.7, carbs: 28.2, fat: 0.3, grams: 100 },
  huevo: { name: 'Huevo entero (2u)', calories: 155, protein: 12.6, carbs: 1.1, fat: 10.6, grams: 100 },
  avena: { name: 'Avena en hojuelas', calories: 389, protein: 17, carbs: 66, fat: 7, grams: 100 },
  atun: { name: 'Atún en lata', calories: 116, protein: 25.5, carbs: 0, fat: 1, grams: 100 },
  atún: { name: 'Atún en lata', calories: 116, protein: 25.5, carbs: 0, fat: 1, grams: 100 },
  brocoli: { name: 'Brócoli al vapor', calories: 34, protein: 2.8, carbs: 6.6, fat: 0.4, grams: 100 },
  brócoli: { name: 'Brócoli al vapor', calories: 34, protein: 2.8, carbs: 6.6, fat: 0.4, grams: 100 },
  platano: { name: 'Plátano', calories: 89, protein: 1.1, carbs: 23, fat: 0.3, grams: 100 },
  plátano: { name: 'Plátano', calories: 89, protein: 1.1, carbs: 23, fat: 0.3, grams: 100 },
  leche: { name: 'Leche entera', calories: 61, protein: 3.2, carbs: 4.8, fat: 3.3, grams: 100 },
  proteina: { name: 'Proteína whey', calories: 120, protein: 24, carbs: 3, fat: 2, grams: 30 },
  proteína: { name: 'Proteína whey', calories: 120, protein: 24, carbs: 3, fat: 2, grams: 30 },
  almendra: { name: 'Almendras', calories: 579, protein: 21, carbs: 22, fat: 50, grams: 100 },
}

function parseFoodText(text: string): FoodItemParsed[] {
  const lower = text.toLowerCase()
  const found: FoodItemParsed[] = []

  Object.entries(FOOD_DB).forEach(([key, val]) => {
    if (lower.includes(key)) {
      const match = lower.match(new RegExp(`(\\d+)\\s*g.*${key}`))
      const grams = match ? parseInt(match[1], 10) : 150
      const ratio = grams / 100

      found.push({
        name: val.name,
        quantity_g: grams,
        calories: Math.round(val.calories * ratio),
        protein_g: Math.round(val.protein * ratio),
        carbs_g: Math.round(val.carbs * ratio),
        fat_g: Math.round(val.fat * ratio),
        confidence: 'medium',
      })
    }
  })

  if (found.length === 0) {
    found.push({
      name: 'Comida mixta estimada',
      quantity_g: 300,
      calories: 420,
      protein_g: 32,
      carbs_g: 45,
      fat_g: 12,
      confidence: 'low',
    })
  }

  return found
}

export default function NutritionScreen() {
  const insets = useSafeAreaInsets()
  const {
    selectedDate,
    setSelectedDate,
    goToPrevDay,
    goToNextDay,
    goToToday,
    logs,
    summary,
    targets,
    dayStats,
    calorieAnalysis,
    proteinAnalysis,
    carbsAnalysis,
    fatAnalysis,
    history7Days,
    history14Days,
    history30Days,
    frequentMeals,
    frequentIngredients,
    loading,
    logFood,
    updateFoodLog,
    copyFoodLog,
    deleteFoodLog,
  } = useNutrition()

  const { steps, caloriesBurned: stepsCalories } = useSteps()

  const [filterType, setFilterType] = useState<MealType | 'all'>('all')
  const [modalVisible, setModalVisible] = useState(false)
  const [modalTab, setModalTab] = useState<ModalTabType>('ai')
  const [modalMealType, setModalMealType] = useState<MealType>('lunch')
  const [foodText, setFoodText] = useState('')
  const [analysisState, setAnalysisState] = useState<'idle' | 'loading' | 'result'>('idle')
  const [results, setResults] = useState<FoodItemParsed[]>([])
  const [photoUri, setPhotoUri] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Editing existing logged food
  const [editingFoodLogId, setEditingFoodLogId] = useState<string | null>(null)
  const [editingFoodLogTitle, setEditingFoodLogTitle] = useState<string>('')
  const [initialEditingSnapshot, setInitialEditingSnapshot] = useState<string>('')

  // Frequent sub-tab: 'meals' (platos completos) vs 'ingredients' (ingredientes individuales usados)
  const [frequentSubTab, setFrequentSubTab] = useState<'meals' | 'ingredients'>('meals')
  const [expandedMealIds, setExpandedMealIds] = useState<Record<string, boolean>>({})

  // Date Picker (Days & Months) Modal State
  const [datePickerVisible, setDatePickerVisible] = useState(false)

  // Smart Food Scanner Modal State
  const [smartScannerVisible, setSmartScannerVisible] = useState(false)
  const [smartScannerInitialMode, setSmartScannerInitialMode] = useState<ScannerMode>('plate')

  // Evolution & Calendar Modal State
  const [evolutionModalVisible, setEvolutionModalVisible] = useState(false)

  // Health & Micronutrient Audit Modal State
  const [healthModalVisible, setHealthModalVisible] = useState(false)

  // Smart Macro Closer Modal State
  const [macroCloserVisible, setMacroCloserVisible] = useState(false)
  const [macroCloserLoading, setMacroCloserLoading] = useState(false)
  const [macroCloserData, setMacroCloserData] = useState<any>(null)

  // PanResponder for drag-down gesture to minimize food modal
  const modalPanY = useRef(new Animated.Value(0)).current
  const modalPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => gestureState.dy > 8,
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          modalPanY.setValue(gestureState.dy)
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 120 || gestureState.vy > 0.5) {
          Animated.timing(modalPanY, {
            toValue: 700,
            duration: 200,
            useNativeDriver: true,
          }).start(() => {
            handleMinimizeModal()
            modalPanY.setValue(0)
          })
        } else {
          Animated.spring(modalPanY, {
            toValue: 0,
            bounciness: 4,
            useNativeDriver: true,
          }).start()
        }
      },
    })
  ).current

  useEffect(() => {
    if (modalVisible) {
      modalPanY.setValue(0)
    }
  }, [modalVisible])

  // 1. Cargar borrador persistente de AsyncStorage al iniciar
  useEffect(() => {
    const loadDraft = async () => {
      try {
        const saved = await AsyncStorage.getItem(MEAL_DRAFT_STORAGE_KEY)
        if (saved) {
          const parsed = JSON.parse(saved)
          if (parsed.results && Array.isArray(parsed.results) && parsed.results.length > 0) {
            setResults(parsed.results)
            if (parsed.modalMealType) setModalMealType(parsed.modalMealType)
            if (parsed.foodText) setFoodText(parsed.foodText)
          }
        }
      } catch (e) {
        console.warn('Error loading meal draft:', e)
      }
    }
    loadDraft()
  }, [])

  // 2. Guardar borrador en AsyncStorage cuando cambie el plato (solo para nuevas comidas, no al editar)
  useEffect(() => {
    const saveDraft = async () => {
      try {
        if (results.length > 0 && !editingFoodLogId) {
          await AsyncStorage.setItem(
            MEAL_DRAFT_STORAGE_KEY,
            JSON.stringify({ results, modalMealType, foodText, date: selectedDate })
          )
        } else if (results.length === 0 && !editingFoodLogId) {
          await AsyncStorage.removeItem(MEAL_DRAFT_STORAGE_KEY)
        }
      } catch (e) {
        console.warn('Error saving meal draft:', e)
      }
    }
    saveDraft()
  }, [results, modalMealType, foodText, selectedDate, editingFoodLogId])

  const isToday = selectedDate === new Date().toISOString().split('T')[0]

  const formatDisplayDate = (dateStr: string) => {
    try {
      const parts = dateStr.split('-')
      if (parts.length === 3) {
        const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]))
        const rawWeekday = d.toLocaleDateString('es-ES', { weekday: 'long' })
        const rawMonth = d.toLocaleDateString('es-ES', { month: 'short' }).replace('.', '')
        const dayNum = d.getDate()
        const weekdayCap = rawWeekday.charAt(0).toUpperCase() + rawWeekday.slice(1)
        const monthCap = rawMonth.charAt(0).toUpperCase() + rawMonth.slice(1)
        return `${weekdayCap}, ${dayNum} ${monthCap}`
      }
    } catch {}
    return dateStr
  }

  const filteredLogs = filterType === 'all' ? logs : logs.filter((l) => l.meal_type === filterType)

  const handleOpenSmartScannerMode = (mode: ScannerMode) => {
    setSmartScannerInitialMode(mode)
    setModalVisible(false)
    setSmartScannerVisible(true)
  }

  const handleLaunchCamera = () => {
    handleOpenSmartScannerMode('plate')
  }

  const handleLaunchGallery = () => {
    handleOpenSmartScannerMode('plate')
  }

  const handleSaveFromSmartScanner = async (foods: FoodItemParsed[], rawInput: string) => {
    setResults((prev) => [...prev, ...foods])
    setSmartScannerVisible(false)
    setModalVisible(true)
    setModalTab('plate')
  }

  const handleAddCommonFood = (food: CommonFoodItem, customGrams?: number) => {
    const quantityG = customGrams || food.defaultServingG
    const ratio = quantityG / 100
    const newItem: FoodItemParsed = {
      name: food.name,
      quantity_g: quantityG,
      unit_or_portion: food.defaultServingName,
      calories: Math.round(food.calories * ratio),
      protein_g: Number((food.protein * ratio).toFixed(1)),
      carbs_g: Number((food.carbs * ratio).toFixed(1)),
      fat_g: Number((food.fat * ratio).toFixed(1)),
      confidence: 'high',
    }

    setResults((prev) => {
      const existingIndex = prev.findIndex(
        (p) => p.name.toLowerCase() === food.name.toLowerCase()
      )
      if (existingIndex !== -1) {
        const updated = [...prev]
        const curr = updated[existingIndex]
        const nextG = (curr.quantity_g || 100) + quantityG
        const nextRatio = nextG / 100
        updated[existingIndex] = {
          ...curr,
          quantity_g: nextG,
          calories: Math.round(food.calories * nextRatio),
          protein_g: Number((food.protein * nextRatio).toFixed(1)),
          carbs_g: Number((food.carbs * nextRatio).toFixed(1)),
          fat_g: Number((food.fat * nextRatio).toFixed(1)),
        }
        return updated
      }
      return [...prev, newItem]
    })
  }

  const handleUpdateCommonFoodQuantity = (foodName: string, deltaG: number) => {
    setResults((prev) => {
      const existingIndex = prev.findIndex(
        (p) => p.name.toLowerCase() === foodName.toLowerCase()
      )
      if (existingIndex === -1) return prev
      const updated = [...prev]
      const curr = updated[existingIndex]
      const nextG = (curr.quantity_g || 100) + deltaG
      if (nextG <= 0) {
        return prev.filter((_, idx) => idx !== existingIndex)
      }
      const ratio = nextG / (curr.quantity_g || 100)
      updated[existingIndex] = {
        ...curr,
        quantity_g: nextG,
        calories: Math.round(curr.calories * ratio),
        protein_g: Number((curr.protein_g * ratio).toFixed(1)),
        carbs_g: Number((curr.carbs_g * ratio).toFixed(1)),
        fat_g: Number((curr.fat_g * ratio).toFixed(1)),
      }
      return updated
    })
  }

  const handleRemoveCommonFoodByName = (foodName: string) => {
    setResults((prev) => prev.filter((p) => p.name.toLowerCase() !== foodName.toLowerCase()))
  }

  const handleRemoveItem = (index: number) => {
    setResults((prev) => {
      const next = prev.filter((_, idx) => idx !== index)
      if (next.length === 0 && !editingFoodLogId) {
        AsyncStorage.removeItem(MEAL_DRAFT_STORAGE_KEY).catch(() => {})
      }
      return next
    })
  }

  const handleOpenMacroCloser = async () => {
    const remainingCalories = calorieAnalysis.remaining
    const remainingProtein = proteinAnalysis.remaining
    const remainingCarbs = carbsAnalysis.remaining
    const remainingFat = fatAnalysis.remaining

    setMacroCloserVisible(true)
    setMacroCloserLoading(true)
    try {
      const { data } = await aiService.closeMacros({
        remainingCalories,
        remainingProtein,
        remainingCarbs,
        remainingFat,
      })
      setMacroCloserData(data)
    } catch (err) {
      console.warn('Error closing macros:', err)
    } finally {
      setMacroCloserLoading(false)
    }
  }

  const handleAnalyzeText = async () => {
    if (!foodText.trim()) return
    setAnalysisState('loading')
    try {
      const { data } = await aiService.parseNaturalMeal(foodText)
      const parsedFoods: FoodItemParsed[] = data.items.map((it) => ({
        name: it.name,
        brand: it.brand || null,
        quantity_g: it.grams,
        unit_or_portion: it.unitOrPortion || null,
        calories: it.calories,
        protein_g: it.protein,
        carbs_g: it.carbs,
        fat_g: it.fat,
        confidence: 'high',
      }))
      setResults((prev) => [...prev, ...parsedFoods])
      setAnalysisState('idle')
      setFoodText('')
      setModalTab('plate')
    } catch (err: any) {
      console.warn('[Nutrition] Fallback parsing food text:', err)
      const parsed = parseFoodText(foodText)
      setResults((prev) => [...prev, ...parsed])
      setAnalysisState('idle')
      setFoodText('')
      setModalTab('plate')
    }
  }

  const handleSaveMeal = async () => {
    if (results.length === 0) return
    setSaving(true)
    const totalC = results.reduce((s, r) => s + (r.calories || 0), 0)
    const totalP = results.reduce((s, r) => s + (r.protein_g || 0), 0)
    const totalCb = results.reduce((s, r) => s + (r.carbs_g || 0), 0)
    const totalF = results.reduce((s, r) => s + (r.fat_g || 0), 0)

    const foodNames = results.map((r) => r.name).join(', ')

    if (editingFoodLogId) {
      await updateFoodLog(editingFoodLogId, {
        mealType: modalMealType,
        rawInput: foodNames || editingFoodLogTitle || 'Comida editada',
        foodsParsed: results,
        calories: totalC,
        proteinG: totalP,
        carbsG: totalCb,
        fatG: totalF,
      })
      setEditingFoodLogId(null)
      setEditingFoodLogTitle('')
      setInitialEditingSnapshot('')
    } else {
      await logFood({
        mealType: modalMealType,
        rawInput: foodNames || foodText || 'Comida registrada',
        foodsParsed: results,
        calories: totalC,
        proteinG: totalP,
        carbsG: totalCb,
        fatG: totalF,
      })
    }

    setSaving(false)
    setResults([])
    setFoodText('')
    setPhotoUri(null)
    setAnalysisState('idle')
    setInitialEditingSnapshot('')
    setModalVisible(false)
    try {
      await AsyncStorage.removeItem(MEAL_DRAFT_STORAGE_KEY)
    } catch {}
  }

  const updateItemGrams = (index: number, newGrams: number) => {
    setResults((prev) => {
      const updated = [...prev]
      const item = updated[index]
      if (!item) return prev
      const safeGrams = Math.max(5, Math.min(3000, newGrams))
      const oldGrams = item.quantity_g && item.quantity_g > 0 ? item.quantity_g : 100
      const ratio = safeGrams / oldGrams
      updated[index] = {
        ...item,
        quantity_g: Math.round(safeGrams),
        calories: Math.max(0, Math.round((item.calories || 0) * ratio)),
        protein_g: Math.max(0, Number(((item.protein_g || 0) * ratio).toFixed(1))),
        carbs_g: Math.max(0, Number(((item.carbs_g || 0) * ratio).toFixed(1))),
        fat_g: Math.max(0, Number(((item.fat_g || 0) * ratio).toFixed(1))),
      }
      return updated
    })
  }

  const handleGramsTextChange = (index: number, text: string) => {
    const cleaned = text.replace(/[^0-9]/g, '')
    if (!cleaned) {
      setResults((prev) => {
        const updated = [...prev]
        if (updated[index]) {
          updated[index] = { ...updated[index], quantity_g: 0 }
        }
        return updated
      })
      return
    }
    const val = parseInt(cleaned, 10)
    updateItemGrams(index, val)
  }

  const handleAddSingleIngredient = (food: FoodItemParsed) => {
    const defaultGrams = food.quantity_g || 100
    const newItem: FoodItemParsed = {
      name: food.name,
      brand: food.brand || null,
      quantity_g: defaultGrams,
      unit_or_portion: food.unit_or_portion || `${defaultGrams}g`,
      calories: food.calories || 100,
      protein_g: food.protein_g || 0,
      carbs_g: food.carbs_g || 0,
      fat_g: food.fat_g || 0,
      confidence: 'high',
    }

    setResults((prev) => {
      const existingIdx = prev.findIndex(
        (p) => p.name.toLowerCase() === food.name.toLowerCase()
      )
      if (existingIdx !== -1) {
        const updated = [...prev]
        const curr = updated[existingIdx]
        const nextG = (curr.quantity_g || 100) + defaultGrams
        const ratio = nextG / Math.max(1, curr.quantity_g || 100)
        updated[existingIdx] = {
          ...curr,
          quantity_g: nextG,
          calories: Math.round((curr.calories || 0) * ratio),
          protein_g: Number(((curr.protein_g || 0) * ratio).toFixed(1)),
          carbs_g: Number(((curr.carbs_g || 0) * ratio).toFixed(1)),
          fat_g: Number(((curr.fat_g || 0) * ratio).toFixed(1)),
        }
        return updated
      }
      return [...prev, newItem]
    })
    setModalTab('plate')
  }

  const handleToggleExpandMeal = (mealId: string) => {
    setExpandedMealIds((prev) => ({
      ...prev,
      [mealId]: !prev[mealId],
    }))
  }

  const handleRepeatMeal = (log: any) => {
    setEditingFoodLogId(null)
    setEditingFoodLogTitle('')
    const repeatedItems: FoodItemParsed[] =
      log.foods_parsed && log.foods_parsed.length > 0
        ? JSON.parse(JSON.stringify(log.foods_parsed))
        : [
            {
              name: log.raw_input || 'Comida repetida',
              quantity_g: 200,
              calories: log.calories || 300,
              protein_g: log.protein_g || 20,
              carbs_g: log.carbs_g || 30,
              fat_g: log.fat_g || 10,
              confidence: 'medium',
            },
          ]
    setResults((prev) => [...prev, ...repeatedItems])
    setModalMealType(log.meal_type || 'lunch')
    setModalTab('plate')
    setModalVisible(true)
  }

  const resetMealModalState = async () => {
    setResults([])
    setFoodText('')
    setPhotoUri(null)
    setAnalysisState('idle')
    setEditingFoodLogId(null)
    setEditingFoodLogTitle('')
    setInitialEditingSnapshot('')
    setModalVisible(false)
    try {
      await AsyncStorage.removeItem(MEAL_DRAFT_STORAGE_KEY)
    } catch {}
  }

  const handleEditMeal = (log: any) => {
    setEditingFoodLogId(log.id)
    setEditingFoodLogTitle(log.raw_input || 'Comida')
    const mealType = log.meal_type || 'lunch'
    setModalMealType(mealType)
    const itemsToEdit: FoodItemParsed[] =
      log.foods_parsed && log.foods_parsed.length > 0
        ? JSON.parse(JSON.stringify(log.foods_parsed))
        : [
            {
              name: log.raw_input || 'Comida',
              quantity_g: 200,
              calories: log.calories || 300,
              protein_g: log.protein_g || 20,
              carbs_g: log.carbs_g || 30,
              fat_g: log.fat_g || 10,
              confidence: 'medium',
            },
          ]
    setResults(itemsToEdit)
    setInitialEditingSnapshot(JSON.stringify({ mealType, results: itemsToEdit }))
    setModalTab('plate')
    setModalVisible(true)
  }

  const handleConfirmDiscardDraft = () => {
    if (editingFoodLogId) {
      const currentSnapshot = JSON.stringify({ mealType: modalMealType, results })
      const hasChanges = initialEditingSnapshot !== '' && currentSnapshot !== initialEditingSnapshot
      if (!hasChanges) {
        // No se hicieron cambios: cerrar directamente sin diálogo ni dejar dock flotante
        resetMealModalState()
        return
      }

      if (Platform.OS === 'web') {
        const ok = typeof window !== 'undefined' ? window.confirm('¿Descartar cambios?\nSe cancelará la edición de esta comida.') : true
        if (ok) resetMealModalState()
        return
      }

      Alert.alert(
        '¿Descartar cambios?',
        'Se cancelará la edición de esta comida.',
        [
          { text: 'Continuar editando', style: 'cancel' },
          {
            text: 'Descartar',
            style: 'destructive',
            onPress: () => {
              resetMealModalState()
            },
          },
        ]
      )
      return
    }

    if (results.length === 0 && !foodText.trim()) {
      resetMealModalState()
      return
    }

    if (Platform.OS === 'web') {
      const ok = typeof window !== 'undefined' ? window.confirm('¿Descartar borrador?\nSe borrarán los productos que estabas añadiendo a esta comida.') : true
      if (ok) resetMealModalState()
      return
    }

    Alert.alert(
      '¿Descartar borrador?',
      'Se borrarán los productos que estabas añadiendo a esta comida.',
      [
        { text: 'Continuar', style: 'cancel' },
        {
          text: 'Descartar',
          style: 'destructive',
          onPress: () => {
            resetMealModalState()
          },
        },
      ]
    )
  }

  const handleMinimizeModal = () => {
    if (editingFoodLogId) {
      handleConfirmDiscardDraft()
      return
    }
    setModalVisible(false)
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + 8,
            paddingBottom: insets.bottom + 100,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Header: "Nutrición" + Date Selector Subtitle (Sin avatar, desplegable de fechas y meses) */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Nutrición</Text>
          <TouchableOpacity
            onPress={() => setDatePickerVisible(true)}
            style={styles.dateSelectorBtn}
            activeOpacity={0.7}
          >
            <Text style={styles.dateSubtitle}>{formatDisplayDate(selectedDate)}</Text>
            <ChevronDown size={14} color="#71717A" />
          </TouchableOpacity>
        </View>

        {/* 1. Hero Card: Calorie Gauge Circular + 3 Macro Rings (Imagen 1) */}
        <NutritionHeroCard
          caloriesConsumed={calorieAnalysis.consumed}
          caloriesTarget={calorieAnalysis.target}
          proteinConsumed={proteinAnalysis.consumed}
          proteinTarget={proteinAnalysis.target}
          carbsConsumed={carbsAnalysis.consumed}
          carbsTarget={carbsAnalysis.target}
          fatConsumed={fatAnalysis.consumed}
          fatTarget={fatAnalysis.target}
        />

        {/* 2. Tarjetas de Análisis Rápido: Evolución & Estadísticas y Control de Salud */}
        <View style={styles.analysisCardsContainer}>
          {/* 2.1 Evolución & Estadísticas (Seguimiento Nutricional) */}
          <TouchableOpacity
            style={styles.evolutionMiniCard}
            onPress={() => setEvolutionModalVisible(true)}
            activeOpacity={0.85}
          >
            <View style={styles.evolutionMiniHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <TrendingUp size={15} color="#38BDF8" />
                <Text style={styles.evolutionMiniTitle}>EVOLUCIÓN & ESTADÍSTICAS</Text>
              </View>
              <View style={styles.evolutionStatsBadge}>
                <Text style={styles.evolutionStatsBadgeText}>7, 14, 30 Días</Text>
                <ChevronRight size={12} color="#38BDF8" />
              </View>
            </View>

            <View style={styles.evolutionPillsRow}>
              {/* Promedio Diario */}
              <View style={styles.evolutionMiniPill}>
                <Text style={styles.evolutionMiniPillLabel}>Promedio Diario</Text>
                <Text style={styles.evolutionMiniPillVal}>
                  {Math.round(history7Days.avgCalories || 0)} <Text style={styles.evolutionMiniPillUnit}>kcal</Text>
                </Text>
              </View>

              {/* Balance Neto */}
              <View style={styles.evolutionMiniPill}>
                <Text style={styles.evolutionMiniPillLabel}>Balance Neto</Text>
                <Text
                  style={[
                    styles.evolutionMiniPillVal,
                    {
                      color:
                        history7Days.netCaloriesBalance > 0
                          ? '#F59E0B'
                          : history7Days.netCaloriesBalance < 0
                          ? '#38BDF8'
                          : '#10B981',
                    },
                  ]}
                >
                  {history7Days.netCaloriesBalance > 0
                    ? `+${history7Days.netCaloriesBalance}`
                    : `${history7Days.netCaloriesBalance}`} <Text style={styles.evolutionMiniPillUnit}>kcal</Text>
                </Text>
              </View>

              {/* Días Óptimos */}
              <View style={styles.evolutionMiniPill}>
                <Text style={styles.evolutionMiniPillLabel}>Días Óptimos</Text>
                <Text style={[styles.evolutionMiniPillVal, { color: '#10B981' }]}>
                  {history7Days.optimalDaysCount}/{history7Days.daysLoggedCount || 7}
                </Text>
              </View>
            </View>
          </TouchableOpacity>

          {/* 2.2 Control de Salud & Micronutrientes (Auditar con IA) */}
          <TouchableOpacity
            style={styles.healthMiniCard}
            onPress={() => setHealthModalVisible(true)}
            activeOpacity={0.85}
          >
            <View style={styles.healthMiniHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <HeartPulse size={15} color="#10B981" />
                <Text style={styles.healthMiniTitle}>CONTROL DE SALUD</Text>
              </View>
              <View style={styles.healthAiBadge}>
                <Sparkles size={11} color="#C4B5FD" />
                <Text style={styles.healthAiBadgeText}>Auditoría IA</Text>
                <ChevronRight size={12} color="#A78BFA" />
              </View>
            </View>

            <View style={styles.healthPillsRow}>
              {/* Sal */}
              <View style={styles.healthMiniPill}>
                <Text style={styles.healthMiniPillLabel}>Sal/Sodio</Text>
                <Text
                  style={[
                    styles.healthMiniPillVal,
                    dayStats.healthMetrics.saltG > 5 ? { color: '#EF4444' } : { color: '#FAFAFA' },
                  ]}
                >
                  {dayStats.healthMetrics.saltG}g / 5g
                </Text>
              </View>

              {/* Azúcar */}
              <View style={styles.healthMiniPill}>
                <Text style={styles.healthMiniPillLabel}>Azúcares</Text>
                <Text
                  style={[
                    styles.healthMiniPillVal,
                    dayStats.healthMetrics.sugarsG > 35 ? { color: '#EF4444' } : { color: '#FAFAFA' },
                  ]}
                >
                  {dayStats.healthMetrics.sugarsG}g / 35g
                </Text>
              </View>

              {/* Fibra */}
              <View style={styles.healthMiniPill}>
                <Text style={styles.healthMiniPillLabel}>Fibra</Text>
                <Text style={[styles.healthMiniPillVal, { color: '#10B981' }]}>
                  {dayStats.healthMetrics.fiberG}g / 30g
                </Text>
              </View>

              {/* Ultraprocesados */}
              <View style={styles.healthMiniPill}>
                <Text style={styles.healthMiniPillLabel}>Procesados</Text>
                <Text
                  style={[
                    styles.healthMiniPillVal,
                    dayStats.healthMetrics.ultraProcessedRatio > 30
                      ? { color: '#EF4444' }
                      : { color: '#38BDF8' },
                  ]}
                >
                  {dayStats.healthMetrics.ultraProcessedRatio}%
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>

        {/* 3. Sección AI (Imagen 2: "Ai" + Píldoras brillantes violeta) */}
        <View style={styles.aiSectionCard}>
          <Text style={styles.aiSectionTitle}>Ai</Text>
          <View style={styles.aiPillsRow}>
            <TouchableOpacity
              style={styles.aiGlowingPill}
              onPress={() => setSmartScannerVisible(true)}
              activeOpacity={0.85}
            >
              <Sparkles size={14} color="#C4B5FD" />
              <Text style={styles.aiGlowingPillText}>Escáner Visión</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.aiGlowingPill}
              onPress={handleOpenMacroCloser}
              activeOpacity={0.85}
            >
              <Sparkles size={14} color="#C4B5FD" />
              <Text style={styles.aiGlowingPillText}>Cierra tus Macros</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 4. Filtros de Tipo de Comida (Imagen 3) */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {(['all', 'breakfast', 'lunch', 'dinner', 'snack'] as const).map((t) => {
            const active = filterType === t
            return (
              <TouchableOpacity
                key={t}
                onPress={() => setFilterType(t)}
                style={[styles.filterPill, active && styles.filterPillActive]}
                activeOpacity={0.8}
              >
                {t !== 'all' && getMealIcon(t, 14, active ? '#FAFAFA' : '#71717A')}
                <Text style={[styles.filterPillText, active && styles.filterPillTextActive]}>
                  {t === 'all' ? 'Todas' : mealLabel[t]}
                </Text>
              </TouchableOpacity>
            )
          })}
        </ScrollView>

        {/* 5. Comidas Registradas List (Imagen 2) */}
        <View style={styles.logsList}>
          {filteredLogs.length === 0 ? (
            <View style={styles.emptyBox}>
              <Utensils size={28} color="#71717A" />
              <Text style={styles.emptyText}>Sin comidas registradas en esta fecha</Text>
              <TouchableOpacity
                style={styles.emptyAddBtn}
                onPress={() => setModalVisible(true)}
                activeOpacity={0.8}
              >
                <Plus size={14} color="#FAFAFA" />
                <Text style={styles.emptyAddBtnText}>Añadir comida</Text>
              </TouchableOpacity>
            </View>
          ) : (
            filteredLogs.map((log) => {
              const type = log.meal_type || 'lunch'
              const foods = log.foods_parsed || []
              return (
                <View key={log.id} style={styles.mealCard}>
                  {/* Meal Group Header */}
                  <View style={styles.mealCardHeader}>
                    <View style={styles.mealCardHeaderLeft}>
                      <View style={styles.mealIconBox}>
                        {getMealIcon(type, 16, '#FAFAFA')}
                      </View>
                      <View>
                        <Text style={styles.mealTypeName}>{mealLabel[type] || 'Comida'}</Text>
                        <Text style={styles.mealMacrosSummary}>
                          P: {Math.round(log.protein_g || 0)}g • C: {Math.round(log.carbs_g || 0)}g • G: {Math.round(log.fat_g || 0)}g
                        </Text>
                      </View>
                    </View>

                    {/* Actions: Edit, Repeat, Delete */}
                    <View style={styles.mealCardHeaderRight}>
                      <TouchableOpacity
                        style={styles.mealActionIconBtn}
                        onPress={() => handleEditMeal(log)}
                        activeOpacity={0.7}
                      >
                        <SlidersHorizontal size={14} color="#A1A1AA" />
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.mealActionIconBtn}
                        onPress={() => handleRepeatMeal(log)}
                        activeOpacity={0.7}
                      >
                        <Copy size={14} color="#A78BFA" />
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.mealActionIconBtn, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}
                        onPress={() => deleteFoodLog(log.id)}
                        activeOpacity={0.7}
                      >
                        <Trash2 size={14} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Food Items Rows (Imagen 2) */}
                  <View style={styles.foodItemsContainer}>
                    {foods.length > 0 ? (
                      foods.map((f, i) => (
                        <View key={i} style={[styles.foodItemRow, i > 0 && styles.foodItemRowBorder]}>
                          <View style={styles.foodItemLeftCol}>
                            <Text style={styles.foodItemTitle} numberOfLines={2}>
                              {f.name}
                            </Text>
                            <Text style={styles.foodItemGramsSub}>
                              {f.unit_or_portion ? `${f.unit_or_portion} (${f.quantity_g} g)` : `${f.quantity_g || 100} g`}
                            </Text>
                          </View>
                          <Text style={styles.foodItemCalories}>
                            {f.calories || 0} kcal
                          </Text>
                        </View>
                      ))
                    ) : (
                      <View style={styles.foodItemRow}>
                        <View style={styles.foodItemLeftCol}>
                          <Text style={styles.foodItemTitle}>{log.raw_input || 'Comida registrada'}</Text>
                          <Text style={styles.foodItemGramsSub}>1 porción</Text>
                        </View>
                        <Text style={styles.foodItemCalories}>{log.calories || 0} kcal</Text>
                      </View>
                    )}
                  </View>
                </View>
              )
            })
          )}
        </View>
      </ScrollView>

      {/* Floating Action Button (+) matching Image 2 */}
      <TouchableOpacity
        style={styles.fabSquareBtn}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.85}
      >
        <Plus size={24} color="#09090B" strokeWidth={2.5} />
      </TouchableOpacity>

      {/* Modal Selector de Fecha (Días y Meses) */}
      <NutritionDatePickerModal
        visible={datePickerVisible}
        selectedDate={selectedDate}
        onClose={() => setDatePickerVisible(false)}
        onSelectDate={(newDate) => setSelectedDate(newDate)}
      />

      {/* Modal de Calendario & Evolución */}
      <NutritionEvolutionModal
        visible={evolutionModalVisible}
        onClose={() => setEvolutionModalVisible(false)}
        selectedDate={selectedDate}
        onSelectDate={(newDate) => setSelectedDate(newDate)}
        history7Days={history7Days}
        history14Days={history14Days}
        history30Days={history30Days}
      />

      {/* Modal de Auditoría de Salud & Micronutrientes */}
      <NutritionHealthAuditModal
        visible={healthModalVisible}
        onClose={() => setHealthModalVisible(false)}
        dayStats={dayStats}
        logs={logs}
      />

      {/* Smart Food Scanner Modal */}
      <SmartFoodScannerModal
        visible={smartScannerVisible}
        onClose={() => setSmartScannerVisible(false)}
        mealType={modalMealType}
        initialMode={smartScannerInitialMode}
        onSaveToMeal={handleSaveFromSmartScanner}
      />

      {/* Unified Multi-Source Food Entry Modal Sheet */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={handleMinimizeModal}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <Animated.View
            style={[
              styles.modalSheet,
              {
                paddingBottom: Math.max(insets.bottom, 16),
                transform: [{ translateY: modalPanY }],
              },
            ]}
          >
            {/* Gesture Handle Touch Zone (Drag down to minimize) */}
            <View {...modalPanResponder.panHandlers} style={styles.modalHandleTouchZone}>
              <View style={styles.modalHandle} />
            </View>

            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={styles.modalTitle}>
                    {editingFoodLogId
                      ? `Editar ${mealLabel[modalMealType]}`
                      : modalTab === 'basic'
                      ? 'Alimentos Básicos'
                      : modalTab === 'frequent'
                      ? 'Tupper & Frecuentes'
                      : modalTab === 'plate'
                      ? `Mi Plato (${results.length})`
                      : mealLabel[modalMealType]}
                  </Text>
                </View>
                {modalTab === 'plate' ? (
                  <Text style={styles.modalHeaderSubtitle}>
                    {results.length} {results.length === 1 ? 'ingrediente' : 'ingredientes'} · {results.reduce((s, r) => s + (r.calories || 0), 0)} kcal
                  </Text>
                ) : (
                  modalTab !== 'ai' && (
                    <TouchableOpacity
                      onPress={() => setModalTab('ai')}
                      style={styles.backToAiHeaderBtn}
                      activeOpacity={0.7}
                    >
                      <ChevronLeft size={14} color="#A1A1AA" />
                      <Text style={styles.backToAiHeaderText}>Volver a Entrada IA</Text>
                    </TouchableOpacity>
                  )
                )}
              </View>

              <View style={styles.modalHeaderActions}>
                {!editingFoodLogId && (
                  <TouchableOpacity
                    onPress={handleMinimizeModal}
                    style={styles.minimizeBtn}
                    activeOpacity={0.7}
                  >
                    <ChevronDown size={18} color="#38BDF8" />
                    <Text style={styles.minimizeBtnText}>Minimizar</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  onPress={handleConfirmDiscardDraft}
                  style={styles.closeBtn}
                  activeOpacity={0.7}
                >
                  <X size={18} color="rgba(255,255,255,0.7)" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Sub Tabs: IA & Visión vs Básicos vs Tupper vs Mi Plato */}
            <View style={styles.modalSubTabRow}>
              <TouchableOpacity
                style={[styles.modalSubTab, modalTab === 'ai' && styles.modalSubTabActive]}
                onPress={() => setModalTab('ai')}
                activeOpacity={0.8}
              >
                <Sparkles size={12} color={modalTab === 'ai' ? '#FAFAFA' : '#71717A'} />
                <Text
                  style={[
                    styles.modalSubTabTitle,
                    modalTab === 'ai' && styles.modalSubTabTitleActive,
                  ]}
                >
                  IA & Visión
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalSubTab, modalTab === 'basic' && styles.modalSubTabActive]}
                onPress={() => setModalTab('basic')}
                activeOpacity={0.8}
              >
                <Apple size={12} color={modalTab === 'basic' ? '#FAFAFA' : '#71717A'} />
                <Text
                  style={[
                    styles.modalSubTabTitle,
                    modalTab === 'basic' && styles.modalSubTabTitleActive,
                  ]}
                >
                  Básicos
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalSubTab, modalTab === 'frequent' && styles.modalSubTabActive]}
                onPress={() => setModalTab('frequent')}
                activeOpacity={0.8}
              >
                <Utensils size={12} color={modalTab === 'frequent' ? '#FAFAFA' : '#71717A'} />
                <Text
                  style={[
                    styles.modalSubTabTitle,
                    modalTab === 'frequent' && styles.modalSubTabTitleActive,
                  ]}
                >
                  Tupper ({frequentMeals.length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalSubTab,
                  modalTab === 'plate' && styles.modalSubTabActive,
                  results.length > 0 && modalTab !== 'plate' && styles.modalSubTabHighlight,
                ]}
                onPress={() => setModalTab('plate')}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.modalSubTabTitle,
                    modalTab === 'plate' && styles.modalSubTabTitleActive,
                    modalTab !== 'plate' && results.length > 0 && { color: '#38BDF8', fontWeight: '900' },
                  ]}
                >
                  Plato ({results.length})
                </Text>
              </TouchableOpacity>
            </View>

            {/* ── TAB 0: Entrada Principal por IA & Visión (Diseño Exacto del Mockup) ── */}
            {modalTab === 'ai' && (
              <ScrollView
                style={styles.modalBody}
                contentContainerStyle={styles.modalBodyContent}
                showsVerticalScrollIndicator={true}
                keyboardShouldPersistTaps="handled"
              >
                {/* 1. Selector de Tipo de Comida (Estilo Cápsula Dark del Mockup) */}
                <View style={styles.mealCapsuleRow}>
                  {(['breakfast', 'lunch', 'dinner', 'snack'] as MealType[]).map((t) => {
                    const active = modalMealType === t
                    return (
                      <TouchableOpacity
                        key={t}
                        onPress={() => setModalMealType(t)}
                        style={[styles.mealCapsulePill, active && styles.mealCapsulePillActive]}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.mealCapsuleText, active && styles.mealCapsuleTextActive]}>
                          {mealLabel[t]}
                        </Text>
                      </TouchableOpacity>
                    )
                  })}
                </View>

                {/* 2. Campo de Entrada de Texto con Micrófono */}
                <View style={styles.aiInputBox}>
                  <TextInput
                    style={styles.aiInputField}
                    placeholder="Describe tu comida o ingredientes..."
                    placeholderTextColor="#71717A"
                    value={foodText}
                    onChangeText={setFoodText}
                    multiline
                    textAlignVertical="top"
                  />
                  <TouchableOpacity
                    style={styles.micIconBox}
                    activeOpacity={0.7}
                    onPress={() => {
                      if (!foodText.trim()) {
                        setFoodText('1 plato de arroz con pechuga de pollo y verduras')
                      }
                    }}
                  >
                    <Mic size={22} color="#FFFFFF" strokeWidth={1.8} />
                  </TouchableOpacity>
                </View>

                {/* 3. Tres Tarjetas de Captura con IA y Borde Violeta Neón */}
                <View style={styles.visionCardsRow}>
                  {/* Card 1: Escanear Plato */}
                  <TouchableOpacity
                    style={styles.visionCard}
                    onPress={() => handleOpenSmartScannerMode('plate')}
                    activeOpacity={0.85}
                  >
                    <Camera size={22} color="#FFFFFF" strokeWidth={1.8} />
                    <Text style={styles.visionCardTitle}>Escanear{'\n'}Plato</Text>
                  </TouchableOpacity>

                  {/* Card 2: Tabla Nutricional */}
                  <TouchableOpacity
                    style={styles.visionCard}
                    onPress={() => handleOpenSmartScannerMode('label')}
                    activeOpacity={0.85}
                  >
                    <FileText size={22} color="#FFFFFF" strokeWidth={1.8} />
                    <Text style={styles.visionCardTitle}>Tabla{'\n'}Nutricional</Text>
                  </TouchableOpacity>

                  {/* Card 3: Código de Barras */}
                  <TouchableOpacity
                    style={styles.visionCard}
                    onPress={() => handleOpenSmartScannerMode('barcode')}
                    activeOpacity={0.85}
                  >
                    <Barcode size={22} color="#FFFFFF" strokeWidth={1.8} />
                    <Text style={styles.visionCardTitle}>Código{'\n'}de Barras</Text>
                  </TouchableOpacity>
                </View>

                {/* 4. Acceso Rápido a Básicos y Tupper */}
                <View style={styles.modalExtraNavRow}>
                  <TouchableOpacity
                    style={styles.modalExtraNavBtn}
                    onPress={() => setModalTab('basic')}
                    activeOpacity={0.8}
                  >
                    <Apple size={14} color="#A1A1AA" />
                    <Text style={styles.modalExtraNavText}>🍎 Alimentos Básicos</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.modalExtraNavBtn}
                    onPress={() => setModalTab('frequent')}
                    activeOpacity={0.8}
                  >
                    <Utensils size={14} color="#A1A1AA" />
                    <Text style={styles.modalExtraNavText}>🍱 Tupper ({frequentMeals.length})</Text>
                  </TouchableOpacity>
                </View>

                {/* 5. Botón de Acción Principal (Blanco según el mockup) */}
                {analysisState === 'loading' ? (
                  <View style={styles.whiteCtaBtn}>
                    <ActivityIndicator size="small" color="#09090B" />
                    <Text style={styles.whiteCtaBtnText}>ANALIZANDO CON IA...</Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={[
                      styles.whiteCtaBtn,
                      !foodText.trim() && results.length === 0 && styles.whiteCtaBtnDisabled,
                    ]}
                    onPress={() => {
                      if (foodText.trim()) {
                        handleAnalyzeText()
                      } else if (results.length > 0) {
                        setModalTab('plate')
                      }
                    }}
                    disabled={!foodText.trim() && results.length === 0}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.whiteCtaBtnText}>
                      {foodText.trim()
                        ? 'ANALIZAR CON IA'
                        : results.length > 0
                        ? `VER PLATO (${results.length} ALIMENTOS)`
                        : 'ANALIZAR CON IA'}
                    </Text>
                  </TouchableOpacity>
                )}
              </ScrollView>
            )}

            {/* ── TAB 1: Alimentos Básicos / Frutas / Proteínas / Carbos ── */}
            {modalTab === 'basic' && (
              <View style={{ flex: 1 }}>
                <CommonFoodsSelector
                  onAddFood={handleAddCommonFood}
                  onRemoveFood={handleRemoveCommonFoodByName}
                  onUpdateQuantity={handleUpdateCommonFoodQuantity}
                  plateItems={results}
                  onConfirmGoToPlate={() => setModalTab('plate')}
                />
              </View>
            )}

            {/* ── TAB 2: Comidas Frecuentes / Tupper & Ingredientes Usados ── */}
            {modalTab === 'frequent' && (
              <ScrollView
                style={styles.modalBody}
                contentContainerStyle={styles.modalBodyContent}
                showsVerticalScrollIndicator={true}
                keyboardShouldPersistTaps="handled"
              >
                {/* Sub-selector: Comidas Completas vs Ingredientes Usados */}
                <View style={styles.frequentSubSelectorRow}>
                  <TouchableOpacity
                    style={[styles.frequentSubPill, frequentSubTab === 'meals' && styles.frequentSubPillActive]}
                    onPress={() => setFrequentSubTab('meals')}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.frequentSubPillText,
                        frequentSubTab === 'meals' && styles.frequentSubPillTextActive,
                      ]}
                    >
                      🍱 Comidas ({frequentMeals.length})
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.frequentSubPill, frequentSubTab === 'ingredients' && styles.frequentSubPillActive]}
                    onPress={() => setFrequentSubTab('ingredients')}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.frequentSubPillText,
                        frequentSubTab === 'ingredients' && styles.frequentSubPillTextActive,
                      ]}
                    >
                      🥗 Ingredientes ({frequentIngredients.length})
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Sub-tab 1: Comidas Completas (con opción de desglose en acordeón) */}
                {frequentSubTab === 'meals' && (
                  <>
                    <Text style={styles.frequentSectionTitle}>
                      Toca para añadir la comida completa o desglosa sus ingredientes:
                    </Text>
                    {frequentMeals.length === 0 ? (
                      <View style={styles.emptyBox}>
                        <Utensils size={28} color="rgba(255,255,255,0.25)" />
                        <Text style={styles.emptyText}>Aún no tienes comidas guardadas en tu historial</Text>
                      </View>
                    ) : (
                      frequentMeals.map((fMeal) => {
                        const isExpanded = !!expandedMealIds[fMeal.id]
                        const foods = fMeal.foods_parsed || []
                        const foodNames = foods.map((f) => f.name).join(', ') || fMeal.raw_input

                        return (
                          <View key={fMeal.id} style={styles.frequentMealWrapper}>
                            <View style={styles.frequentCard}>
                              <View style={{ flex: 1, marginRight: 8 }}>
                                <Text style={styles.frequentCardTitle} numberOfLines={2}>
                                  {foodNames}
                                </Text>
                                <Text style={styles.frequentCardSub}>
                                  {fMeal.calories} kcal · P: {Math.round(fMeal.protein_g || 0)}g · C: {Math.round(fMeal.carbs_g || 0)}g · G: {Math.round(fMeal.fat_g || 0)}g
                                </Text>
                              </View>

                              {/* Primary Action: Load whole meal */}
                              <TouchableOpacity
                                style={styles.frequentLoadBadge}
                                onPress={() => handleRepeatMeal(fMeal)}
                                activeOpacity={0.8}
                              >
                                <Text style={styles.frequentLoadBadgeText}>+ Toda</Text>
                              </TouchableOpacity>
                            </View>

                            {/* Accordion Toggle for Individual Ingredients */}
                            {foods.length > 0 && (
                              <View style={styles.frequentAccordionContainer}>
                                <TouchableOpacity
                                  style={styles.frequentAccordionBtn}
                                  onPress={() => handleToggleExpandMeal(fMeal.id)}
                                  activeOpacity={0.8}
                                >
                                  <Text style={styles.frequentAccordionBtnText}>
                                    {isExpanded
                                      ? '▲ Ocultar ingredientes'
                                      : `▼ Desglosar (${foods.length} ingredientes)`}
                                  </Text>
                                </TouchableOpacity>

                                {isExpanded && (
                                  <View style={styles.frequentIngredientsList}>
                                    {foods.map((foodItem, idx) => (
                                      <View key={idx} style={styles.frequentIngredientItemRow}>
                                        <View style={{ flex: 1, marginRight: 8 }}>
                                          <Text style={styles.frequentIngredientName}>{foodItem.name}</Text>
                                          <Text style={styles.frequentIngredientMeta}>
                                            {foodItem.quantity_g}g · {foodItem.calories} kcal (P: {foodItem.protein_g}g C: {foodItem.carbs_g}g G: {foodItem.fat_g}g)
                                          </Text>
                                        </View>
                                        <TouchableOpacity
                                          style={styles.addSingleIngBtn}
                                          onPress={() => handleAddSingleIngredient(foodItem)}
                                          activeOpacity={0.8}
                                        >
                                          <Plus size={12} color="#38BDF8" />
                                          <Text style={styles.addSingleIngBtnText}>Añadir</Text>
                                        </TouchableOpacity>
                                      </View>
                                    ))}
                                  </View>
                                )}
                              </View>
                            )}
                          </View>
                        )
                      })
                    )}
                  </>
                )}

                {/* Sub-tab 2: Ingredientes Individuales Frecuentes */}
                {frequentSubTab === 'ingredients' && (
                  <>
                    <Text style={styles.frequentSectionTitle}>
                      Ingredientes que ya has usado en tus comidas anteriores:
                    </Text>
                    {frequentIngredients.length === 0 ? (
                      <View style={styles.emptyBox}>
                        <Apple size={28} color="rgba(255,255,255,0.25)" />
                        <Text style={styles.emptyText}>Aún no hay ingredientes registrados en tu historial</Text>
                      </View>
                    ) : (
                      frequentIngredients.map((item, idx) => (
                        <View key={idx} style={styles.frequentIngredientCard}>
                          <View style={{ flex: 1, marginRight: 10 }}>
                            <Text style={styles.frequentIngredientCardTitle}>{item.name}</Text>
                            <Text style={styles.frequentIngredientCardSub}>
                              Porción típica: {item.quantity_g || 100}g · {item.calories || 100} kcal
                            </Text>
                            <Text style={styles.frequentIngredientCardMacros}>
                              P: {item.protein_g || 0}g · C: {item.carbs_g || 0}g · G: {item.fat_g || 0}g
                            </Text>
                          </View>

                          <TouchableOpacity
                            style={styles.frequentAddIngBadge}
                            onPress={() => handleAddSingleIngredient(item)}
                            activeOpacity={0.8}
                          >
                            <Plus size={14} color="#38BDF8" />
                            <Text style={styles.frequentAddIngBadgeText}>+ Al Plato</Text>
                          </TouchableOpacity>
                        </View>
                      ))
                    )}
                  </>
                )}
              </ScrollView>
            )}

            {/* ── TAB 3: Revisión del Plato Actual (Mi Plato Rediseñado) ── */}
            {modalTab === 'plate' && (
              <ScrollView
                style={styles.modalBody}
                contentContainerStyle={styles.modalBodyContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                {results.length === 0 ? (
                  <View style={styles.emptyPlateBox}>
                    <Utensils size={36} color="rgba(255,255,255,0.2)" />
                    <Text style={styles.emptyPlateTitle}>Tu plato está vacío</Text>
                    <Text style={styles.emptyPlateSub}>
                      Elige alimentos desde '🍎 Básicos', usa '🍱 Tupper' o el '📸 Escáner'.
                    </Text>
                    <TouchableOpacity
                      style={styles.emptyPlateActionBtn}
                      onPress={() => setModalTab('basic')}
                      activeOpacity={0.85}
                    >
                      <Text style={styles.emptyPlateActionText}>Ver Alimentos Básicos</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <>
                    <View style={styles.resultSectionTitleRow}>
                      <Text style={styles.resultSectionTitle}>
                        {editingFoodLogId ? 'EDITANDO COMIDA REGISTRADA' : 'ALIMENTOS EN TU PLATO'}
                      </Text>
                    </View>

                    {/* Result Items List with Card design based on Image 2 reference */}
                    <View style={styles.resultItemsList}>
                      {results.map((f, i) => (
                        <View key={i} style={styles.plateItemCard}>
                          {/* Left Column: Title, Calories, Macros */}
                          <View style={styles.plateItemLeftCol}>
                            <Text style={styles.plateItemName} numberOfLines={2}>
                              {f.name}
                            </Text>
                            <Text style={styles.plateItemCals}>{f.calories || 0} kcal</Text>
                            <Text style={styles.plateItemMacros}>
                              P: {(f.protein_g || 0).toFixed(1)}g  C: {(f.carbs_g || 0).toFixed(1)}g  G: {(f.fat_g || 0).toFixed(1)}g
                            </Text>
                          </View>

                          {/* Right Column: Stepper Capsule & Quitar Button */}
                          <View style={styles.plateItemRightCol}>
                            {/* Stepper Capsule */}
                            <View style={styles.plateStepperPill}>
                              <TouchableOpacity
                                style={styles.plateStepBtn}
                                onPress={() => updateItemGrams(i, (f.quantity_g || 100) - 25)}
                                hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                                activeOpacity={0.7}
                              >
                                <Minus size={13} color="#D4D4D8" />
                              </TouchableOpacity>

                              <View style={styles.plateGramInputBox}>
                                <TextInput
                                  style={styles.plateGramTextInput}
                                  value={f.quantity_g !== undefined ? String(f.quantity_g) : '100'}
                                  onChangeText={(txt) => handleGramsTextChange(i, txt)}
                                  keyboardType="numeric"
                                  selectTextOnFocus
                                />
                                <Text style={styles.plateGramUnitLabel}>g</Text>
                              </View>

                              <TouchableOpacity
                                style={styles.plateStepBtn}
                                onPress={() => updateItemGrams(i, (f.quantity_g || 100) + 25)}
                                hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                                activeOpacity={0.7}
                              >
                                <Plus size={13} color="#D4D4D8" />
                              </TouchableOpacity>
                            </View>

                            {/* Trash / Quitar action */}
                            <TouchableOpacity
                              style={styles.plateRemoveBtn}
                              onPress={() => handleRemoveItem(i)}
                              activeOpacity={0.7}
                            >
                              <Trash2 size={12} color="#F87171" style={{ marginRight: 3 }} />
                              <Text style={styles.plateRemoveText}>Quitar</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      ))}
                    </View>

                    {/* Quick Add More Foods Buttons */}
                    <View style={styles.addMoreOptionsRow}>
                      <TouchableOpacity
                        style={styles.addMoreFoodsBtn}
                        onPress={() => setModalTab('basic')}
                        activeOpacity={0.8}
                      >
                        <Plus size={13} color="#38BDF8" />
                        <Text style={styles.addMoreFoodsText}>Añadir Básico</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.addMoreFoodsBtn, { borderColor: 'rgba(167, 139, 250, 0.3)', backgroundColor: 'rgba(167, 139, 250, 0.08)' }]}
                        onPress={() => setModalTab('frequent')}
                        activeOpacity={0.8}
                      >
                        <Utensils size={13} color="#A78BFA" />
                        <Text style={[styles.addMoreFoodsText, { color: '#A78BFA' }]}>De Tupper</Text>
                      </TouchableOpacity>
                    </View>

                    {/* Macro Summary Row (3 Columns) */}
                    <View style={styles.plateMacroSummaryRow}>
                      <View style={styles.plateMacroCol}>
                        <Text style={styles.plateMacroVal}>
                          {results.reduce((s, r) => s + (r.protein_g || 0), 0).toFixed(0)}g
                        </Text>
                        <Text style={styles.plateMacroLabel}>Proteína</Text>
                      </View>
                      <View style={styles.plateMacroCol}>
                        <Text style={styles.plateMacroVal}>
                          {results.reduce((s, r) => s + (r.carbs_g || 0), 0).toFixed(0)}g
                        </Text>
                        <Text style={styles.plateMacroLabel}>Carbos</Text>
                      </View>
                      <View style={styles.plateMacroCol}>
                        <Text style={styles.plateMacroVal}>
                          {results.reduce((s, r) => s + (r.fat_g || 0), 0).toFixed(0)}g
                        </Text>
                        <Text style={styles.plateMacroLabel}>Grasas</Text>
                      </View>
                    </View>

                    {/* Main Confirm & Save Button (White High-Contrast Pill) */}
                    <TouchableOpacity
                      style={[styles.plateConfirmBtn, saving && { opacity: 0.65 }]}
                      onPress={handleSaveMeal}
                      disabled={saving}
                      activeOpacity={0.9}
                    >
                      {saving ? (
                        <ActivityIndicator color="#09090B" />
                      ) : (
                        <>
                          <Check size={18} color="#09090B" strokeWidth={2.8} />
                          <Text style={styles.plateConfirmBtnText}>
                            {editingFoodLogId ? 'CONFIRMAR Y GUARDAR CAMBIOS' : 'CONFIRMAR Y REGISTRAR PLATO'}
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>

                    {/* Discard Meal Action */}
                    <TouchableOpacity
                      style={styles.plateDiscardMealBtn}
                      onPress={handleConfirmDiscardDraft}
                      activeOpacity={0.7}
                    >
                      <Trash2 size={14} color="#EF4444" />
                      <Text style={styles.plateDiscardMealBtnText}>
                        {editingFoodLogId ? 'Cancelar y descartar cambios' : 'Descartar plato'}
                      </Text>
                    </TouchableOpacity>
                  </>
                )}
              </ScrollView>
            )}

            {/* Quick Sticky Banner to Switch to Plate when inside other tabs */}
            {modalTab !== 'plate' && results.length > 0 && (
              <TouchableOpacity
                style={styles.plateQuickStickyBar}
                onPress={() => setModalTab('plate')}
                activeOpacity={0.9}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={styles.plateQuickStickyText}>
                    🍱 {results.length} en plato · {results.reduce((s, r) => s + r.calories, 0)} kcal
                  </Text>
                </View>
                <View style={styles.plateQuickStickyAction}>
                  <Text style={styles.plateQuickStickyActionText}>Ver Plato y Guardar</Text>
                  <ChevronRight size={14} color="#0A0C14" />
                </View>
              </TouchableOpacity>
            )}
          </Animated.View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Persistent Floating Draft Dock (Minimizable Meal Bar) ── */}
      {results.length > 0 && !modalVisible && !editingFoodLogId && (
        <View style={styles.floatingDraftDock}>
          <View style={styles.floatingDraftTouch}>
            <TouchableOpacity
              style={styles.floatingDraftInfoArea}
              onPress={() => {
                setModalTab(results.length > 0 ? 'plate' : 'basic')
                setModalVisible(true)
              }}
              activeOpacity={0.75}
            >
              <View style={styles.floatingDraftIconBox}>
                <Utensils size={18} color="#38BDF8" />
                <View style={styles.floatingDraftBadge}>
                  <Text style={styles.floatingDraftBadgeText}>{results.length}</Text>
                </View>
              </View>

              <View style={styles.floatingDraftInfo}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={styles.floatingDraftTitle}>
                    {mealLabel[modalMealType]} ({results.length} {results.length === 1 ? 'alimento' : 'alimentos'})
                  </Text>
                  <View style={styles.liveDraftIndicator} />
                </View>
                <Text style={styles.floatingDraftMacros}>
                  {results.reduce((s, r) => s + r.calories, 0)} kcal · P:{Math.round(results.reduce((s, r) => s + r.protein_g, 0))}g · C:{Math.round(results.reduce((s, r) => s + r.carbs_g, 0))}g · G:{Math.round(results.reduce((s, r) => s + r.fat_g, 0))}g
                </Text>
              </View>
            </TouchableOpacity>

            <View style={styles.floatingDraftButtons}>
              <TouchableOpacity
                style={styles.floatingDraftOpenBtn}
                onPress={() => {
                  setModalTab('plate')
                  setModalVisible(true)
                }}
                activeOpacity={0.8}
                hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
              >
                <Text style={styles.floatingDraftOpenText}>Ver plato ↗</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.floatingDraftDiscardBtn}
                onPress={handleConfirmDiscardDraft}
                activeOpacity={0.6}
                hitSlop={{ top: 12, bottom: 12, left: 8, right: 12 }}
              >
                <Trash2 size={16} color="#EF4444" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Modal Cierra tus Macros */}
      <Modal
        visible={macroCloserVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setMacroCloserVisible(false)}
      >
        <View style={styles.macroCloserOverlay}>
          <View style={styles.macroCloserSheet}>
            <View style={styles.macroCloserHeader}>
              <View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <Sparkles size={14} color="#38BDF8" />
                  <Text style={styles.macroCloserBadge}>CIERRA TUS MACROS</Text>
                </View>
                <Text style={styles.macroCloserTitle}>Recetas Rápidas para Cuadrar</Text>
              </View>
              <TouchableOpacity onPress={() => setMacroCloserVisible(false)} style={styles.closeBtn}>
                <X size={18} color="rgba(255,255,255,0.6)" />
              </TouchableOpacity>
            </View>

            {macroCloserLoading ? (
              <View style={styles.macroCloserLoading}>
                <ActivityIndicator size="large" color="#38BDF8" />
                <Text style={styles.macroCloserLoadingText}>
                  Calculando recetas con ingredientes comunes...
                </Text>
              </View>
            ) : macroCloserData ? (
              <ScrollView style={styles.macroCloserBody} showsVerticalScrollIndicator={false}>
                {/* Targets Restantes */}
                <View style={styles.remainingCard}>
                  <Text style={styles.remainingCardTitle}>Te faltan para tu meta:</Text>
                  <View style={styles.remainingGrid}>
                    <View style={styles.remainingBox}>
                      <Text style={styles.remainingVal}>
                        {Math.round(macroCloserData.remainingTarget?.calories || 0)}
                      </Text>
                      <Text style={styles.remainingLabel}>kcal</Text>
                    </View>
                    <View style={styles.remainingBox}>
                      <Text style={[styles.remainingVal, { color: '#38BDF8' }]}>
                        {Math.round(macroCloserData.remainingTarget?.protein || 0)}g
                      </Text>
                      <Text style={styles.remainingLabel}>Proteína</Text>
                    </View>
                    <View style={styles.remainingBox}>
                      <Text style={[styles.remainingVal, { color: '#FBBF24' }]}>
                        {Math.round(macroCloserData.remainingTarget?.carbs || 0)}g
                      </Text>
                      <Text style={styles.remainingLabel}>Carbos</Text>
                    </View>
                    <View style={styles.remainingBox}>
                      <Text style={[styles.remainingVal, { color: '#EC4899' }]}>
                        {Math.round(macroCloserData.remainingTarget?.fat || 0)}g
                      </Text>
                      <Text style={styles.remainingLabel}>Grasas</Text>
                    </View>
                  </View>
                </View>

                {/* Sugerencias de Recetas */}
                {macroCloserData.suggestions?.map((sug: any, idx: number) => (
                  <View key={sug.id || idx} style={styles.suggestionCard}>
                    <View style={styles.suggestionHeader}>
                      <Text style={styles.suggestionName}>{sug.name}</Text>
                      <Text style={styles.prepTimeTag}>{sug.prepTimeMinutes} min</Text>
                    </View>

                    {/* Ingredientes */}
                    <View style={styles.ingredientsListBox}>
                      {sug.ingredients?.map((ing: any, i: number) => (
                        <Text key={i} style={styles.ingredientItemText}>
                          • {ing.name} ({ing.amount})
                        </Text>
                      ))}
                    </View>

                    {/* Instrucciones */}
                    <Text style={styles.instructionText}>{sug.quickRecipeInstructions}</Text>

                    {/* Macros de la sugerencia */}
                    <View style={styles.suggestionMacrosRow}>
                      <Text style={styles.sugCalText}>{sug.macros?.calories} kcal</Text>
                      <Text style={styles.sugPText}>P: {sug.macros?.protein}g</Text>
                      <Text style={styles.sugCText}>C: {sug.macros?.carbs}g</Text>
                      <Text style={styles.sugFText}>G: {sug.macros?.fat}g</Text>
                    </View>

                    {/* Botón de Añadir */}
                    <TouchableOpacity
                      style={styles.addRecipeBtn}
                      onPress={async () => {
                        const parsedFoods: FoodItemParsed[] = (sug.ingredients || []).map((ing: any) => ({
                          name: ing.name,
                          quantity_g: ing.gramsApprox || 100,
                          calories: Math.round(
                            (sug.macros?.calories || 200) / Math.max(1, sug.ingredients.length)
                          ),
                          protein_g: Number(
                            ((sug.macros?.protein || 20) / Math.max(1, sug.ingredients.length)).toFixed(1)
                          ),
                          carbs_g: Number(
                            ((sug.macros?.carbs || 10) / Math.max(1, sug.ingredients.length)).toFixed(1)
                          ),
                          fat_g: Number(
                            ((sug.macros?.fat || 5) / Math.max(1, sug.ingredients.length)).toFixed(1)
                          ),
                          confidence: 'high',
                        }))

                        await logFood({
                          mealType: 'snack',
                          rawInput: sug.name,
                          foodsParsed: parsedFoods,
                          calories: sug.macros?.calories || 0,
                          proteinG: sug.macros?.protein || 0,
                          carbsG: sug.macros?.carbs || 0,
                          fatG: sug.macros?.fat || 0,
                        })
                        setMacroCloserVisible(false)
                      }}
                    >
                      <Check size={16} color="#0F172A" />
                      <Text style={styles.addRecipeBtnText}>Registrar como Snack</Text>
                    </TouchableOpacity>
                  </View>
                ))}

                {macroCloserData.nutritionalTip && (
                  <Text style={styles.macroCloserTip}>💡 {macroCloserData.nutritionalTip}</Text>
                )}
              </ScrollView>
            ) : null}
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#09090B',
  },
  content: {
    padding: 16,
    gap: 14,
  },
  header: {
    gap: 4,
    paddingBottom: 2,
  },
  headerTitle: {
    color: '#FAFAFA',
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  dateSelectorBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingVertical: 2,
  },
  dateSubtitle: {
    color: '#A1A1AA',
    fontSize: 14,
    fontWeight: '500',
  },
  analysisCardsContainer: {
    gap: 12,
  },
  evolutionMiniCard: {
    backgroundColor: '#18181B',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#27272A',
    gap: 10,
  },
  evolutionMiniHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  evolutionMiniTitle: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  evolutionStatsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  evolutionStatsBadgeText: {
    color: '#38BDF8',
    fontSize: 10.5,
    fontWeight: '700',
  },
  evolutionPillsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  evolutionMiniPill: {
    flex: 1,
    backgroundColor: '#27272A',
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 6,
    alignItems: 'center',
  },
  evolutionMiniPillLabel: {
    color: '#A1A1AA',
    fontSize: 9.5,
    fontWeight: '600',
    marginBottom: 2,
  },
  evolutionMiniPillVal: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FAFAFA',
    fontVariant: ['tabular-nums'],
  },
  evolutionMiniPillUnit: {
    fontSize: 9,
    fontWeight: '500',
    color: '#71717A',
  },
  healthMiniCard: {
    backgroundColor: '#18181B',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#27272A',
    gap: 10,
  },
  healthMiniHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  healthMiniTitle: {
    color: '#10B981',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  healthAiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(124, 58, 237, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.3)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  healthAiBadgeText: {
    color: '#C4B5FD',
    fontSize: 10.5,
    fontWeight: '700',
  },
  healthPillsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  healthMiniPill: {
    flex: 1,
    backgroundColor: '#27272A',
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 6,
    alignItems: 'center',
  },
  healthMiniPillLabel: {
    color: '#A1A1AA',
    fontSize: 9.5,
    fontWeight: '600',
    marginBottom: 2,
  },
  healthMiniPillVal: {
    fontSize: 11,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  aiSectionCard: {
    backgroundColor: '#18181B',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#27272A',
    gap: 12,
  },
  aiSectionTitle: {
    color: '#FAFAFA',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  aiPillsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  aiGlowingPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(124, 58, 237, 0.12)',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: '#8B5CF6',
  },
  aiGlowingPillText: {
    color: '#FAFAFA',
    fontSize: 13,
    fontWeight: '600',
  },
  filterScroll: {
    gap: 8,
    paddingVertical: 2,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#18181B',
    borderWidth: 1,
    borderColor: '#27272A',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
  },
  filterPillActive: {
    backgroundColor: '#27272A',
    borderColor: '#3F3F46',
  },
  filterPillText: {
    color: '#A1A1AA',
    fontSize: 13,
    fontWeight: '600',
  },
  filterPillTextActive: {
    color: '#FAFAFA',
    fontWeight: '800',
  },
  logsList: {
    gap: 14,
  },
  emptyBox: {
    backgroundColor: '#18181B',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: '#27272A',
  },
  emptyText: {
    color: '#71717A',
    fontSize: 13,
  },
  emptyAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#27272A',
    borderWidth: 1,
    borderColor: '#3F3F46',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  emptyAddBtnText: {
    color: '#FAFAFA',
    fontSize: 12,
    fontWeight: '700',
  },
  mealCard: {
    backgroundColor: '#18181B',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#27272A',
    gap: 12,
  },
  mealCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mealCardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  mealIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#27272A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mealTypeName: {
    color: '#FAFAFA',
    fontSize: 16,
    fontWeight: '700',
  },
  mealMacrosSummary: {
    color: '#A1A1AA',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 1,
  },
  mealCardHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  mealActionIconBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: '#27272A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  foodItemsContainer: {
    backgroundColor: '#141417',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
  },
  foodItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  foodItemRowBorder: {
    borderTopWidth: 1,
    borderTopColor: '#27272A',
  },
  foodItemLeftCol: {
    flex: 1,
    marginRight: 12,
    gap: 3,
  },
  foodItemTitle: {
    color: '#FAFAFA',
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 18,
  },
  foodItemGramsSub: {
    color: '#71717A',
    fontSize: 12,
    fontWeight: '500',
  },
  foodItemCalories: {
    color: '#FAFAFA',
    fontSize: 15,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  fabSquareBtn: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#FAFAFA',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#121214',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 18,
    paddingTop: 6,
    borderTopWidth: 1,
    borderColor: '#27272A',
    height: '93%',
    maxHeight: '94%',
    flex: 1,
  },
  modalHandleTouchZone: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 8,
  },
  modalHandle: {
    width: 44,
    height: 5,
    backgroundColor: '#3F3F46',
    borderRadius: 3,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalHeaderSubtitle: {
    color: '#A1A1AA',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  modalHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  minimizeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.25)',
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 10,
  },
  minimizeBtnText: {
    color: '#38BDF8',
    fontSize: 12,
    fontWeight: '800',
  },
  modalTitle: {
    color: '#FAFAFA',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#18181B',
    borderWidth: 1,
    borderColor: '#27272A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backToAiHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  backToAiHeaderText: {
    color: '#A1A1AA',
    fontSize: 12,
    fontWeight: '600',
  },
  mealCapsuleRow: {
    flexDirection: 'row',
    backgroundColor: '#18181B',
    borderRadius: 30,
    padding: 4,
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#27272A',
    marginBottom: 14,
  },
  mealCapsulePill: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
  },
  mealCapsulePillActive: {
    borderWidth: 1.5,
    borderColor: '#FAFAFA',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  mealCapsuleText: {
    color: '#71717A',
    fontSize: 13,
    fontWeight: '600',
  },
  mealCapsuleTextActive: {
    color: '#FAFAFA',
    fontWeight: '800',
  },
  aiInputBox: {
    backgroundColor: '#18181B',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#27272A',
    padding: 16,
    minHeight: 140,
    position: 'relative',
    marginBottom: 14,
  },
  aiInputField: {
    color: '#FAFAFA',
    fontSize: 15,
    lineHeight: 22,
    minHeight: 75,
    paddingBottom: 28,
  },
  micIconBox: {
    position: 'absolute',
    bottom: 12,
    right: 14,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  visionCardsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  visionCard: {
    flex: 1,
    backgroundColor: '#13111C',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(139, 92, 246, 0.45)',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
    minHeight: 96,
    justifyContent: 'space-between',
  },
  visionCardTitle: {
    color: '#FAFAFA',
    fontSize: 12.5,
    fontWeight: '700',
    lineHeight: 16,
    marginTop: 8,
  },
  modalExtraNavRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  modalExtraNavBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#18181B',
    borderRadius: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#27272A',
  },
  modalExtraNavText: {
    color: '#A1A1AA',
    fontSize: 12,
    fontWeight: '600',
  },
  whiteCtaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FAFAFA',
    borderRadius: 22,
    paddingVertical: 16,
    marginTop: 2,
    shadowColor: '#000000',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  whiteCtaBtnDisabled: {
    opacity: 0.35,
  },
  whiteCtaBtnText: {
    color: '#09090B',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  modalMealTypeRow: {
    gap: 8,
    paddingBottom: 16,
  },
  modalMealPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  modalMealPillActive: {
    backgroundColor: '#0284C7',
    borderColor: '#0284C7',
  },
  modalMealPillText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    fontWeight: '700',
  },
  modalMealPillTextActive: {
    color: '#FFFFFF',
  },
  modalBody: {
    flex: 1,
  },
  modalBodyContent: {
    paddingBottom: 36,
  },
  cameraBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(2,132,199,0.1)',
    borderWidth: 1.5,
    borderColor: 'rgba(2,132,199,0.3)',
    borderRadius: 18,
    padding: 16,
    gap: 14,
    marginBottom: 10,
  },
  cameraIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(2,132,199,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraBtnTitle: {
    color: '#38BDF8',
    fontSize: 15,
    fontWeight: '800',
  },
  cameraBtnSub: {
    color: 'rgba(56,189,248,0.6)',
    fontSize: 11,
    marginTop: 2,
  },
  galleryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    paddingVertical: 12,
    gap: 8,
    marginBottom: 14,
  },
  galleryBtnText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
    fontWeight: '600',
  },
  amberWarning: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(245,158,11,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.2)',
    borderRadius: 14,
    padding: 12,
    gap: 8,
    marginBottom: 16,
  },
  amberWarningText: {
    flex: 1,
    color: '#F59E0B',
    fontSize: 11.5,
    lineHeight: 16,
  },
  modalDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  dividerText: {
    color: 'rgba(255,255,255,0.25)',
    fontSize: 11,
    fontWeight: '600',
  },
  foodTextInput: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    color: '#FFFFFF',
    fontSize: 14,
    padding: 14,
    minHeight: 70,
    textAlignVertical: 'top',
    marginBottom: 14,
  },
  analyzeBtn: {
    backgroundColor: '#0284C7',
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: 'center',
  },
  analyzeBtnDisabled: {
    backgroundColor: '#1C1C1C',
  },
  analyzeBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  loadingStateBox: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    fontWeight: '600',
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  resultSub: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  resultCalories: {
    color: '#38BDF8',
    fontSize: 22,
    fontWeight: '900',
  },
  resultItemsList: {
    gap: 8,
    marginBottom: 16,
  },
  resultItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  resultItemName: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  resultItemGrams: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 11,
  },
  resultItemCals: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    fontWeight: '700',
  },
  resultItemMacros: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 10,
  },
  resultMacroGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  resultMacroBox: {
    flex: 1,
    backgroundColor: '#181818',
    borderRadius: 14,
    paddingVertical: 10,
    alignItems: 'center',
  },
  resultMacroVal: {
    fontSize: 16,
    fontWeight: '800',
  },
  resultMacroLabel: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 10,
    marginTop: 2,
  },
  resultActionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  workoutBurnedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(249, 115, 22, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(249, 115, 22, 0.3)',
    gap: 6,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  workoutBurnedBadgeText: {
    color: '#FB923C',
    fontSize: 11.5,
    fontWeight: '700',
  },
  logFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.04)',
  },
  logActionsBtnGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  editMealBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.25)',
  },
  editMealBtnText: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '700',
  },
  repeatMealBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(167, 139, 250, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(167, 139, 250, 0.25)',
  },
  repeatMealBtnText: {
    color: '#A78BFA',
    fontSize: 11,
    fontWeight: '700',
  },
  modalSubTabRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 14,
    padding: 4,
    marginBottom: 14,
    gap: 4,
  },
  modalSubTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 10,
  },
  modalSubTabActive: {
    backgroundColor: '#0284C7',
  },
  modalSubTabTitle: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    fontWeight: '700',
  },
  modalSubTabTitleActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  modalSubTabHighlight: {
    borderColor: 'rgba(56, 189, 248, 0.35)',
    borderWidth: 1,
  },
  frequentSectionTitle: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    marginBottom: 10,
  },
  /* ── Frequent Sub Selector (Comidas vs Ingredientes) ── */
  frequentSubSelectorRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 3,
    marginBottom: 12,
    gap: 4,
  },
  frequentSubPill: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    borderRadius: 9,
  },
  frequentSubPillActive: {
    backgroundColor: '#0284C7',
  },
  frequentSubPillText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11.5,
    fontWeight: '700',
  },
  frequentSubPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  /* ── Frequent Meals & Accordion ── */
  frequentMealWrapper: {
    backgroundColor: '#181A20',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    marginBottom: 10,
    overflow: 'hidden',
  },
  frequentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
  },
  frequentCardTitle: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '700',
    marginBottom: 2,
  },
  frequentCardSub: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
  },
  frequentLoadBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
  },
  frequentLoadBadgeText: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '800',
  },
  frequentAccordionContainer: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  frequentAccordionBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  frequentAccordionBtnText: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '700',
  },
  frequentIngredientsList: {
    paddingHorizontal: 12,
    paddingBottom: 8,
    gap: 6,
  },
  frequentIngredientItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
  },
  frequentIngredientName: {
    color: '#E2E8F0',
    fontSize: 12,
    fontWeight: '600',
  },
  frequentIngredientMeta: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 10,
    marginTop: 1,
  },
  addSingleIngBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  addSingleIngBtnText: {
    color: '#38BDF8',
    fontSize: 10.5,
    fontWeight: '800',
  },
  /* ── Frequent Ingredients Sub-Tab ── */
  frequentIngredientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#181A20',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    marginBottom: 8,
  },
  frequentIngredientCardTitle: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '700',
    marginBottom: 2,
  },
  frequentIngredientCardSub: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
    marginBottom: 1,
  },
  frequentIngredientCardMacros: {
    color: 'rgba(56, 189, 248, 0.8)',
    fontSize: 10.5,
    fontWeight: '600',
  },
  frequentAddIngBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
  },
  frequentAddIngBadgeText: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '800',
  },
  /* ── Result / Plate Styles ── */
  resultCountSub: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 1,
  },
  resultItemCard: {
    backgroundColor: '#181A20',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    gap: 8,
  },
  portionControlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  portionLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    fontWeight: '600',
  },
  portionButtonGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  portionBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#262A36',
    alignItems: 'center',
    justifyContent: 'center',
  },
  portionGramInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
    paddingHorizontal: 6,
    minWidth: 64,
    height: 30,
    justifyContent: 'center',
  },
  portionGramTextInput: {
    color: '#38BDF8',
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
    paddingVertical: 0,
    minWidth: 32,
  },
  portionGramUnitLabel: {
    color: 'rgba(56, 189, 248, 0.7)',
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 1,
  },
  addMoreOptionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: 10,
  },
  discardBtn: {
    flex: 1,
    backgroundColor: '#1C1C1C',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  discardBtnText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 14,
    fontWeight: '700',
  },
  saveMealBtn: {
    flex: 1,
    backgroundColor: '#0284C7',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveMealBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  macroCloserOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
  },
  macroCloserSheet: {
    backgroundColor: '#090D16',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '88%',
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  macroCloserHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  macroCloserBadge: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  macroCloserTitle: {
    color: '#F8FAFC',
    fontSize: 17,
    fontWeight: '700',
  },
  macroCloserLoading: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  macroCloserLoadingText: {
    color: '#94A3B8',
    fontSize: 13,
    marginTop: 12,
  },
  macroCloserBody: {
    padding: 20,
  },
  remainingCard: {
    backgroundColor: '#0F172A',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  remainingCardTitle: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 10,
  },
  remainingGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  remainingBox: {
    flex: 1,
    backgroundColor: '#1E293B',
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
  },
  remainingVal: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '800',
  },
  remainingLabel: {
    color: '#94A3B8',
    fontSize: 10,
    marginTop: 2,
  },
  suggestionCard: {
    backgroundColor: '#0F172A',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  suggestionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  suggestionName: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
  },
  prepTimeTag: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '700',
    backgroundColor: '#0B2238',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  ingredientsListBox: {
    marginBottom: 8,
  },
  ingredientItemText: {
    color: '#94A3B8',
    fontSize: 12,
    lineHeight: 18,
  },
  instructionText: {
    color: '#CBD5E1',
    fontSize: 12,
    lineHeight: 17,
    fontStyle: 'italic',
    marginBottom: 12,
  },
  suggestionMacrosRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  sugCalText: {
    color: '#FB923C',
    fontSize: 13,
    fontWeight: '800',
  },
  sugPText: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '600',
  },
  sugCText: {
    color: '#FBBF24',
    fontSize: 11,
    fontWeight: '600',
  },
  sugFText: {
    color: '#EC4899',
    fontSize: 11,
    fontWeight: '600',
  },
  addRecipeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#38BDF8',
    paddingVertical: 10,
    borderRadius: 10,
  },
  addRecipeBtnText: {
    color: '#0F172A',
    fontSize: 13,
    fontWeight: '700',
  },
  macroCloserTip: {
    color: '#94A3B8',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 30,
    lineHeight: 18,
  },
  emptyPlateBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36,
    paddingHorizontal: 24,
    gap: 8,
  },
  emptyPlateTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  emptyPlateSub: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  emptyPlateActionBtn: {
    marginTop: 8,
    backgroundColor: '#0284C7',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 12,
  },
  emptyPlateActionText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '800',
  },
  resultSectionTitleRow: {
    marginBottom: 12,
  },
  resultSectionTitle: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  plateItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#18181B',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  plateItemLeftCol: {
    flex: 1,
    paddingRight: 10,
  },
  plateItemName: {
    color: '#FAFAFA',
    fontSize: 14.5,
    fontWeight: '700',
    marginBottom: 3,
  },
  plateItemCals: {
    color: '#38BDF8',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  plateItemMacros: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11.5,
    fontWeight: '500',
  },
  plateItemRightCol: {
    alignItems: 'flex-end',
    gap: 6,
  },
  plateStepperPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#27272A',
    borderRadius: 20,
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  plateStepBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  plateGramInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 5,
  },
  plateGramTextInput: {
    color: '#FAFAFA',
    fontSize: 13.5,
    fontWeight: '800',
    textAlign: 'center',
    minWidth: 30,
    padding: 0,
  },
  plateGramUnitLabel: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 11.5,
    fontWeight: '600',
    marginLeft: 1,
  },
  plateRemoveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderRadius: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
  },
  plateRemoveText: {
    color: '#F87171',
    fontSize: 10.5,
    fontWeight: '700',
  },
  addMoreFoodsBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(56, 189, 248, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.25)',
    borderRadius: 14,
    paddingVertical: 11,
  },
  addMoreFoodsText: {
    color: '#38BDF8',
    fontSize: 12.5,
    fontWeight: '700',
  },
  plateMacroSummaryRow: {
    flexDirection: 'row',
    backgroundColor: '#18181B',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    paddingVertical: 14,
    marginBottom: 18,
  },
  plateMacroCol: {
    flex: 1,
    alignItems: 'center',
  },
  plateMacroVal: {
    color: '#FAFAFA',
    fontSize: 17,
    fontWeight: '900',
  },
  plateMacroLabel: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  plateConfirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FAFAFA',
    borderRadius: 26,
    paddingVertical: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 10,
  },
  plateConfirmBtnText: {
    color: '#09090B',
    fontSize: 13.5,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  plateDiscardMealBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    marginBottom: 20,
    borderRadius: 12,
  },
  plateDiscardMealBtnText: {
    color: '#EF4444',
    fontSize: 12.5,
    fontWeight: '700',
  },
  removeItemBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  removeItemText: {
    color: '#EF4444',
    fontSize: 11,
    fontWeight: '700',
  },
  plateQuickStickyBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#38BDF8',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginTop: 10,
  },
  plateQuickStickyText: {
    color: '#080C14',
    fontSize: 12.5,
    fontWeight: '800',
  },
  plateQuickStickyAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  plateQuickStickyActionText: {
    color: '#080C14',
    fontSize: 12,
    fontWeight: '900',
  },
  floatingDraftDock: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 84 : 70,
    left: 14,
    right: 14,
    backgroundColor: '#0E131F',
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: 'rgba(56, 189, 248, 0.4)',
    shadowColor: '#38BDF8',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
    zIndex: 99,
  },
  floatingDraftTouch: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
  },
  floatingDraftInfoArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  floatingDraftIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  floatingDraftBadge: {
    position: 'absolute',
    top: -3,
    right: -3,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#38BDF8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  floatingDraftBadgeText: {
    color: '#0A0C14',
    fontSize: 10,
    fontWeight: '900',
  },
  floatingDraftInfo: {
    flex: 1,
  },
  floatingDraftTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  liveDraftIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  floatingDraftMacros: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 11,
    marginTop: 2,
    fontWeight: '600',
  },
  floatingDraftButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  floatingDraftOpenBtn: {
    backgroundColor: '#0284C7',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
  },
  floatingDraftOpenText: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '800',
  },
  floatingDraftDiscardBtn: {
    padding: 7,
    borderRadius: 10,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
  },
})
