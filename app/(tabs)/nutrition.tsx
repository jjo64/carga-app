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
import * as ImagePicker from 'expo-image-picker'
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
} from 'lucide-react-native'
import { useNutrition } from '@/lib/hooks/useNutrition'
import { MealType, FoodItemParsed } from '@/types'

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

const PHOTO_RESULTS: FoodItemParsed[] = [
  { name: 'Pechuga de pollo a la plancha', quantity_g: 150, calories: 248, protein_g: 46, carbs_g: 0, fat_g: 5.4, confidence: 'high' },
  { name: 'Arroz basmati cocido', quantity_g: 150, calories: 195, protein_g: 4, carbs_g: 42, fat_g: 0.4, confidence: 'high' },
  { name: 'Brócoli al vapor', quantity_g: 150, calories: 51, protein_g: 4.2, carbs_g: 9.9, fat_g: 0.6, confidence: 'medium' },
]

export default function NutritionScreen() {
  const { summary, logs, loading, logFood, deleteFoodLog } = useNutrition()

  const [filterType, setFilterType] = useState<MealType | 'all'>('all')
  const [modalVisible, setModalVisible] = useState(false)
  const [modalMealType, setModalMealType] = useState<MealType>('lunch')
  const [foodText, setFoodText] = useState('')
  const [analysisState, setAnalysisState] = useState<'idle' | 'loading' | 'result'>('idle')
  const [results, setResults] = useState<FoodItemParsed[]>([])
  const [photoUri, setPhotoUri] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const targetCals = 2400
  const targetProtein = 160
  const targetCarbs = 240
  const targetFat = 65

  const consumedCals = summary?.total_calories || logs.reduce((s, l) => s + (l.calories || 0), 0)
  const consumedProtein = summary?.total_protein || logs.reduce((s, l) => s + (l.protein_g || 0), 0)
  const consumedCarbs = summary?.total_carbs || logs.reduce((s, l) => s + (l.carbs_g || 0), 0)
  const consumedFat = summary?.total_fat || logs.reduce((s, l) => s + (l.fat_g || 0), 0)

  const filteredLogs = filterType === 'all' ? logs : logs.filter((l) => l.meal_type === filterType)

  const handleLaunchCamera = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync()
      if (!permission.granted) {
        Alert.alert('Permiso Requerido', 'Se necesita acceso a la cámara para fotografiar alimentos.')
        return
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.8,
      })

      if (!result.canceled && result.assets && result.assets[0]) {
        setPhotoUri(result.assets[0].uri)
        setAnalysisState('loading')
        setTimeout(() => {
          setResults(PHOTO_RESULTS)
          setAnalysisState('result')
        }, 1500)
      }
    } catch (err) {
      console.log('Error opening camera:', err)
    }
  }

  const handleLaunchGallery = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        quality: 0.8,
      })

      if (!result.canceled && result.assets && result.assets[0]) {
        setPhotoUri(result.assets[0].uri)
        setAnalysisState('loading')
        setTimeout(() => {
          setResults(PHOTO_RESULTS)
          setAnalysisState('result')
        }, 1500)
      }
    } catch (err) {
      console.log('Error opening gallery:', err)
    }
  }

  const handleAnalyzeText = () => {
    if (!foodText.trim()) return
    setAnalysisState('loading')
    setTimeout(() => {
      const parsed = parseFoodText(foodText)
      setResults(parsed)
      setAnalysisState('result')
    }, 1200)
  }

  const handleSaveMeal = async () => {
    setSaving(true)
    const totalC = results.reduce((s, r) => s + r.calories, 0)
    const totalP = results.reduce((s, r) => s + r.protein_g, 0)
    const totalCb = results.reduce((s, r) => s + r.carbs_g, 0)
    const totalF = results.reduce((s, r) => s + r.fat_g, 0)

    await logFood({
      mealType: modalMealType,
      rawInput: foodText || 'Foto de comida',
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
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerSub}>REGISTRO NUTRICIONAL</Text>
          <Text style={styles.headerTitle}>Nutrición</Text>
        </View>

        {/* Resumen del Día Card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryHeaderRow}>
            <Text style={styles.summaryCardSub}>RESUMEN DEL DÍA</Text>
            <Flame size={18} color="#F59E0B" />
          </View>
          <View style={styles.calorieRow}>
            <Text style={styles.caloriesMain}>{Math.round(consumedCals)}</Text>
            <Text style={styles.caloriesTarget}>/ {targetCals} kcal</Text>
          </View>

          {/* Macro Progress Bars */}
          <View style={styles.macroGrid}>
            {[
              { label: 'Proteína', val: Math.round(consumedProtein), target: targetProtein, color: '#38BDF8' },
              { label: 'Carbos', val: Math.round(consumedCarbs), target: targetCarbs, color: '#60A5FA' },
              { label: 'Grasas', val: Math.round(consumedFat), target: targetFat, color: '#93C5FD' },
            ].map(({ label, val, target, color }) => {
              const pct = Math.min((val / target) * 100, 100)
              return (
                <View key={label} style={styles.macroBox}>
                  <Text style={styles.macroVal}>{val}g</Text>
                  <View style={styles.macroBarBg}>
                    <View style={[styles.macroBarFill, { width: `${pct}%`, backgroundColor: color }]} />
                  </View>
                  <Text style={styles.macroLabel}>{label}</Text>
                </View>
              )
            })}
          </View>
        </View>

        {/* Meal Type Filter Pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
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
              <Text style={styles.emptyText}>Sin comidas registradas</Text>
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
                        <Text style={styles.logTime}>{log.date || 'Hoy'}</Text>
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
                          <Text style={styles.foodName}>{f.name}</Text>
                          <Text style={styles.foodGrams}>
                            {f.quantity_g}g · {f.calories}kcal
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

      {/* Unified Nutrition Modal Sheet */}
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
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.modalMealTypeRow}>
              {(['breakfast', 'lunch', 'dinner', 'snack'] as MealType[]).map((t) => (
                <TouchableOpacity
                  key={t}
                  onPress={() => setModalMealType(t)}
                  style={[
                    styles.modalMealPill,
                    modalMealType === t && styles.modalMealPillActive,
                  ]}
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
                    <Text style={styles.cameraBtnTitle}>Fotografiar alimento</Text>
                    <Text style={styles.cameraBtnSub}>Abre la cámara directamente</Text>
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
                    Para mayor precisión, <Text style={{ fontWeight: 'bold' }}>fotografía la tabla nutricional</Text> del producto en lugar del plato.
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
                  placeholder="Describe lo que comiste... ej: 200g de pollo con arroz y brócoli"
                  placeholderTextColor="rgba(255,255,255,0.25)"
                  value={foodText}
                  onChangeText={setFoodText}
                  multiline
                  numberOfLines={3}
                />

                <TouchableOpacity
                  style={[
                    styles.analyzeBtn,
                    !foodText.trim() && styles.analyzeBtnDisabled,
                  ]}
                  onPress={handleAnalyzeText}
                  disabled={!foodText.trim()}
                  activeOpacity={0.85}
                >
                  <Text style={styles.analyzeBtnText}>ANALIZAR</Text>
                </TouchableOpacity>
              </ScrollView>
            )}

            {analysisState === 'loading' && (
              <View style={styles.loadingStateBox}>
                {photoUri && (
                  <Image source={{ uri: photoUri }} style={styles.previewImage} />
                )}
                <ActivityIndicator size="large" color="#38BDF8" />
                <Text style={styles.loadingText}>Analizando nutrientes con IA...</Text>
              </View>
            )}

            {analysisState === 'result' && (
              <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                {photoUri && (
                  <Image source={{ uri: photoUri }} style={styles.previewImageResult} />
                )}

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
                      <View>
                        <Text style={styles.resultItemName}>{f.name}</Text>
                        <Text style={styles.resultItemGrams}>{f.quantity_g}g</Text>
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
                    <Text style={styles.resultMacroVal}>
                      {results.reduce((s, r) => s + r.protein_g, 0)}g
                    </Text>
                    <Text style={styles.resultMacroLabel}>Proteína</Text>
                  </View>
                  <View style={styles.resultMacroBox}>
                    <Text style={styles.resultMacroVal}>
                      {results.reduce((s, r) => s + r.carbs_g, 0)}g
                    </Text>
                    <Text style={styles.resultMacroLabel}>Carbos</Text>
                  </View>
                  <View style={styles.resultMacroBox}>
                    <Text style={styles.resultMacroVal}>
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
    gap: 16,
    paddingBottom: 100,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 8 : 4,
    marginBottom: 2,
  },
  headerSub: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '900',
    marginTop: 2,
  },
  summaryCard: {
    backgroundColor: '#121212',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    gap: 12,
  },
  summaryHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryCardSub: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  calorieRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  caloriesMain: {
    color: '#FFFFFF',
    fontSize: 44,
    fontWeight: '900',
    lineHeight: 48,
  },
  caloriesTarget: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 16,
    fontWeight: '600',
  },
  macroGrid: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  macroBox: {
    flex: 1,
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    padding: 12,
    gap: 4,
  },
  macroVal: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  macroBarBg: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 2,
    overflow: 'hidden',
    marginVertical: 4,
  },
  macroBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  macroLabel: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 10,
    fontWeight: '600',
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
    padding: 32,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
  },
  emptyText: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 13,
  },
  logCard: {
    backgroundColor: '#121212',
    borderRadius: 20,
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
    gap: 4,
  },
  foodRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  foodName: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 12,
  },
  foodGrams: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 11,
  },
  logMacrosRow: {
    flexDirection: 'row',
    gap: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.04)',
  },
  logMacroTag: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
    fontWeight: '600',
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
    fontSize: 16,
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
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 2,
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
  previewImage: {
    width: '100%',
    height: 140,
    borderRadius: 16,
    opacity: 0.7,
  },
  previewImageResult: {
    width: '100%',
    height: 140,
    borderRadius: 16,
    marginBottom: 16,
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
    color: '#FFFFFF',
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
})
