import React, { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Image,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import {
  Camera,
  Image as GalleryIcon,
  Barcode,
  Utensils,
  FileText,
  Mic,
  Sparkles,
  Check,
  X,
  Plus,
  Minus,
  Trash2,
  AlertTriangle,
  ShieldCheck,
  Zap,
  ChevronRight,
  Flame,
  RotateCcw,
} from 'lucide-react-native'
import { foodScannerService, FoodProduct } from '@/lib/services/foodScannerService'
import { aiService } from '@/lib/services/ai'
import { FoodPlateItem, NutritionalLabelResult } from '@/lib/services/ai/types'
import { MealType, FoodItemParsed } from '@/types'

export type ScannerMode = 'plate' | 'label' | 'barcode' | 'natural'

interface SmartFoodScannerModalProps {
  visible: boolean
  onClose: () => void
  mealType: MealType
  onSaveToMeal: (foods: FoodItemParsed[], rawInput: string) => Promise<void>
}

export default function SmartFoodScannerModal({
  visible,
  onClose,
  mealType,
  onSaveToMeal,
}: SmartFoodScannerModalProps) {
  const [activeMode, setActiveMode] = useState<ScannerMode>('plate')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')

  // State: Foto seleccionada
  const [imageUri, setImageUri] = useState<string | null>(null)
  const [imageMetrics, setImageMetrics] = useState<{ costUsd: number; latencyMs: number; source: string } | null>(null)

  // State: Plato de Comida (Modo 'plate')
  const [plateMealName, setPlateMealName] = useState('')
  const [plateItems, setPlateItems] = useState<FoodPlateItem[]>([])

  // State: Etiqueta / Producto (Modo 'label')
  const [scannedProduct, setScannedProduct] = useState<FoodProduct | null>(null)
  const [labelAudit, setLabelAudit] = useState<NutritionalLabelResult | null>(null)
  const [selectedPortionG, setSelectedPortionG] = useState('100')

  // State: Código de barras (Modo 'barcode')
  const [barcodeInput, setBarcodeInput] = useState('')
  const [barcodeProduct, setBarcodeProduct] = useState<FoodProduct | null>(null)
  const [barcodePortionG, setBarcodePortionG] = useState('100')

  // State: Texto / Voz Libre (Modo 'natural')
  const [naturalText, setNaturalText] = useState('')

  const resetScannerState = () => {
    setImageUri(null)
    setImageMetrics(null)
    setPlateItems([])
    setPlateMealName('')
    setScannedProduct(null)
    setLabelAudit(null)
    setBarcodeProduct(null)
    setBarcodeInput('')
    setNaturalText('')
    setLoading(false)
    setStatusMessage('')
  }

  const handleClose = () => {
    resetScannerState()
    onClose()
  }

  // =========================================================================
  // 1. Selector de Cámara o Galería
  // =========================================================================
  const pickImage = async (useCamera: boolean) => {
    try {
      let result: ImagePicker.ImagePickerResult
      if (useCamera) {
        if (Platform.OS !== 'web') {
          const { status } = await ImagePicker.requestCameraPermissionsAsync()
          if (status !== 'granted') {
            Alert.alert('Permiso necesario', 'Se necesita acceso a la cámara para escanear comidas.')
            return
          }
        }
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ['images'],
          allowsEditing: false,
          quality: 0.8,
          base64: true,
        })
      } else {
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: false,
          quality: 0.8,
          base64: true,
        })
      }

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0]
        const uri = asset.uri
        const base64Data = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : uri
        setImageUri(uri)
        await processImageWithAi(base64Data)
      }
    } catch (err: any) {
      console.error('[Scanner] Error al capturar imagen:', err)
      Alert.alert('Error', err?.message || 'No se pudo abrir la cámara o galería.')
    }
  }

  // =========================================================================
  // 2. Procesar con Visión según Modo Activo
  // =========================================================================
  const processImageWithAi = async (base64OrUri: string) => {
    setLoading(true)
    try {
      if (activeMode === 'plate') {
        setStatusMessage('🧠 Analizando plato y estimando porciones...')
        const res = await foodScannerService.scanPlateWithAi(base64OrUri)
        setPlateMealName(res.mealName)
        setPlateItems(res.items)
        setImageMetrics({
          costUsd: res.costUsd,
          latencyMs: res.latencyMs,
          source: 'Claude 3.5 Sonnet Vision (Compresión 92%)',
        })
      } else if (activeMode === 'label') {
        setStatusMessage('🔍 Leyendo tabla nutricional y auditando ingredientes...')
        const res = await foodScannerService.scanLabelWithAi(base64OrUri)
        setScannedProduct(res.product)
        setLabelAudit(res.aiResult)
        setSelectedPortionG('100')
        setImageMetrics({
          costUsd: res.costUsd,
          latencyMs: res.latencyMs,
          source: 'Auditoría IA Claude 3.5 Sonnet',
        })
      }
    } catch (err: any) {
      Alert.alert('Error de Escaneo', err.message || 'No se pudo procesar la imagen.')
    } finally {
      setLoading(false)
      setStatusMessage('')
    }
  }

  // =========================================================================
  // 3. Buscar Código de Barras
  // =========================================================================
  const handleBarcodeLookup = async (codeToSearch?: string) => {
    const code = (codeToSearch || barcodeInput).trim()
    if (!code) {
      Alert.alert('Código vacío', 'Introduce un código de barras (ej. 8410000000000)')
      return
    }

    setLoading(true)
    setStatusMessage('⚡ Consultando base de datos y Open Food Facts...')
    try {
      const res = await foodScannerService.lookupByBarcode(code)
      if (res.product) {
        setBarcodeProduct(res.product)
        setBarcodePortionG(String(res.product.servingSizeG || 100))
        setImageMetrics({
          costUsd: res.costUsd,
          latencyMs: res.latencyMs,
          source: res.product.sourceLabel || 'Base de Datos Carga ($0.00)',
        })
      } else {
        Alert.alert(
          'Producto no encontrado',
          'Este código de barras no está en la base de datos global. Puedes escanear su tabla nutricional con la cámara para añadirlo automáticamente.',
          [
            { text: 'Cancelar', style: 'cancel' },
            {
              text: 'Escanear Tabla Nutricional',
              onPress: () => {
                setActiveMode('label')
              },
            },
          ]
        )
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Error al buscar el código de barras.')
    } finally {
      setLoading(false)
      setStatusMessage('')
    }
  }

  // =========================================================================
  // 4. Parser de Lenguaje Natural (Texto / Voz)
  // =========================================================================
  const handleNaturalParse = async () => {
    if (!naturalText.trim()) {
      Alert.alert('Texto vacío', 'Escribe o dicta lo que comiste.')
      return
    }

    setLoading(true)
    setStatusMessage('🎙️ Desglosando alimentos y calculando macros...')
    try {
      const { data, metrics } = await aiService.parseNaturalMeal(naturalText)
      const convertedItems: FoodPlateItem[] = data.items.map((it) => ({
        name: it.name,
        estimatedGrams: it.grams,
        calories: it.calories,
        protein: it.protein,
        carbs: it.carbs,
        fat: it.fat,
        confidence: 0.95,
      }))
      setPlateMealName('Comida registrada por texto')
      setPlateItems(convertedItems)
      setActiveMode('plate') // Mostrar en vista de plato editable
      setImageMetrics({
        costUsd: metrics.estimatedCostUsd,
        latencyMs: metrics.latencyMs,
        source: 'Claude 3.5 Haiku (~300ms)',
      })
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Error al analizar el texto.')
    } finally {
      setLoading(false)
      setStatusMessage('')
    }
  }

  // =========================================================================
  // 5. Ajustar Gramos en Ítems de Plato
  // =========================================================================
  const updateItemGrams = (index: number, delta: number) => {
    setPlateItems((prev) => {
      const next = [...prev]
      const item = { ...next[index] }
      const newGrams = Math.max(10, item.estimatedGrams + delta)
      const ratio = newGrams / (item.estimatedGrams || 1)
      item.estimatedGrams = newGrams
      item.calories = Math.round(item.calories * ratio)
      item.protein = Number((item.protein * ratio).toFixed(1))
      item.carbs = Number((item.carbs * ratio).toFixed(1))
      item.fat = Number((item.fat * ratio).toFixed(1))
      next[index] = item
      return next
    })
  }

  const removeItemFromPlate = (index: number) => {
    setPlateItems((prev) => prev.filter((_, i) => i !== index))
  }

  // =========================================================================
  // 6. Guardar en el Diario Nutricional
  // =========================================================================
  const handleConfirmSave = async () => {
    setSaving(true)
    try {
      if (activeMode === 'plate' && plateItems.length > 0) {
        const parsedFoods: FoodItemParsed[] = plateItems.map((it) => ({
          name: it.name,
          quantity_g: it.estimatedGrams,
          calories: it.calories,
          protein_g: it.protein,
          carbs_g: it.carbs,
          fat_g: it.fat,
          confidence: it.confidence > 0.8 ? 'high' : 'medium',
        }))
        const rawInput = plateMealName || `Plato con ${plateItems.length} alimentos`
        await onSaveToMeal(parsedFoods, rawInput)
        handleClose()
      } else if (activeMode === 'label' && scannedProduct) {
        const portion = Math.max(1, parseFloat(selectedPortionG) || 100)
        const ratio = portion / 100
        const parsedFoods: FoodItemParsed[] = [
          {
            name: `${scannedProduct.name}${scannedProduct.brand ? ` (${scannedProduct.brand})` : ''}`,
            quantity_g: portion,
            calories: Math.round(scannedProduct.calories * ratio),
            protein_g: Number((scannedProduct.protein * ratio).toFixed(1)),
            carbs_g: Number((scannedProduct.carbs * ratio).toFixed(1)),
            fat_g: Number((scannedProduct.fat * ratio).toFixed(1)),
            confidence: 'high',
          },
        ]
        await onSaveToMeal(parsedFoods, scannedProduct.name)
        handleClose()
      } else if (activeMode === 'barcode' && barcodeProduct) {
        const portion = Math.max(1, parseFloat(barcodePortionG) || 100)
        const ratio = portion / 100
        const parsedFoods: FoodItemParsed[] = [
          {
            name: `${barcodeProduct.name}${barcodeProduct.brand ? ` (${barcodeProduct.brand})` : ''}`,
            quantity_g: portion,
            calories: Math.round(barcodeProduct.calories * ratio),
            protein_g: Number((barcodeProduct.protein * ratio).toFixed(1)),
            carbs_g: Number((barcodeProduct.carbs * ratio).toFixed(1)),
            fat_g: Number((barcodeProduct.fat * ratio).toFixed(1)),
            confidence: 'high',
          },
        ]
        await onSaveToMeal(parsedFoods, barcodeProduct.name)
        handleClose()
      }
    } catch (err: any) {
      Alert.alert('Error al guardar', err.message || 'No se pudo registrar la comida.')
    } finally {
      setSaving(false)
    }
  }

  // Totales calculados de plato
  const totalPlateCals = plateItems.reduce((s, it) => s + it.calories, 0)
  const totalPlateP = Number(plateItems.reduce((s, it) => s + it.protein, 0).toFixed(1))
  const totalPlateC = Number(plateItems.reduce((s, it) => s + it.carbs, 0).toFixed(1))
  const totalPlateF = Number(plateItems.reduce((s, it) => s + it.fat, 0).toFixed(1))

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={handleClose}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <View style={styles.badgeRow}>
              <Sparkles size={14} color="#38BDF8" />
              <Text style={styles.badgeText}>ESCÁNER DE IA & VISIÓN</Text>
            </View>
            <Text style={styles.headerTitle}>Registrar en {mealType.toUpperCase()}</Text>
          </View>
          <TouchableOpacity style={styles.closeBtn} onPress={handleClose}>
            <X size={20} color="#94A3B8" />
          </TouchableOpacity>
        </View>

        {/* Selector de Modo de Escaneo */}
        <View style={styles.modeTabs}>
          <TouchableOpacity
            style={[styles.tabBtn, activeMode === 'plate' && styles.tabBtnActive]}
            onPress={() => setActiveMode('plate')}
          >
            <Utensils size={15} color={activeMode === 'plate' ? '#38BDF8' : '#64748B'} />
            <Text style={[styles.tabText, activeMode === 'plate' && styles.tabTextActive]}>
              Plato
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeMode === 'label' && styles.tabBtnActive]}
            onPress={() => setActiveMode('label')}
          >
            <FileText size={15} color={activeMode === 'label' ? '#38BDF8' : '#64748B'} />
            <Text style={[styles.tabText, activeMode === 'label' && styles.tabTextActive]}>
              Etiqueta
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeMode === 'barcode' && styles.tabBtnActive]}
            onPress={() => setActiveMode('barcode')}
          >
            <Barcode size={15} color={activeMode === 'barcode' ? '#38BDF8' : '#64748B'} />
            <Text style={[styles.tabText, activeMode === 'barcode' && styles.tabTextActive]}>
              Código
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeMode === 'natural' && styles.tabBtnActive]}
            onPress={() => setActiveMode('natural')}
          >
            <Mic size={15} color={activeMode === 'natural' ? '#38BDF8' : '#64748B'} />
            <Text style={[styles.tabText, activeMode === 'natural' && styles.tabTextActive]}>
              Voz/Texto
            </Text>
          </TouchableOpacity>
        </View>

        {/* Indicador de Métricas de Coste/Ahorro */}
        {imageMetrics && (
          <View style={styles.metricsBanner}>
            <Zap size={14} color="#10B981" />
            <Text style={styles.metricsText}>
              {imageMetrics.source} • {imageMetrics.latencyMs}ms •{' '}
              {imageMetrics.costUsd > 0 ? `$${imageMetrics.costUsd.toFixed(4)}` : '$0.00'}
            </Text>
          </View>
        )}

        {/* Contenido Principal con Scroll */}
        <ScrollView style={styles.scrollContent} contentContainerStyle={styles.scrollInner}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#38BDF8" />
              <Text style={styles.loadingTitle}>{statusMessage || 'Procesando con IA...'}</Text>
              <Text style={styles.loadingSub}>Optimizando imagen y validando macronutrientes</Text>
            </View>
          ) : (
            <>
              {/* ================================================= */}
              {/* MODO 1: PLATO DE COMIDA */}
              {/* ================================================= */}
              {activeMode === 'plate' && (
                <View>
                  {plateItems.length === 0 ? (
                    <View style={styles.captureCard}>
                      <Utensils size={40} color="#38BDF8" style={{ marginBottom: 12 }} />
                      <Text style={styles.captureTitle}>Escanea tu Plato de Comida</Text>
                      <Text style={styles.captureSub}>
                        La IA identificará los ingredientes, estimará los gramos y calculará las
                        calorías automáticamente.
                      </Text>

                      <View style={styles.actionButtonsRow}>
                        <TouchableOpacity
                          style={styles.primaryActionBtn}
                          onPress={() => pickImage(true)}
                        >
                          <Camera size={18} color="#0F172A" />
                          <Text style={styles.primaryActionBtnText}>Tomar Foto</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.secondaryActionBtn}
                          onPress={() => pickImage(false)}
                        >
                          <GalleryIcon size={18} color="#38BDF8" />
                          <Text style={styles.secondaryActionBtnText}>Galería</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : (
                    <View>
                      {/* Vista previa de foto si existe */}
                      {imageUri && (
                        <Image source={{ uri: imageUri }} style={styles.previewImage} />
                      )}

                      {/* Título de comida y botón de re-escanear */}
                      <View style={styles.resultHeaderRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.plateTitle}>{plateMealName || 'Plato Detectado'}</Text>
                          <Text style={styles.plateSubtitle}>
                            {plateItems.length} ingredientes detectados (Toca para editar gramos)
                          </Text>
                        </View>
                        <TouchableOpacity
                          style={styles.retakeBtn}
                          onPress={() => {
                            setPlateItems([])
                            setImageUri(null)
                          }}
                        >
                          <Camera size={14} color="#94A3B8" />
                          <Text style={styles.retakeBtnText}>Repetir</Text>
                        </TouchableOpacity>
                      </View>

                      {/* Lista de alimentos desglosados */}
                      {plateItems.map((item, idx) => (
                        <View key={idx} style={styles.foodItemCard}>
                          <View style={styles.foodItemTop}>
                            <Text style={styles.foodItemName}>{item.name}</Text>
                            <TouchableOpacity
                              onPress={() => removeItemFromPlate(idx)}
                              style={styles.removeBtn}
                            >
                              <Trash2 size={15} color="#EF4444" />
                            </TouchableOpacity>
                          </View>

                          <View style={styles.foodItemBottom}>
                            {/* Stepper de Gramos */}
                            <View style={styles.stepperContainer}>
                              <TouchableOpacity
                                style={styles.stepBtn}
                                onPress={() => updateItemGrams(idx, -25)}
                              >
                                <Minus size={14} color="#94A3B8" />
                              </TouchableOpacity>
                              <Text style={styles.gramsText}>{item.estimatedGrams}g</Text>
                              <TouchableOpacity
                                style={styles.stepBtn}
                                onPress={() => updateItemGrams(idx, 25)}
                              >
                                <Plus size={14} color="#38BDF8" />
                              </TouchableOpacity>
                            </View>

                            {/* Macros del alimento */}
                            <View style={styles.itemMacrosRow}>
                              <Text style={styles.itemCalText}>{item.calories} kcal</Text>
                              <Text style={styles.itemPText}>P: {item.protein}g</Text>
                              <Text style={styles.itemCText}>C: {item.carbs}g</Text>
                              <Text style={styles.itemFText}>G: {item.fat}g</Text>
                            </View>
                          </View>
                        </View>
                      ))}

                      {/* Resumen Total del Plato */}
                      <View style={styles.plateSummaryCard}>
                        <View style={styles.summaryTopRow}>
                          <View>
                            <Text style={styles.summaryLabel}>TOTAL DEL PLATO</Text>
                            <Text style={styles.summaryCalories}>{totalPlateCals} kcal</Text>
                          </View>
                          <Flame size={28} color="#FB923C" />
                        </View>

                        <View style={styles.summaryMacrosRow}>
                          <View style={styles.macroPill}>
                            <Text style={styles.macroPillLabel}>Proteína</Text>
                            <Text style={styles.macroPillVal}>{totalPlateP}g</Text>
                          </View>
                          <View style={styles.macroPill}>
                            <Text style={styles.macroPillLabel}>Carbos</Text>
                            <Text style={styles.macroPillVal}>{totalPlateC}g</Text>
                          </View>
                          <View style={styles.macroPill}>
                            <Text style={styles.macroPillLabel}>Grasas</Text>
                            <Text style={styles.macroPillVal}>{totalPlateF}g</Text>
                          </View>
                        </View>
                      </View>
                    </View>
                  )}
                </View>
              )}

              {/* ================================================= */}
              {/* MODO 2: TABLA NUTRICIONAL / PRODUCTO */}
              {/* ================================================= */}
              {activeMode === 'label' && (
                <View>
                  {!scannedProduct ? (
                    <View style={styles.captureCard}>
                      <FileText size={40} color="#38BDF8" style={{ marginBottom: 12 }} />
                      <Text style={styles.captureTitle}>Escanea la Tabla de Información</Text>
                      <Text style={styles.captureSub}>
                        Foto a la tabla trasera o lista de ingredientes para auditar azúcares
                        añadidos, aceites refinados y extraer macros oficiales.
                      </Text>

                      <View style={styles.actionButtonsRow}>
                        <TouchableOpacity
                          style={styles.primaryActionBtn}
                          onPress={() => pickImage(true)}
                        >
                          <Camera size={18} color="#0F172A" />
                          <Text style={styles.primaryActionBtnText}>Foto Etiqueta</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.secondaryActionBtn}
                          onPress={() => pickImage(false)}
                        >
                          <GalleryIcon size={18} color="#38BDF8" />
                          <Text style={styles.secondaryActionBtnText}>Galería</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : (
                    <View>
                      {/* Tarjeta de Producto Escaneado */}
                      <View style={styles.productCard}>
                        <View style={styles.productTop}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.productName}>{scannedProduct.name}</Text>
                            {scannedProduct.brand && (
                              <Text style={styles.productBrand}>Marca: {scannedProduct.brand}</Text>
                            )}
                          </View>

                          {/* Badge de Calidad / Ultraprocesado */}
                          {labelAudit && (
                            <View
                              style={[
                                styles.healthScoreBadge,
                                labelAudit.classification === 'clean'
                                  ? styles.healthClean
                                  : labelAudit.classification === 'moderate'
                                  ? styles.healthModerate
                                  : styles.healthUltra,
                              ]}
                            >
                              <ShieldCheck
                                size={14}
                                color={
                                  labelAudit.classification === 'clean' ? '#10B981' : '#F59E0B'
                                }
                              />
                              <Text style={styles.healthScoreText}>
                                {labelAudit.classification === 'clean'
                                  ? 'Alimento Limpio'
                                  : labelAudit.classification === 'moderate'
                                  ? 'Moderado'
                                  : 'Ultraprocesado'}
                              </Text>
                            </View>
                          )}
                        </View>

                        {/* Selector de Porción */}
                        <View style={styles.portionSelectorRow}>
                          <Text style={styles.portionLabel}>Porción a registrar:</Text>
                          <View style={styles.portionInputContainer}>
                            <TextInput
                              style={styles.portionInput}
                              keyboardType="numeric"
                              value={selectedPortionG}
                              onChangeText={setSelectedPortionG}
                            />
                            <Text style={styles.portionUnit}>gramos</Text>
                          </View>
                        </View>

                        {/* Macros calculados para la porción */}
                        {(() => {
                          const portion = parseFloat(selectedPortionG) || 100
                          const ratio = portion / 100
                          return (
                            <View style={styles.macrosGrid}>
                              <View style={styles.macroCell}>
                                <Text style={styles.macroCellVal}>
                                  {Math.round(scannedProduct.calories * ratio)}
                                </Text>
                                <Text style={styles.macroCellLabel}>kcal</Text>
                              </View>
                              <View style={styles.macroCell}>
                                <Text style={styles.macroCellVal}>
                                  {(scannedProduct.protein * ratio).toFixed(1)}g
                                </Text>
                                <Text style={styles.macroCellLabel}>Proteína</Text>
                              </View>
                              <View style={styles.macroCell}>
                                <Text style={styles.macroCellVal}>
                                  {(scannedProduct.carbs * ratio).toFixed(1)}g
                                </Text>
                                <Text style={styles.macroCellLabel}>Carbos</Text>
                              </View>
                              <View style={styles.macroCell}>
                                <Text style={styles.macroCellVal}>
                                  {(scannedProduct.fat * ratio).toFixed(1)}g
                                </Text>
                                <Text style={styles.macroCellLabel}>Grasas</Text>
                              </View>
                            </View>
                          )
                        })()}

                        {/* Alertas de Ingredientes */}
                        {labelAudit && labelAudit.warningFlags.length > 0 && (
                          <View style={styles.warningsCard}>
                            <View style={styles.warningTitleRow}>
                              <AlertTriangle size={15} color="#EF4444" />
                              <Text style={styles.warningTitle}>Alertas de Ingredientes</Text>
                            </View>
                            {labelAudit.warningFlags.map((w, i) => (
                              <Text key={i} style={styles.warningItem}>
                                • {w}
                              </Text>
                            ))}
                          </View>
                        )}

                        {/* Botón Guardar en Diario */}
                        <TouchableOpacity
                          style={styles.saveToDiaryBtn}
                          onPress={handleConfirmSave}
                          disabled={saving}
                        >
                          {saving ? (
                            <ActivityIndicator color="#0F172A" size="small" />
                          ) : (
                            <>
                              <Check size={20} color="#0F172A" />
                              <Text style={styles.saveToDiaryBtnText}>
                                Registrar {scannedProduct.name} en mis Macros
                              </Text>
                            </>
                          )}
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.retakeFullBtn}
                          onPress={() => {
                            setScannedProduct(null)
                            setLabelAudit(null)
                          }}
                        >
                          <RotateCcw size={15} color="#94A3B8" />
                          <Text style={styles.retakeFullBtnText}>Escanear otra etiqueta</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                </View>
              )}

              {/* ================================================= */}
              {/* MODO 3: CÓDIGO DE BARRAS */}
              {/* ================================================= */}
              {activeMode === 'barcode' && (
                <View>
                  <View style={styles.barcodeInputCard}>
                    <Barcode size={32} color="#38BDF8" style={{ marginBottom: 8 }} />
                    <Text style={styles.barcodeInputTitle}>Búsqueda Instantánea ($0.00)</Text>
                    <Text style={styles.barcodeInputSub}>
                      Consulta en Supabase y Open Food Facts global.
                    </Text>

                    <View style={styles.barcodeSearchRow}>
                      <TextInput
                        style={styles.barcodeField}
                        placeholder="Ej. 8410000500123"
                        placeholderTextColor="#64748B"
                        keyboardType="numeric"
                        value={barcodeInput}
                        onChangeText={setBarcodeInput}
                        onSubmitEditing={() => handleBarcodeLookup()}
                      />
                      <TouchableOpacity
                        style={styles.barcodeSearchBtn}
                        onPress={() => handleBarcodeLookup()}
                      >
                        <ChevronRight size={20} color="#0F172A" />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {barcodeProduct && (
                    <View style={styles.productCard}>
                      <Text style={styles.productName}>{barcodeProduct.name}</Text>
                      {barcodeProduct.brand && (
                        <Text style={styles.productBrand}>Marca: {barcodeProduct.brand}</Text>
                      )}

                      {/* Selector de Porción */}
                      <View style={styles.portionSelectorRow}>
                        <Text style={styles.portionLabel}>Porción:</Text>
                        <View style={styles.portionInputContainer}>
                          <TextInput
                            style={styles.portionInput}
                            keyboardType="numeric"
                            value={barcodePortionG}
                            onChangeText={setBarcodePortionG}
                          />
                          <Text style={styles.portionUnit}>g</Text>
                        </View>
                      </View>

                      {/* Macros */}
                      {(() => {
                        const portion = parseFloat(barcodePortionG) || 100
                        const ratio = portion / 100
                        return (
                          <View style={styles.macrosGrid}>
                            <View style={styles.macroCell}>
                              <Text style={styles.macroCellVal}>
                                {Math.round(barcodeProduct.calories * ratio)}
                              </Text>
                              <Text style={styles.macroCellLabel}>kcal</Text>
                            </View>
                            <View style={styles.macroCell}>
                              <Text style={styles.macroCellVal}>
                                {(barcodeProduct.protein * ratio).toFixed(1)}g
                              </Text>
                              <Text style={styles.macroCellLabel}>Proteína</Text>
                            </View>
                            <View style={styles.macroCell}>
                              <Text style={styles.macroCellVal}>
                                {(barcodeProduct.carbs * ratio).toFixed(1)}g
                              </Text>
                              <Text style={styles.macroCellLabel}>Carbos</Text>
                            </View>
                            <View style={styles.macroCell}>
                              <Text style={styles.macroCellVal}>
                                {(barcodeProduct.fat * ratio).toFixed(1)}g
                              </Text>
                              <Text style={styles.macroCellLabel}>Grasas</Text>
                            </View>
                          </View>
                        )
                      })()}

                      {/* Botón Guardar en Diario */}
                      <TouchableOpacity
                        style={styles.saveToDiaryBtn}
                        onPress={handleConfirmSave}
                        disabled={saving}
                      >
                        {saving ? (
                          <ActivityIndicator color="#0F172A" size="small" />
                        ) : (
                          <>
                            <Check size={20} color="#0F172A" />
                            <Text style={styles.saveToDiaryBtnText}>
                              Registrar {barcodeProduct.name} en mis Macros
                            </Text>
                          </>
                        )}
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.retakeFullBtn}
                        onPress={() => {
                          setBarcodeProduct(null)
                          setBarcodeInput('')
                        }}
                      >
                        <RotateCcw size={15} color="#94A3B8" />
                        <Text style={styles.retakeFullBtnText}>Buscar otro producto</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              )}

              {/* ================================================= */}
              {/* MODO 4: VOZ / TEXTO NATURAL */}
              {/* ================================================= */}
              {activeMode === 'natural' && (
                <View style={styles.naturalCard}>
                  <Mic size={32} color="#38BDF8" style={{ marginBottom: 8 }} />
                  <Text style={styles.naturalTitle}>Dictado o Texto Libre</Text>
                  <Text style={styles.naturalSub}>
                    Escribe o dicta todo lo que comiste en lenguaje natural.
                  </Text>

                  <TextInput
                    style={styles.naturalTextArea}
                    placeholder="Ej. Me comí 150g de pechuga a la plancha, 200g de arroz basmati y una manzana mediana"
                    placeholderTextColor="#64748B"
                    multiline
                    numberOfLines={4}
                    value={naturalText}
                    onChangeText={setNaturalText}
                  />

                  <TouchableOpacity style={styles.primaryActionBtn} onPress={handleNaturalParse}>
                    <Sparkles size={18} color="#0F172A" />
                    <Text style={styles.primaryActionBtnText}>Analizar con IA (~300ms)</Text>
                  </TouchableOpacity>
                </View>
              )}
            </>
          )}
        </ScrollView>

        {/* Footer con Botón de Confirmación */}
        {((activeMode === 'plate' && plateItems.length > 0) ||
          (activeMode === 'label' && scannedProduct) ||
          (activeMode === 'barcode' && barcodeProduct)) && (
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.saveMainBtn}
              onPress={handleConfirmSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#0F172A" />
              ) : (
                <>
                  <Check size={20} color="#0F172A" />
                  <Text style={styles.saveMainBtnText}>
                    Guardar en {mealType.toUpperCase()}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090D16',
    paddingTop: Platform.OS === 'ios' ? 54 : 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  badgeText: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  headerTitle: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '700',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeTabs: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  tabBtnActive: {
    backgroundColor: '#0B2238',
    borderColor: '#0284C7',
  },
  tabText: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#38BDF8',
    fontWeight: '700',
  },
  metricsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#064E3B20',
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#10B98130',
  },
  metricsText: {
    color: '#34D399',
    fontSize: 11,
    fontWeight: '600',
  },
  scrollContent: {
    flex: 1,
  },
  scrollInner: {
    padding: 20,
  },
  loadingContainer: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  loadingTitle: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 16,
    textAlign: 'center',
  },
  loadingSub: {
    color: '#94A3B8',
    fontSize: 13,
    marginTop: 6,
    textAlign: 'center',
  },
  captureCard: {
    backgroundColor: '#0F172A',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  captureTitle: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  captureSub: {
    color: '#94A3B8',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 24,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  primaryActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#38BDF8',
    paddingVertical: 14,
    borderRadius: 12,
  },
  primaryActionBtnText: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '700',
  },
  secondaryActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#1E293B',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  secondaryActionBtnText: {
    color: '#38BDF8',
    fontSize: 14,
    fontWeight: '700',
  },
  previewImage: {
    width: '100%',
    height: 180,
    borderRadius: 14,
    marginBottom: 16,
  },
  resultHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  plateTitle: {
    color: '#F8FAFC',
    fontSize: 17,
    fontWeight: '700',
  },
  plateSubtitle: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 2,
  },
  retakeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#1E293B',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  retakeBtnText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  foodItemCard: {
    backgroundColor: '#0F172A',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  foodItemTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  foodItemName: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  removeBtn: {
    padding: 4,
  },
  foodItemBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 8,
    padding: 3,
  },
  stepBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  gramsText: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '700',
    minWidth: 46,
    textAlign: 'center',
  },
  itemMacrosRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  itemCalText: {
    color: '#FB923C',
    fontSize: 13,
    fontWeight: '700',
  },
  itemPText: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '600',
  },
  itemCText: {
    color: '#FBBF24',
    fontSize: 11,
    fontWeight: '600',
  },
  itemFText: {
    color: '#EC4899',
    fontSize: 11,
    fontWeight: '600',
  },
  plateSummaryCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  summaryTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  summaryLabel: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  summaryCalories: {
    color: '#F8FAFC',
    fontSize: 24,
    fontWeight: '800',
    marginTop: 2,
  },
  summaryMacrosRow: {
    flexDirection: 'row',
    gap: 8,
  },
  macroPill: {
    flex: 1,
    backgroundColor: '#0F172A',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  macroPillLabel: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '600',
  },
  macroPillVal: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 2,
  },
  productCard: {
    backgroundColor: '#0F172A',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  productTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  productName: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '700',
  },
  productBrand: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 2,
  },
  healthScoreBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  healthClean: {
    backgroundColor: '#064E3B30',
  },
  healthModerate: {
    backgroundColor: '#78350F30',
  },
  healthUltra: {
    backgroundColor: '#7F1D1D30',
  },
  healthScoreText: {
    color: '#F8FAFC',
    fontSize: 11,
    fontWeight: '700',
  },
  portionSelectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#1E293B',
    marginBottom: 16,
  },
  portionLabel: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '600',
  },
  portionInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 8,
    paddingHorizontal: 10,
  },
  portionInput: {
    color: '#38BDF8',
    fontSize: 15,
    fontWeight: '700',
    paddingVertical: 6,
    minWidth: 44,
    textAlign: 'center',
  },
  portionUnit: {
    color: '#64748B',
    fontSize: 12,
    marginLeft: 4,
  },
  macrosGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  macroCell: {
    flex: 1,
    backgroundColor: '#1E293B',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  macroCellVal: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '700',
  },
  macroCellLabel: {
    color: '#94A3B8',
    fontSize: 10,
    marginTop: 2,
  },
  warningsCard: {
    backgroundColor: '#7F1D1D20',
    borderRadius: 12,
    padding: 12,
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#EF444430',
  },
  warningTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  warningTitle: {
    color: '#F87171',
    fontSize: 12,
    fontWeight: '700',
  },
  warningItem: {
    color: '#FCA5A5',
    fontSize: 12,
    lineHeight: 17,
  },
  barcodeInputCard: {
    backgroundColor: '#0F172A',
    borderRadius: 18,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  barcodeInputTitle: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '700',
  },
  barcodeInputSub: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 4,
    marginBottom: 16,
  },
  barcodeSearchRow: {
    flexDirection: 'row',
    gap: 8,
    width: '100%',
  },
  barcodeField: {
    flex: 1,
    backgroundColor: '#1E293B',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#F8FAFC',
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  barcodeSearchBtn: {
    backgroundColor: '#38BDF8',
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  naturalCard: {
    backgroundColor: '#0F172A',
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  naturalTitle: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '700',
  },
  naturalSub: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 4,
    marginBottom: 16,
  },
  naturalTextArea: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 14,
    color: '#F8FAFC',
    fontSize: 14,
    minHeight: 100,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 16,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
    backgroundColor: '#090D16',
  },
  saveMainBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#38BDF8',
    paddingVertical: 14,
    borderRadius: 14,
  },
  saveMainBtnText: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '800',
  },
  demoPresetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#38BDF840',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    marginTop: 12,
  },
  demoPresetText: {
    color: '#38BDF8',
    fontSize: 12,
    fontWeight: '700',
  },
  saveToDiaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#38BDF8',
    paddingVertical: 13,
    borderRadius: 12,
    marginTop: 14,
  },
  saveToDiaryBtnText: {
    color: '#0F172A',
    fontSize: 13,
    fontWeight: '800',
  },
  retakeFullBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    marginTop: 4,
  },
  retakeFullBtnText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
})
