import React, { useState } from 'react'
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
} from 'react-native'
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
} from 'lucide-react-native'
import { useNutrition } from '@/lib/hooks/useNutrition'
import { MealType, FoodItemParsed } from '@/types'
import SmartFoodScannerModal from '@/components/nutrition/SmartFoodScannerModal'
import NutritionEvolutionModal from '@/components/nutrition/NutritionEvolutionModal'
import NutritionHealthAuditModal from '@/components/nutrition/NutritionHealthAuditModal'
import { aiService } from '@/lib/services/ai'

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
    loading,
    logFood,
    deleteFoodLog,
  } = useNutrition()

  const [filterType, setFilterType] = useState<MealType | 'all'>('all')
  const [modalVisible, setModalVisible] = useState(false)
  const [modalMealType, setModalMealType] = useState<MealType>('lunch')
  const [foodText, setFoodText] = useState('')
  const [analysisState, setAnalysisState] = useState<'idle' | 'loading' | 'result'>('idle')
  const [results, setResults] = useState<FoodItemParsed[]>([])
  const [photoUri, setPhotoUri] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Smart Food Scanner Modal State
  const [smartScannerVisible, setSmartScannerVisible] = useState(false)

  // Evolution & Calendar Modal State
  const [evolutionModalVisible, setEvolutionModalVisible] = useState(false)

  // Health & Micronutrient Audit Modal State
  const [healthModalVisible, setHealthModalVisible] = useState(false)

  // Smart Macro Closer Modal State
  const [macroCloserVisible, setMacroCloserVisible] = useState(false)
  const [macroCloserLoading, setMacroCloserLoading] = useState(false)
  const [macroCloserData, setMacroCloserData] = useState<any>(null)

  const isToday = selectedDate === new Date().toISOString().split('T')[0]

  const formatDisplayDate = (dateStr: string) => {
    try {
      const parts = dateStr.split('-')
      if (parts.length === 3) {
        const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]))
        const todayStr = new Date().toISOString().split('T')[0]
        if (dateStr === todayStr) {
          return `Hoy, ${d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}`
        }
        return d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })
      }
    } catch {}
    return dateStr
  }

  const filteredLogs = filterType === 'all' ? logs : logs.filter((l) => l.meal_type === filterType)

  const handleLaunchCamera = () => {
    setModalVisible(false)
    setSmartScannerVisible(true)
  }

  const handleLaunchGallery = () => {
    setModalVisible(false)
    setSmartScannerVisible(true)
  }

  const handleSaveFromSmartScanner = async (foods: FoodItemParsed[], rawInput: string) => {
    const totalC = foods.reduce((s, r) => s + r.calories, 0)
    const totalP = foods.reduce((s, r) => s + r.protein_g, 0)
    const totalCb = foods.reduce((s, r) => s + r.carbs_g, 0)
    const totalF = foods.reduce((s, r) => s + r.fat_g, 0)

    await logFood({
      mealType: modalMealType,
      rawInput: rawInput || 'Escaneo Inteligente',
      foodsParsed: foods,
      calories: totalC,
      proteinG: totalP,
      carbsG: totalCb,
      fatG: totalF,
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
      setResults(parsedFoods)
      setAnalysisState('result')
    } catch (err: any) {
      console.warn('[Nutrition] Fallback parsing food text:', err)
      const parsed = parseFoodText(foodText)
      setResults(parsed)
      setAnalysisState('result')
    }
  }

  const handleSaveMeal = async () => {
    setSaving(true)
    const totalC = results.reduce((s, r) => s + r.calories, 0)
    const totalP = results.reduce((s, r) => s + r.protein_g, 0)
    const totalCb = results.reduce((s, r) => s + r.carbs_g, 0)
    const totalF = results.reduce((s, r) => s + r.fat_g, 0)

    await logFood({
      mealType: modalMealType,
      rawInput: foodText || 'Comida registrada',
      foodsParsed: results,
      calories: totalC,
      proteinG: totalP,
      carbsG: totalCb,
      fatG: totalF,
    })

    setSaving(false)
    handleCloseModal()
  }

  const handleCloseModal = () => {
    setModalVisible(false)
    setAnalysisState('idle')
    setResults([])
    setFoodText('')
    setPhotoUri(null)
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Top Header con Navegación de Fechas */}
        <View style={styles.header}>
          <View style={styles.headerTopRow}>
            <View>
              <Text style={styles.headerSub}>NUTRICIÓN & SALUD INTEGRAL</Text>
              <Text style={styles.headerTitle}>Nutrición</Text>
            </View>

            {/* Botones de Cabecera: Calendario y Salud */}
            <View style={styles.headerIconsRow}>
              <TouchableOpacity
                style={styles.headerIconBtn}
                onPress={() => setEvolutionModalVisible(true)}
                activeOpacity={0.8}
              >
                <TrendingUp size={16} color="#38BDF8" />
                <Text style={styles.headerIconBtnText}>Evolución</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.headerIconBtn, styles.headerIconBtnHealth]}
                onPress={() => setHealthModalVisible(true)}
                activeOpacity={0.8}
              >
                <HeartPulse size={16} color="#10B981" />
                <Text style={[styles.headerIconBtnText, { color: '#10B981' }]}>Salud</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Barra de Navegación de Fecha Día a Día */}
          <View style={styles.dateNavigatorRow}>
            <TouchableOpacity onPress={goToPrevDay} style={styles.dateNavArrow} activeOpacity={0.7}>
              <ChevronLeft size={18} color="#FFFFFF" />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setEvolutionModalVisible(true)}
              style={styles.dateDisplayBtn}
              activeOpacity={0.8}
            >
              <CalendarIcon size={15} color="#38BDF8" />
              <Text style={styles.dateDisplayText}>{formatDisplayDate(selectedDate)}</Text>
              {!isToday && (
                <TouchableOpacity onPress={goToToday} style={styles.returnTodayPill}>
                  <Text style={styles.returnTodayText}>Ir a Hoy</Text>
                </TouchableOpacity>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={goToNextDay}
              style={[styles.dateNavArrow, isToday && { opacity: 0.3 }]}
              disabled={isToday}
              activeOpacity={0.7}
            >
              <ChevronRight size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Resumen del Día Card con Consumo vs Objetivo */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryHeaderRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Flame size={18} color="#F59E0B" />
              <Text style={styles.summaryCardSub}>RESUMEN NUTRICIONAL</Text>
            </View>

            {/* Badge de Estatus Calórico */}
            <View
              style={[
                styles.statusBadge,
                calorieAnalysis.diff > 250
                  ? styles.statusBadgeSurplus
                  : calorieAnalysis.diff < -350 && calorieAnalysis.consumed > 0
                  ? styles.statusBadgeDeficit
                  : styles.statusBadgeOptimal,
              ]}
            >
              <Text
                style={[
                  styles.statusBadgeText,
                  calorieAnalysis.diff > 250
                    ? { color: '#EF4444' }
                    : calorieAnalysis.diff < -350 && calorieAnalysis.consumed > 0
                    ? { color: '#38BDF8' }
                    : { color: '#10B981' },
                ]}
              >
                {calorieAnalysis.diff > 250
                  ? `+${calorieAnalysis.diff} kcal Superávit`
                  : calorieAnalysis.diff < -350 && calorieAnalysis.consumed > 0
                  ? `${calorieAnalysis.diff} kcal Déficit`
                  : 'Balance Óptimo'}
              </Text>
            </View>
          </View>

          {/* Fila Principal de Calorías (Consumidas / Objetivo) */}
          <View style={styles.calorieRow}>
            <Text style={styles.caloriesMain}>{calorieAnalysis.consumed}</Text>
            <Text style={styles.caloriesTarget}>/ {calorieAnalysis.target} kcal</Text>
          </View>

          {/* Subtítulo dinámico de calorías restantes o excedidas */}
          <Text
            style={[
              styles.caloriesSubNotice,
              calorieAnalysis.isExceeded ? { color: '#F87171' } : { color: '#38BDF8' },
            ]}
          >
            {calorieAnalysis.isExceeded
              ? `⚠️ Exceso calórico: +${calorieAnalysis.excess} kcal sobre tu meta`
              : `Te restan ${calorieAnalysis.remaining} kcal para completar el objetivo`}
          </Text>

          {/* Barra de progreso de calorías */}
          <View style={styles.calProgressBarBg}>
            <View
              style={[
                styles.calProgressBarFill,
                {
                  width: `${calorieAnalysis.progressPercent}%`,
                  backgroundColor: calorieAnalysis.isExceeded ? '#EF4444' : '#38BDF8',
                },
              ]}
            />
          </View>

          {/* Macro Grid con Consumido vs Objetivo y Gramos Restantes/Excedidos */}
          <View style={styles.macroGrid}>
            {/* Proteínas */}
            <View style={styles.macroBox}>
              <View style={styles.macroTopRow}>
                <Text style={styles.macroLabel}>Proteína</Text>
                <Text style={styles.macroVal}>
                  {proteinAnalysis.consumed} / {proteinAnalysis.target}g
                </Text>
              </View>
              <View style={styles.macroBarBg}>
                <View
                  style={[
                    styles.macroBarFill,
                    {
                      width: `${proteinAnalysis.progressPercent}%`,
                      backgroundColor: proteinAnalysis.isMet ? '#10B981' : '#38BDF8',
                    },
                  ]}
                />
              </View>
              <Text
                style={[
                  styles.macroDifferenceText,
                  proteinAnalysis.isMet ? { color: '#10B981' } : { color: '#94A3B8' },
                ]}
              >
                {proteinAnalysis.isMet
                  ? `✓ Meta alcanzada (+${proteinAnalysis.excess}g)`
                  : `Faltan ${proteinAnalysis.remaining}g`}
              </Text>
            </View>

            {/* Carbohidratos */}
            <View style={styles.macroBox}>
              <View style={styles.macroTopRow}>
                <Text style={styles.macroLabel}>Carbos</Text>
                <Text style={styles.macroVal}>
                  {carbsAnalysis.consumed} / {carbsAnalysis.target}g
                </Text>
              </View>
              <View style={styles.macroBarBg}>
                <View
                  style={[
                    styles.macroBarFill,
                    {
                      width: `${carbsAnalysis.progressPercent}%`,
                      backgroundColor: carbsAnalysis.isExceeded ? '#EF4444' : '#FBBF24',
                    },
                  ]}
                />
              </View>
              <Text
                style={[
                  styles.macroDifferenceText,
                  carbsAnalysis.isExceeded ? { color: '#F87171' } : { color: '#94A3B8' },
                ]}
              >
                {carbsAnalysis.isExceeded
                  ? `⚠️ +${carbsAnalysis.excess}g exceso`
                  : `Quedan ${carbsAnalysis.remaining}g`}
              </Text>
            </View>

            {/* Grasas */}
            <View style={styles.macroBox}>
              <View style={styles.macroTopRow}>
                <Text style={styles.macroLabel}>Grasas</Text>
                <Text style={styles.macroVal}>
                  {fatAnalysis.consumed} / {fatAnalysis.target}g
                </Text>
              </View>
              <View style={styles.macroBarBg}>
                <View
                  style={[
                    styles.macroBarFill,
                    {
                      width: `${fatAnalysis.progressPercent}%`,
                      backgroundColor: fatAnalysis.isExceeded ? '#EF4444' : '#F472B6',
                    },
                  ]}
                />
              </View>
              <Text
                style={[
                  styles.macroDifferenceText,
                  fatAnalysis.isExceeded ? { color: '#F87171' } : { color: '#94A3B8' },
                ]}
              >
                {fatAnalysis.isExceeded
                  ? `⚠️ +${fatAnalysis.excess}g exceso`
                  : `Quedan ${fatAnalysis.remaining}g`}
              </Text>
            </View>
          </View>
        </View>

        {/* Mini Preview de Salud & Micronutrientes (Toca para abrir auditoría completa) */}
        <TouchableOpacity
          style={styles.healthMiniCard}
          onPress={() => setHealthModalVisible(true)}
          activeOpacity={0.85}
        >
          <View style={styles.healthMiniHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <HeartPulse size={15} color="#10B981" />
              <Text style={styles.healthMiniTitle}>CONTROL DE SALUD & MICRONUTRIENTES</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={styles.healthMiniActionText}>Auditoría IA</Text>
              <Sparkles size={13} color="#38BDF8" />
              <ChevronRight size={14} color="#64748B" />
            </View>
          </View>

          <View style={styles.healthPillsRow}>
            {/* Sal */}
            <View style={styles.healthMiniPill}>
              <Text style={styles.healthMiniPillLabel}>Sal/Sodio</Text>
              <Text
                style={[
                  styles.healthMiniPillVal,
                  dayStats.healthMetrics.saltG > 5 ? { color: '#EF4444' } : { color: '#FFFFFF' },
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
                  dayStats.healthMetrics.sugarsG > 35 ? { color: '#EF4444' } : { color: '#FFFFFF' },
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

        {/* AI Smart Actions Row */}
        <View style={styles.aiActionRow}>
          <TouchableOpacity
            style={styles.aiActionBtnPrimary}
            onPress={() => setSmartScannerVisible(true)}
            activeOpacity={0.85}
          >
            <Camera size={16} color="#0F172A" />
            <Text style={styles.aiActionBtnPrimaryText}>Escáner Visión & Código</Text>
            <Sparkles size={14} color="#0F172A" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.aiActionBtnSecondary}
            onPress={handleOpenMacroCloser}
            activeOpacity={0.85}
          >
            <Sparkles size={15} color="#38BDF8" />
            <Text style={styles.aiActionBtnSecondaryText}>Cierra tus Macros</Text>
          </TouchableOpacity>
        </View>

        {/* Meal Type Filter Pills */}
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
                {t !== 'all' && getMealIcon(t, 14, active ? '#FFFFFF' : 'rgba(255,255,255,0.4)')}
                <Text style={[styles.filterPillText, active && styles.filterPillTextActive]}>
                  {t === 'all' ? 'Todas' : mealLabel[t]}
                </Text>
              </TouchableOpacity>
            )
          })}
        </ScrollView>

        {/* Meals list */}
        <View style={styles.logsList}>
          {filteredLogs.length === 0 ? (
            <View style={styles.emptyBox}>
              <Utensils size={32} color="rgba(255,255,255,0.25)" />
              <Text style={styles.emptyText}>Sin comidas registradas en esta fecha</Text>
              <TouchableOpacity
                style={styles.emptyAddBtn}
                onPress={() => setModalVisible(true)}
                activeOpacity={0.8}
              >
                <Plus size={14} color="#38BDF8" />
                <Text style={styles.emptyAddBtnText}>Añadir comida</Text>
              </TouchableOpacity>
            </View>
          ) : (
            filteredLogs.map((log) => {
              const type = log.meal_type || 'lunch'
              const foods = log.foods_parsed || []
              return (
                <View key={log.id} style={styles.logCard}>
                  <View style={styles.logHeader}>
                    <View style={styles.logHeaderLeft}>
                      <View style={styles.mealIconThumb}>
                        {getMealIcon(type, 18, '#38BDF8')}
                      </View>
                      <View>
                        <Text style={styles.logTitle}>{mealLabel[type] || 'Comida'}</Text>
                        <Text style={styles.logTime}>{log.date || selectedDate}</Text>
                      </View>
                    </View>

                    <View style={styles.logHeaderRight}>
                      <Text style={styles.logCalories}>{log.calories || 0}</Text>
                      <Text style={styles.logCaloriesSub}>kcal</Text>
                      <TouchableOpacity
                        onPress={() => deleteFoodLog(log.id)}
                        style={styles.deleteLogBtn}
                        activeOpacity={0.7}
                      >
                        <Trash2 size={14} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Foods Breakdown */}
                  {foods.length > 0 && (
                    <View style={styles.foodsList}>
                      {foods.map((f, i) => (
                        <View key={i} style={styles.foodRow}>
                          <View style={{ flex: 1, marginRight: 8 }}>
                            <Text style={styles.foodName}>{f.name}</Text>
                            {/* Badges de salud si existen */}
                            {(f.sugars_g || f.fiber_g || f.salt_g || (f.micronutrients && f.micronutrients.length > 0)) && (
                              <View style={styles.foodSubNutrientRow}>
                                {typeof f.fiber_g === 'number' && f.fiber_g > 0 && (
                                  <Text style={styles.foodSubNutrientTag}>🌾 Fibra: {f.fiber_g}g</Text>
                                )}
                                {typeof f.sugars_g === 'number' && f.sugars_g > 0 && (
                                  <Text style={styles.foodSubNutrientTag}>🍬 Azúcar: {f.sugars_g}g</Text>
                                )}
                                {typeof f.salt_g === 'number' && f.salt_g > 0 && (
                                  <Text style={styles.foodSubNutrientTag}>🧂 Sal: {f.salt_g}g</Text>
                                )}
                              </View>
                            )}
                          </View>
                          <Text style={styles.foodGrams}>
                            {f.unit_or_portion ? `${f.unit_or_portion} (${f.quantity_g}g)` : `${f.quantity_g}g`} · {f.calories}kcal
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Macro tag row */}
                  <View style={styles.logMacrosRow}>
                    <Text style={styles.logMacroTag}>P: {Math.round(log.protein_g || 0)}g</Text>
                    <Text style={styles.logMacroTag}>C: {Math.round(log.carbs_g || 0)}g</Text>
                    <Text style={styles.logMacroTag}>G: {Math.round(log.fat_g || 0)}g</Text>
                  </View>
                </View>
              )
            })
          )}
        </View>
      </ScrollView>

      {/* Floating Action Button "REGISTRAR" */}
      <TouchableOpacity
        style={styles.fabBtn}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.85}
      >
        <Plus size={18} color="#FFFFFF" strokeWidth={2.5} />
        <Text style={styles.fabBtnText}>REGISTRAR</Text>
      </TouchableOpacity>

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
        onSaveToMeal={handleSaveFromSmartScanner}
      />

      {/* Unified Text & Quick Entry Modal Sheet */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={handleCloseModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />

            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>¿Qué comiste hoy?</Text>
              <TouchableOpacity onPress={handleCloseModal} style={styles.closeBtn}>
                <X size={18} color="rgba(255,255,255,0.6)" />
              </TouchableOpacity>
            </View>

            {/* Meal Type Quick Selector */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.modalMealTypeRow}
            >
              {(['breakfast', 'lunch', 'dinner', 'snack'] as MealType[]).map((t) => (
                <TouchableOpacity
                  key={t}
                  onPress={() => setModalMealType(t)}
                  style={[styles.modalMealPill, modalMealType === t && styles.modalMealPillActive]}
                  activeOpacity={0.8}
                >
                  {getMealIcon(t, 14, modalMealType === t ? '#FFFFFF' : 'rgba(255,255,255,0.4)')}
                  <Text
                    style={[
                      styles.modalMealPillText,
                      modalMealType === t && styles.modalMealPillTextActive,
                    ]}
                  >
                    {mealLabel[t]}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {analysisState === 'idle' && (
              <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                {/* Primary: Camera Button */}
                <TouchableOpacity
                  style={styles.cameraBtn}
                  onPress={handleLaunchCamera}
                  activeOpacity={0.85}
                >
                  <View style={styles.cameraIconBox}>
                    <Camera size={22} color="#38BDF8" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cameraBtnTitle}>Fotografiar alimento o tabla</Text>
                    <Text style={styles.cameraBtnSub}>Abre la cámara del escáner inteligente</Text>
                  </View>
                </TouchableOpacity>

                {/* Gallery Option */}
                <TouchableOpacity
                  style={styles.galleryBtn}
                  onPress={handleLaunchGallery}
                  activeOpacity={0.85}
                >
                  <GalleryIcon size={18} color="rgba(255,255,255,0.5)" />
                  <Text style={styles.galleryBtnText}>Seleccionar de galería</Text>
                </TouchableOpacity>

                {/* Amber Warning Box */}
                <View style={styles.amberWarning}>
                  <AlertTriangle size={16} color="#F59E0B" />
                  <Text style={styles.amberWarningText}>
                    Para mayor precisión en micronutrientes,{' '}
                    <Text style={{ fontWeight: 'bold' }}>fotografía la tabla nutricional</Text> del producto.
                  </Text>
                </View>

                {/* Divider */}
                <View style={styles.modalDivider}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>o describe con texto</Text>
                  <View style={styles.dividerLine} />
                </View>

                {/* Textarea Input */}
                <TextInput
                  style={styles.foodTextInput}
                  placeholder="Describe lo que comiste... ej: 200g de pechuga de pollo con 150g arroz y ensalada"
                  placeholderTextColor="rgba(255,255,255,0.25)"
                  value={foodText}
                  onChangeText={setFoodText}
                  multiline
                  numberOfLines={3}
                />

                <TouchableOpacity
                  style={[styles.analyzeBtn, !foodText.trim() && styles.analyzeBtnDisabled]}
                  onPress={handleAnalyzeText}
                  disabled={!foodText.trim()}
                  activeOpacity={0.85}
                >
                  <Text style={styles.analyzeBtnText}>ANALIZAR CON IA</Text>
                </TouchableOpacity>
              </ScrollView>
            )}

            {analysisState === 'loading' && (
              <View style={styles.loadingStateBox}>
                <ActivityIndicator size="large" color="#38BDF8" />
                <Text style={styles.loadingText}>Analizando alimentos y nutrientes con IA...</Text>
              </View>
            )}

            {analysisState === 'result' && (
              <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                <View style={styles.resultHeader}>
                  <Text style={styles.resultSub}>RESULTADO DEL ANÁLISIS</Text>
                  <Text style={styles.resultCalories}>
                    {results.reduce((s, r) => s + r.calories, 0)} kcal
                  </Text>
                </View>

                {/* Result Items */}
                <View style={styles.resultItemsList}>
                  {results.map((f, i) => (
                    <View key={i} style={styles.resultItemRow}>
                      <View style={{ flex: 1, marginRight: 12 }}>
                        <Text style={styles.resultItemName}>{f.name}</Text>
                        <Text style={styles.resultItemGrams}>
                          {f.unit_or_portion ? `${f.unit_or_portion} (${f.quantity_g}g)` : `${f.quantity_g}g`}
                        </Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={styles.resultItemCals}>{f.calories} kcal</Text>
                        <Text style={styles.resultItemMacros}>
                          P{f.protein_g} · C{f.carbs_g} · G{f.fat_g}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>

                {/* Macro Summary Grid */}
                <View style={styles.resultMacroGrid}>
                  <View style={styles.resultMacroBox}>
                    <Text style={[styles.resultMacroVal, { color: '#38BDF8' }]}>
                      {results.reduce((s, r) => s + r.protein_g, 0)}g
                    </Text>
                    <Text style={styles.resultMacroLabel}>Proteína</Text>
                  </View>
                  <View style={styles.resultMacroBox}>
                    <Text style={[styles.resultMacroVal, { color: '#FBBF24' }]}>
                      {results.reduce((s, r) => s + r.carbs_g, 0)}g
                    </Text>
                    <Text style={styles.resultMacroLabel}>Carbos</Text>
                  </View>
                  <View style={styles.resultMacroBox}>
                    <Text style={[styles.resultMacroVal, { color: '#F472B6' }]}>
                      {results.reduce((s, r) => s + r.fat_g, 0)}g
                    </Text>
                    <Text style={styles.resultMacroLabel}>Grasas</Text>
                  </View>
                </View>

                {/* Actions */}
                <View style={styles.resultActionsRow}>
                  <TouchableOpacity
                    style={styles.discardBtn}
                    onPress={() => {
                      setAnalysisState('idle')
                      setPhotoUri(null)
                    }}
                  >
                    <Text style={styles.discardBtnText}>Descartar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.saveMealBtn}
                    onPress={handleSaveMeal}
                    disabled={saving}
                  >
                    {saving ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <Text style={styles.saveMealBtnText}>GUARDAR</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

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
    backgroundColor: '#0A0A0A',
  },
  content: {
    padding: 16,
    gap: 14,
    paddingBottom: 100,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 8 : 4,
    gap: 12,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerSub: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '900',
    marginTop: 1,
  },
  headerIconsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  headerIconBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#111827',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(56,189,248,0.25)',
  },
  headerIconBtnHealth: {
    borderColor: 'rgba(16,185,129,0.25)',
  },
  headerIconBtnText: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '700',
  },
  dateNavigatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#121212',
    borderRadius: 14,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  dateNavArrow: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateDisplayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateDisplayText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    textTransform: 'capitalize',
  },
  returnTodayPill: {
    backgroundColor: 'rgba(56,189,248,0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 4,
  },
  returnTodayText: {
    color: '#38BDF8',
    fontSize: 10,
    fontWeight: '800',
  },
  summaryCard: {
    backgroundColor: '#121212',
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    gap: 10,
  },
  summaryHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryCardSub: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusBadgeOptimal: {
    backgroundColor: 'rgba(16,185,129,0.12)',
  },
  statusBadgeSurplus: {
    backgroundColor: 'rgba(239,68,68,0.12)',
  },
  statusBadgeDeficit: {
    backgroundColor: 'rgba(56,189,248,0.12)',
  },
  statusBadgeText: {
    fontSize: 10.5,
    fontWeight: '800',
  },
  calorieRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  caloriesMain: {
    color: '#FFFFFF',
    fontSize: 40,
    fontWeight: '900',
    lineHeight: 44,
  },
  caloriesTarget: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 16,
    fontWeight: '700',
  },
  caloriesSubNotice: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: -4,
  },
  calProgressBarBg: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 3,
    overflow: 'hidden',
    marginVertical: 2,
  },
  calProgressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  macroGrid: {
    gap: 8,
    marginTop: 4,
  },
  macroBox: {
    backgroundColor: '#181818',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 4,
  },
  macroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  macroLabel: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  macroVal: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  macroBarBg: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 2,
    overflow: 'hidden',
    marginVertical: 2,
  },
  macroBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  macroDifferenceText: {
    fontSize: 10.5,
    fontWeight: '600',
  },
  healthMiniCard: {
    backgroundColor: '#0F172A',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.25)',
    gap: 10,
  },
  healthMiniHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  healthMiniTitle: {
    color: '#10B981',
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 1,
  },
  healthMiniActionText: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '700',
  },
  healthPillsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  healthMiniPill: {
    flex: 1,
    backgroundColor: '#1E293B',
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 6,
    alignItems: 'center',
  },
  healthMiniPillLabel: {
    color: '#94A3B8',
    fontSize: 9.5,
    fontWeight: '600',
    marginBottom: 2,
  },
  healthMiniPillVal: {
    fontSize: 11,
    fontWeight: '800',
  },
  aiActionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  aiActionBtnPrimary: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#38BDF8',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 14,
  },
  aiActionBtnPrimaryText: {
    color: '#0F172A',
    fontSize: 12,
    fontWeight: '800',
  },
  aiActionBtnSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#0F172A',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#0284C7',
  },
  aiActionBtnSecondaryText: {
    color: '#38BDF8',
    fontSize: 12,
    fontWeight: '700',
  },
  filterScroll: {
    gap: 8,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  filterPillActive: {
    backgroundColor: '#0284C7',
    borderColor: '#0284C7',
  },
  filterPillText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 13,
    fontWeight: '700',
  },
  filterPillTextActive: {
    color: '#FFFFFF',
  },
  logsList: {
    gap: 12,
  },
  emptyBox: {
    backgroundColor: '#111111',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
  },
  emptyText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 13,
  },
  emptyAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(56,189,248,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(56,189,248,0.3)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  emptyAddBtnText: {
    color: '#38BDF8',
    fontSize: 12,
    fontWeight: '700',
  },
  logCard: {
    backgroundColor: '#121212',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    gap: 12,
  },
  logHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  mealIconThumb: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(56,189,248,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  logTime: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 11,
  },
  logHeaderRight: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  logCalories: {
    color: '#38BDF8',
    fontSize: 20,
    fontWeight: '900',
  },
  logCaloriesSub: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 11,
    marginRight: 6,
  },
  deleteLogBtn: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: 'rgba(239,68,68,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  foodsList: {
    gap: 6,
  },
  foodRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  foodName: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12.5,
    fontWeight: '600',
  },
  foodSubNutrientRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 2,
  },
  foodSubNutrientTag: {
    color: '#94A3B8',
    fontSize: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  foodGrams: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
    fontWeight: '600',
  },
  logMacrosRow: {
    flexDirection: 'row',
    gap: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.04)',
  },
  logMacroTag: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
    fontWeight: '700',
  },
  fabBtn: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0284C7',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 18,
    gap: 6,
    shadowColor: '#0284C7',
    shadowOpacity: 0.45,
    shadowRadius: 18,
    elevation: 6,
  },
  fabBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#121212',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 22,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    borderTopWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    maxHeight: '90%',
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#1C1C1C',
    alignItems: 'center',
    justifyContent: 'center',
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
    flexGrow: 0,
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
})
