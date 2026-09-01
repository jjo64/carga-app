import { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Platform,
} from 'react-native'
import { useAuth } from '@/lib/hooks/useAuth'
import { theme } from '@/constants/theme'
import { Ionicons } from '@expo/vector-icons'
import {
  analyzeNutrition,
  saveFoodLog,
  getDailyFoodLogs,
  deleteFoodLog,
  NutritionAnalysisResult,
} from '@/lib/api/nutrition'
import { FoodLog, MealType } from '@/types'
import { calculateBMR, calculateTDEE, calculateTargetCalories } from '@/lib/utils/calories'

const MEAL_TYPES: { key: MealType; label: string; icon: string }[] = [
  { key: 'breakfast', label: 'Desayuno', icon: 'sunny-outline' },
  { key: 'lunch', label: 'Almuerzo', icon: 'restaurant-outline' },
  { key: 'dinner', label: 'Cena', icon: 'moon-outline' },
  { key: 'snack', label: 'Snack', icon: 'nutrition-outline' },
]

export default function NutritionScreen() {
  const { user, profile } = useAuth()
  const today = new Date().toISOString().split('T')[0]

  const [mealType, setMealType] = useState<MealType>('lunch')
  const [rawInput, setRawInput] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<NutritionAnalysisResult | null>(null)
  const [saving, setSaving] = useState(false)

  const [dailyLogs, setDailyLogs] = useState<FoodLog[]>([])
  const [loadingLogs, setLoadingLogs] = useState(true)

  const fetchLogs = useCallback(async () => {
    if (!user) return
    setLoadingLogs(true)
    const logs = await getDailyFoodLogs(user.id, today)
    setDailyLogs(logs)
    setLoadingLogs(false)
  }, [user, today])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  // Totales acumulados hoy
  const totalsConsumed = dailyLogs.reduce(
    (acc, log) => ({
      calories: acc.calories + (log.calories || 0),
      protein: acc.protein + (log.protein_g || 0),
      carbs: acc.carbs + (log.carbs_g || 0),
      fat: acc.fat + (log.fat_g || 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  )

  // Objetivos calóricos y de macros
  const bmr = calculateBMR(profile, 75)
  const tdee = calculateTDEE(bmr, profile?.activity_level || 'moderate')
  const calorieTarget = calculateTargetCalories(tdee, profile?.goal)
  const proteinTarget = Math.round(75 * 2.0) // ~2g/kg para entrenamiento con pesas

  async function handleAnalyze() {
    if (!rawInput.trim()) return

    setAnalyzing(true)
    setAnalysisResult(null)

    try {
      const result = await analyzeNutrition(rawInput.trim(), mealType)
      setAnalysisResult(result)
    } catch (err) {
      Alert.alert('Error', 'No se pudo analizar el texto de la comida. Intenta de nuevo.')
    } finally {
      setAnalyzing(false)
    }
  }

  async function handleSaveFood() {
    if (!user || !analysisResult) return

    setSaving(true)
    const { error } = await saveFoodLog({
      userId: user.id,
      date: today,
      mealType,
      rawInput: rawInput.trim(),
      result: analysisResult,
    })
    setSaving(false)

    if (!error) {
      setRawInput('')
      setAnalysisResult(null)
      await fetchLogs()
    } else {
      Alert.alert('Error', 'No se pudo guardar el registro de comida.')
    }
  }

  async function handleDeleteLog(id: string) {
    const confirmAction = async () => {
      const { error } = await deleteFoodLog(id)
      if (!error) {
        setDailyLogs((prev) => prev.filter((item) => item.id !== id))
      }
    }

    if (Platform.OS === 'web') {
      if (window.confirm('¿Eliminar esta comida?')) {
        await confirmAction()
      }
    } else {
      Alert.alert('Eliminar Comida', '¿Deseas eliminar este registro?', [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: confirmAction },
      ])
    }
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={loadingLogs}
          onRefresh={fetchLogs}
          tintColor={theme.colors.primary}
        />
      }
    >
      {/* Tarjeta de Resumen Diario de Macros */}
      <View style={styles.card}>
        <View style={styles.macroHeader}>
          <Text style={styles.cardTitle}>Balance de Hoy</Text>
          <Text style={styles.calorieRatio}>
            <Text style={styles.calorieActive}>{Math.round(totalsConsumed.calories)}</Text>
            <Text style={styles.calorieTarget}> / {calorieTarget} kcal</Text>
          </Text>
        </View>

        <View style={styles.macroRow}>
          <View style={[styles.macroItem, { borderColor: theme.colors.primary + '44' }]}>
            <Text style={[styles.macroVal, { color: theme.colors.primary }]}>
              {Math.round(totalsConsumed.protein)}g
            </Text>
            <Text style={styles.macroTargetText}>Obj: {proteinTarget}g</Text>
            <Text style={styles.macroLabel}>Proteína</Text>
          </View>

          <View style={[styles.macroItem, { borderColor: theme.colors.info + '44' }]}>
            <Text style={[styles.macroVal, { color: theme.colors.info }]}>
              {Math.round(totalsConsumed.carbs)}g
            </Text>
            <Text style={styles.macroTargetText}>Energía</Text>
            <Text style={styles.macroLabel}>Carbohidratos</Text>
          </View>

          <View style={[styles.macroItem, { borderColor: theme.colors.fat + '44' }]}>
            <Text style={[styles.macroVal, { color: theme.colors.fat }]}>
              {Math.round(totalsConsumed.fat)}g
            </Text>
            <Text style={styles.macroTargetText}>Esencial</Text>
            <Text style={styles.macroLabel}>Grasas</Text>
          </View>
        </View>
      </View>

      {/* Sección de Registro de Comida con IA */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Registrar Comida</Text>

        {/* Selector de Tipo de Comida */}
        <View style={styles.mealTypeRow}>
          {MEAL_TYPES.map((type) => (
            <TouchableOpacity
              key={type.key}
              style={[
                styles.mealTypeBtn,
                mealType === type.key && styles.mealTypeBtnActive,
              ]}
              onPress={() => setMealType(type.key)}
            >
              <Ionicons
                name={type.icon as any}
                size={14}
                color={
                  mealType === type.key
                    ? theme.colors.primary
                    : theme.colors.textMuted
                }
              />
              <Text
                style={[
                  styles.mealTypeText,
                  mealType === type.key && styles.mealTypeTextActive,
                ]}
              >
                {type.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Entrada de Texto Libre */}
        <View style={styles.inputBox}>
          <TextInput
            style={styles.textInput}
            placeholder="Ej: 400g pechuga de pollo Dia a la plancha, 80g arroz basmati y 10g aceite oliva"
            placeholderTextColor={theme.colors.textMuted}
            value={rawInput}
            onChangeText={setRawInput}
            multiline
            numberOfLines={3}
          />

          <TouchableOpacity
            style={[
              styles.analyzeBtn,
              (!rawInput.trim() || analyzing) && styles.analyzeBtnDisabled,
            ]}
            onPress={handleAnalyze}
            disabled={!rawInput.trim() || analyzing}
          >
            {analyzing ? (
              <ActivityIndicator color="#000" />
            ) : (
              <>
                <Ionicons name="sparkles" size={16} color="#000" />
                <Text style={styles.analyzeBtnText}>Analizar con IA</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Previsualización del Análisis de la IA */}
        {analysisResult && (
          <View style={styles.analysisResultBox}>
            <View style={styles.resultHeader}>
              <Text style={styles.resultTitle}>Desglose Nutricional</Text>
              <View
                style={[
                  styles.confidenceBadge,
                  analysisResult.overall_confidence === 'high'
                    ? styles.badgeHigh
                    : styles.badgeMedium,
                ]}
              >
                <Text style={styles.badgeText}>
                  {analysisResult.overall_confidence === 'high'
                    ? 'Exacto'
                    : 'Estimación'}
                </Text>
              </View>
            </View>

            {/* Totales de esta comida */}
            <View style={styles.resultTotalsRow}>
              <Text style={styles.resultTotalItem}>
                🔥 <Text style={styles.bold}>{Math.round(analysisResult.totals.calories)}</Text> kcal
              </Text>
              <Text style={styles.resultTotalItem}>
                🥩 <Text style={styles.bold}>{Math.round(analysisResult.totals.protein_g)}g</Text> P
              </Text>
              <Text style={styles.resultTotalItem}>
                🍚 <Text style={styles.bold}>{Math.round(analysisResult.totals.carbs_g)}g</Text> C
              </Text>
              <Text style={styles.resultTotalItem}>
                🥑 <Text style={styles.bold}>{Math.round(analysisResult.totals.fat_g)}g</Text> G
              </Text>
            </View>

            {/* Lista de alimentos reconocidos */}
            <View style={styles.foodList}>
              {analysisResult.foods.map((food, idx) => (
                <View key={idx} style={styles.foodRow}>
                  <View style={styles.foodRowInfo}>
                    <Text style={styles.foodRowName}>
                      {food.name} {food.brand ? `(${food.brand})` : ''}
                    </Text>
                    <Text style={styles.foodRowDetails}>
                      {food.quantity_g}g · {Math.round(food.calories)} kcal · P:{Math.round(food.protein_g)}g C:{Math.round(food.carbs_g)}g G:{Math.round(food.fat_g)}g
                    </Text>
                    {food.notes && (
                      <Text style={styles.foodRowNotes}>💬 {food.notes}</Text>
                    )}
                  </View>
                </View>
              ))}
            </View>

            {analysisResult.ai_notes && (
              <Text style={styles.aiComment}>💬 {analysisResult.ai_notes}</Text>
            )}

            <TouchableOpacity
              style={[styles.saveFoodBtn, saving && styles.saveFoodBtnDisabled]}
              onPress={handleSaveFood}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#000" />
              ) : (
                <Text style={styles.saveFoodBtnText}>Guardar en Diario</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Historial de Comidas del Día */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>
          Comidas de Hoy ({dailyLogs.length})
        </Text>

        {dailyLogs.length === 0 ? (
          <View style={styles.emptyLogs}>
            <Ionicons name="fast-food-outline" size={32} color={theme.colors.textMuted} />
            <Text style={styles.emptyLogsText}>
              Aún no has registrado ninguna comida hoy.
            </Text>
          </View>
        ) : (
          <View style={styles.logList}>
            {dailyLogs.map((log) => (
              <View key={log.id} style={styles.logCard}>
                <View style={styles.logCardHeader}>
                  <View style={styles.logTypeTag}>
                    <Text style={styles.logTypeTagText}>
                      {MEAL_TYPES.find((t) => t.key === log.meal_type)?.label ||
                        log.meal_type}
                    </Text>
                  </View>
                  <Text style={styles.logCalories}>
                    {Math.round(log.calories || 0)} kcal
                  </Text>
                  <TouchableOpacity
                    onPress={() => handleDeleteLog(log.id)}
                    style={styles.deleteLogBtn}
                  >
                    <Ionicons
                      name="trash-outline"
                      size={16}
                      color={theme.colors.textMuted}
                    />
                  </TouchableOpacity>
                </View>

                <Text style={styles.logRawInput}>{log.raw_input}</Text>

                <View style={styles.logMacroPills}>
                  <Text style={styles.macroPill}>
                    P: <Text style={{ color: theme.colors.primary }}>{Math.round(log.protein_g || 0)}g</Text>
                  </Text>
                  <Text style={styles.macroPill}>
                    C: <Text style={{ color: theme.colors.info }}>{Math.round(log.carbs_g || 0)}g</Text>
                  </Text>
                  <Text style={styles.macroPill}>
                    G: <Text style={{ color: theme.colors.fat }}>{Math.round(log.fat_g || 0)}g</Text>
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
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
  card: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: theme.spacing.md,
  },
  macroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  cardTitle: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: 'bold',
  },
  calorieRatio: {
    fontSize: 14,
  },
  calorieActive: {
    color: theme.colors.primary,
    fontSize: 18,
    fontWeight: '900',
  },
  calorieTarget: {
    color: theme.colors.textMuted,
  },
  macroRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  macroItem: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceSubtle,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    borderWidth: 1,
  },
  macroVal: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  macroTargetText: {
    color: theme.colors.textMuted,
    fontSize: 10,
    marginTop: 2,
  },
  macroLabel: {
    color: theme.colors.textSecondary,
    fontSize: 11,
    marginTop: 4,
    fontWeight: '600',
  },
  sectionTitle: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: 'bold',
  },
  mealTypeRow: {
    flexDirection: 'row',
    gap: theme.spacing.xs,
  },
  mealTypeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    backgroundColor: theme.colors.surfaceSubtle,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 4,
  },
  mealTypeBtnActive: {
    backgroundColor: theme.colors.primaryMuted,
    borderColor: theme.colors.primary,
  },
  mealTypeText: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  mealTypeTextActive: {
    color: theme.colors.primary,
  },
  inputBox: {
    gap: theme.spacing.sm,
  },
  textInput: {
    backgroundColor: theme.colors.surfaceSubtle,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    color: theme.colors.text,
    fontSize: 14,
    padding: theme.spacing.md,
    minHeight: 70,
    textAlignVertical: 'top',
  },
  analyzeBtn: {
    backgroundColor: theme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: theme.borderRadius.md,
    gap: 6,
  },
  analyzeBtnDisabled: {
    opacity: 0.6,
  },
  analyzeBtnText: {
    color: '#000',
    fontSize: 14,
    fontWeight: 'bold',
  },
  analysisResultBox: {
    backgroundColor: theme.colors.surfaceSubtle,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.primary + '44',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.xs,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resultTitle: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: 'bold',
  },
  confidenceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeHigh: {
    backgroundColor: '#0d2818',
  },
  badgeMedium: {
    backgroundColor: '#2b2207',
  },
  badgeText: {
    color: theme.colors.primary,
    fontSize: 11,
    fontWeight: 'bold',
  },
  resultTotalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
  },
  resultTotalItem: {
    color: theme.colors.textSecondary,
    fontSize: 12,
  },
  bold: {
    color: theme.colors.text,
    fontWeight: 'bold',
  },
  foodList: {
    gap: 4,
  },
  foodRow: {
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  foodRowInfo: {
    gap: 2,
  },
  foodRowName: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  foodRowDetails: {
    color: theme.colors.textMuted,
    fontSize: 11,
  },
  foodRowNotes: {
    color: theme.colors.textSecondary,
    fontSize: 10,
    fontStyle: 'italic',
  },
  aiComment: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontStyle: 'italic',
  },
  saveFoodBtn: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.sm,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  saveFoodBtnDisabled: {
    opacity: 0.6,
  },
  saveFoodBtnText: {
    color: '#000',
    fontSize: 14,
    fontWeight: 'bold',
  },
  emptyLogs: {
    alignItems: 'center',
    paddingVertical: theme.spacing.lg,
    gap: theme.spacing.xs,
  },
  emptyLogsText: {
    color: theme.colors.textMuted,
    fontSize: 13,
  },
  logList: {
    gap: theme.spacing.sm,
  },
  logCard: {
    backgroundColor: theme.colors.surfaceSubtle,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 6,
  },
  logCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logTypeTag: {
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  logTypeTagText: {
    color: theme.colors.primary,
    fontSize: 11,
    fontWeight: 'bold',
  },
  logCalories: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: 'bold',
    flex: 1,
    marginLeft: theme.spacing.sm,
  },
  deleteLogBtn: {
    padding: 4,
  },
  logRawInput: {
    color: theme.colors.textSecondary,
    fontSize: 13,
  },
  logMacroPills: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginTop: 2,
  },
  macroPill: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
})
