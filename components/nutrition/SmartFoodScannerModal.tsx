import React, { useState, useEffect } from 'react'
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
import { useSafeAreaInsets } from 'react-native-safe-area-context'
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
  ShoppingBag,
  ListPlus,
  Database,
} from 'lucide-react-native'
import { foodScannerService, FoodProduct } from '@/lib/services/foodScannerService'
import { aiService } from '@/lib/services/ai'
import { FoodPlateItem, NutritionalLabelResult } from '@/lib/services/ai/types'
import { checkPhotoScanQuota, recordPhotoScanUsage } from '@/lib/services/ai/rateLimiter'
import { MealType, FoodItemParsed } from '@/types'

export type ScannerMode = 'plate' | 'label' | 'barcode' | 'natural'

interface SmartFoodScannerModalProps {
  visible: boolean
  onClose: () => void
  mealType: MealType
  onSaveToMeal: (foods: FoodItemParsed[], rawInput: string) => Promise<void>
  initialMode?: ScannerMode
}

const MEAL_NAMES: Record<string, string> = {
  breakfast: 'Desayuno',
  lunch: 'Almuerzo',
  dinner: 'Cena',
  snack: 'Snack',
}

export default function SmartFoodScannerModal({
  visible,
  onClose,
  mealType,
  onSaveToMeal,
  initialMode = 'plate',
}: SmartFoodScannerModalProps) {
  const insets = useSafeAreaInsets()
  const [activeMode, setActiveMode] = useState<ScannerMode>(initialMode)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const mealName = MEAL_NAMES[mealType] || 'Comida'

  useEffect(() => {
    if (visible) {
      if (initialMode) setActiveMode(initialMode)
      foodScannerService.clearCorruptedCache().catch(() => {})
    }
  }, [visible, initialMode])

  // Clear toast after 3.5s
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 3500)
      return () => clearTimeout(timer)
    }
  }, [toastMessage])

  // State: Foto seleccionada
  const [imageUri, setImageUri] = useState<string | null>(null)
  const [imageMetrics, setImageMetrics] = useState<{ costUsd: number; latencyMs: number; source: string } | null>(null)

  // State: Bandeja de Alimentos / Plato Compuesto
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
    setToastMessage(null)
    setActiveMode('plate')
  }

  const handleClose = () => {
    resetScannerState()
    onClose()
  }

  // =========================================================================
  // 1. Selector de Cámara o Galería (Plato o Etiqueta)
  // Con comprobación previa de cuota diaria y anti-spam
  // =========================================================================
  const pickImage = async (useCamera: boolean) => {
    if (loading) return

    // 1. Verificar cuota diaria de fotos IA
    const quota = await checkPhotoScanQuota()
    if (!quota.allowed) {
      Alert.alert(
        'Límite diario alcanzado (5/5)',
        `Has alcanzado el límite de 5 escaneos por foto de hoy (se reinicia en ${quota.resetHours}h).\n\nPuedes seguir escaneando productos de forma ILIMITADA y gratuita con el lector de código de barras o buscándolos por nombre.`,
        [
          { text: 'Entendido' },
          { text: 'Escanear Código', onPress: () => setActiveMode('barcode') },
        ]
      )
      return
    }

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
        const mime = asset.mimeType || (uri?.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg')
        const base64Data = asset.base64 ? `data:${mime};base64,${asset.base64}` : uri
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
        setPlateMealName(res.mealName || plateMealName || `${mealName} Compuesto`)
        // Acumula en el plato
        setPlateItems((prev) => [...prev, ...res.items])
        setImageMetrics({
          costUsd: res.costUsd,
          latencyMs: res.latencyMs,
          source: res.costUsd === 0 ? 'Caché Perceptual Instantáneo ($0.00)' : 'Claude Haiku 4.5 Vision',
        })
        if (res.costUsd > 0) {
          await recordPhotoScanUsage()
        }
        setToastMessage(`✓ Se añadieron ${res.items.length} alimentos al ${mealName}`)
      } else if (activeMode === 'label') {
        setStatusMessage('🔍 Leyendo tabla nutricional y auditando ingredientes...')
        const res = await foodScannerService.scanLabelWithAi(base64OrUri)
        setScannedProduct(res.product)
        setLabelAudit(res.aiResult)
        setSelectedPortionG(String(res.product.servingSizeG || 100))
        setImageMetrics({
          costUsd: res.costUsd,
          latencyMs: res.latencyMs,
          source: res.costUsd === 0 ? 'Caché Perceptual / Base de Datos ($0.00)' : 'Claude Haiku 4.5 Vision',
        })
        if (res.costUsd > 0) {
          await recordPhotoScanUsage()
        }
      }
    } catch (err: any) {
      Alert.alert('Error de Escaneo', err.message || 'No se pudo procesar la imagen.')
    } finally {
      setLoading(false)
      setStatusMessage('')
    }
  }

  // =========================================================================
  // 3. Capturar Código de Barras por Cámara o Galería
  // =========================================================================
  const pickImageForBarcode = async (useCamera: boolean) => {
    try {
      let result: ImagePicker.ImagePickerResult
      if (useCamera) {
        if (Platform.OS !== 'web') {
          const { status } = await ImagePicker.requestCameraPermissionsAsync()
          if (status !== 'granted') {
            Alert.alert('Permiso necesario', 'Se necesita acceso a la cámara para escanear códigos.')
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
        const mime = asset.mimeType || (asset.uri?.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg')
        const base64Data = asset.base64 ? `data:${mime};base64,${asset.base64}` : asset.uri
        setLoading(true)
        setStatusMessage('⚡ Leyendo código de barras...')
        const detectedCode = await foodScannerService.extractBarcodeFromImage(base64Data)
        if (detectedCode) {
          setBarcodeInput(detectedCode)
          await handleBarcodeLookup(detectedCode)
        } else {
          Alert.alert(
            'Código no detectado',
            'No se pudo leer el código de barras en la imagen. Puedes introducir los números manualmente o escanear la tabla nutricional.',
            [
              { text: 'Escribir manual' },
              { text: 'Escanear Tabla', onPress: () => setActiveMode('label') },
            ]
          )
        }
      }
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'No se pudo abrir la cámara.')
    } finally {
      setLoading(false)
      setStatusMessage('')
    }
  }

  // =========================================================================
  // 4. Buscar Código de Barras
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
  // 5. Parser de Lenguaje Natural (Texto / Voz)
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
        unitOrPortion: it.unitOrPortion || null,
        estimatedGrams: it.grams,
        calories: it.calories,
        protein: it.protein,
        carbs: it.carbs,
        fat: it.fat,
        confidence: 0.95,
      }))
      setPlateItems((prev) => [...prev, ...convertedItems])
      setNaturalText('')
      setActiveMode('plate')
      setImageMetrics({
        costUsd: metrics.estimatedCostUsd,
        latencyMs: metrics.latencyMs,
        source: 'Claude 3.5 Haiku (~300ms)',
      })
      setToastMessage(`✓ ${convertedItems.length} alimentos añadidos`)
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Error al analizar el texto.')
    } finally {
      setLoading(false)
      setStatusMessage('')
    }
  }

  // =========================================================================
  // 6. Añadir Producto de Código de Barras a la Bandeja
  // =========================================================================
  const addBarcodeProductToPlate = (goToPlateSummary = false) => {
    if (!barcodeProduct) return
    const portion = Math.max(1, parseFloat(barcodePortionG) || 100)
    const ratio = portion / 100
    const displayName = `${barcodeProduct.name}${barcodeProduct.brand ? ` (${barcodeProduct.brand})` : ''}`

    const newItem: FoodPlateItem = {
      name: displayName,
      unitOrPortion: `${portion}g`,
      estimatedGrams: portion,
      calories: Math.round(barcodeProduct.calories * ratio),
      protein: Number((barcodeProduct.protein * ratio).toFixed(1)),
      carbs: Number((barcodeProduct.carbs * ratio).toFixed(1)),
      fat: Number((barcodeProduct.fat * ratio).toFixed(1)),
      confidence: 1.0,
    }

    setPlateItems((prev) => [...prev, newItem])
    setBarcodeProduct(null)
    setBarcodeInput('')

    if (goToPlateSummary) {
      setActiveMode('plate')
    } else {
      setToastMessage(`✓ Añadido: ${barcodeProduct.name} (${portion}g)`)
    }
  }

  // =========================================================================
  // 7. Añadir Producto de Etiqueta a la Bandeja
  // =========================================================================
  const addLabelProductToPlate = (goToPlateSummary = false) => {
    if (!scannedProduct) return
    const portion = Math.max(1, parseFloat(selectedPortionG) || 100)
    const ratio = portion / 100
    const displayName = `${scannedProduct.name}${scannedProduct.brand ? ` (${scannedProduct.brand})` : ''}`

    const newItem: FoodPlateItem = {
      name: displayName,
      unitOrPortion: `${portion}g`,
      estimatedGrams: portion,
      calories: Math.round(scannedProduct.calories * ratio),
      protein: Number((scannedProduct.protein * ratio).toFixed(1)),
      carbs: Number((scannedProduct.carbs * ratio).toFixed(1)),
      fat: Number((scannedProduct.fat * ratio).toFixed(1)),
      confidence: 1.0,
    }

    setPlateItems((prev) => [...prev, newItem])
    setScannedProduct(null)
    setLabelAudit(null)

    if (goToPlateSummary) {
      setActiveMode('plate')
    } else {
      setToastMessage(`✓ Añadido: ${scannedProduct.name} (${portion}g)`)
    }
  }

  // =========================================================================
  // 7.5. Verificación Colaborativa de Producto
  // =========================================================================
  const handleVerifyProduct = async (product: FoodProduct | null, isBarcode: boolean) => {
    if (!product || !product.id) return
    try {
      const ok = await foodScannerService.verifyFoodProduct(product.id)
      if (ok) {
        const updated: FoodProduct = {
          ...product,
          isVerified: true,
          verifiedCount: (product.verifiedCount || 0) + 1,
        }
        if (isBarcode) {
          setBarcodeProduct(updated)
        } else {
          setScannedProduct(updated)
        }
        setToastMessage('✓ ¡Gracias! Producto marcado como verificado')
      }
    } catch {
      setToastMessage('No se pudo verificar el producto')
    }
  }

  // =========================================================================
  // 8. Ajustar Gramos en Ítems de Plato
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
  // 9. Guardar en el Diario Nutricional
  // =========================================================================
  const handleConfirmSave = async () => {
    setSaving(true)
    try {
      let finalFoods: FoodItemParsed[] = []
      let mealTitle = ''

      // 1. Si hay alimentos en la bandeja de plato
      if (plateItems.length > 0) {
        finalFoods = plateItems.map((it) => ({
          name: it.name,
          unit_or_portion: it.unitOrPortion || null,
          quantity_g: it.estimatedGrams,
          calories: it.calories,
          protein_g: it.protein,
          carbs_g: it.carbs,
          fat_g: it.fat,
          confidence: it.confidence > 0.8 ? 'high' : 'medium',
        }))

        // Si el usuario tenía además un producto de código de barras abierto sin añadir
        if (activeMode === 'barcode' && barcodeProduct) {
          const portion = Math.max(1, parseFloat(barcodePortionG) || 100)
          const ratio = portion / 100
          finalFoods.push({
            name: `${barcodeProduct.name}${barcodeProduct.brand ? ` (${barcodeProduct.brand})` : ''}`,
            brand: barcodeProduct.brand || null,
            quantity_g: portion,
            calories: Math.round(barcodeProduct.calories * ratio),
            protein_g: Number((barcodeProduct.protein * ratio).toFixed(1)),
            carbs_g: Number((barcodeProduct.carbs * ratio).toFixed(1)),
            fat_g: Number((barcodeProduct.fat * ratio).toFixed(1)),
            sugars_g: typeof barcodeProduct.sugars === 'number' ? Number((barcodeProduct.sugars * ratio).toFixed(1)) : undefined,
            saturated_fat_g: typeof barcodeProduct.saturatedFat === 'number' ? Number((barcodeProduct.saturatedFat * ratio).toFixed(1)) : undefined,
            salt_g: typeof barcodeProduct.saltG === 'number' ? Number((barcodeProduct.saltG * ratio).toFixed(2)) : undefined,
            sodium_mg: typeof barcodeProduct.sodiumMg === 'number' ? Math.round(barcodeProduct.sodiumMg * ratio) : undefined,
            fiber_g: typeof barcodeProduct.fiber === 'number' ? Number((barcodeProduct.fiber * ratio).toFixed(1)) : undefined,
            micronutrients: barcodeProduct.micronutrients,
            ultraProcessedScore: barcodeProduct.ultraProcessedScore,
            confidence: 'high',
          })
        }
        // Si el usuario tenía además una etiqueta abierta sin añadir
        else if (activeMode === 'label' && scannedProduct) {
          const portion = Math.max(1, parseFloat(selectedPortionG) || 100)
          const ratio = portion / 100
          finalFoods.push({
            name: `${scannedProduct.name}${scannedProduct.brand ? ` (${scannedProduct.brand})` : ''}`,
            brand: scannedProduct.brand || null,
            quantity_g: portion,
            calories: Math.round(scannedProduct.calories * ratio),
            protein_g: Number((scannedProduct.protein * ratio).toFixed(1)),
            carbs_g: Number((scannedProduct.carbs * ratio).toFixed(1)),
            fat_g: Number((scannedProduct.fat * ratio).toFixed(1)),
            sugars_g: typeof scannedProduct.sugars === 'number' ? Number((scannedProduct.sugars * ratio).toFixed(1)) : undefined,
            saturated_fat_g: typeof scannedProduct.saturatedFat === 'number' ? Number((scannedProduct.saturatedFat * ratio).toFixed(1)) : undefined,
            salt_g: typeof scannedProduct.saltG === 'number' ? Number((scannedProduct.saltG * ratio).toFixed(2)) : undefined,
            sodium_mg: typeof scannedProduct.sodiumMg === 'number' ? Math.round(scannedProduct.sodiumMg * ratio) : undefined,
            fiber_g: typeof scannedProduct.fiber === 'number' ? Number((scannedProduct.fiber * ratio).toFixed(1)) : undefined,
            micronutrients: scannedProduct.micronutrients,
            ultraProcessedScore: scannedProduct.ultraProcessedScore,
            confidence: 'high',
          })
        }

        mealTitle = plateMealName || `${mealName} (${finalFoods.length} alimentos)`
      } else if (activeMode === 'barcode' && barcodeProduct) {
        // Guardado directo de 1 solo código de barras
        const portion = Math.max(1, parseFloat(barcodePortionG) || 100)
        const ratio = portion / 100
        finalFoods = [
          {
            name: `${barcodeProduct.name}${barcodeProduct.brand ? ` (${barcodeProduct.brand})` : ''}`,
            brand: barcodeProduct.brand || null,
            quantity_g: portion,
            calories: Math.round(barcodeProduct.calories * ratio),
            protein_g: Number((barcodeProduct.protein * ratio).toFixed(1)),
            carbs_g: Number((barcodeProduct.carbs * ratio).toFixed(1)),
            fat_g: Number((barcodeProduct.fat * ratio).toFixed(1)),
            sugars_g: typeof barcodeProduct.sugars === 'number' ? Number((barcodeProduct.sugars * ratio).toFixed(1)) : undefined,
            saturated_fat_g: typeof barcodeProduct.saturatedFat === 'number' ? Number((barcodeProduct.saturatedFat * ratio).toFixed(1)) : undefined,
            salt_g: typeof barcodeProduct.saltG === 'number' ? Number((barcodeProduct.saltG * ratio).toFixed(2)) : undefined,
            sodium_mg: typeof barcodeProduct.sodiumMg === 'number' ? Math.round(barcodeProduct.sodiumMg * ratio) : undefined,
            fiber_g: typeof barcodeProduct.fiber === 'number' ? Number((barcodeProduct.fiber * ratio).toFixed(1)) : undefined,
            micronutrients: barcodeProduct.micronutrients,
            ultraProcessedScore: barcodeProduct.ultraProcessedScore,
            confidence: 'high',
          },
        ]
        mealTitle = barcodeProduct.name
      } else if (activeMode === 'label' && scannedProduct) {
        // Guardado directo de 1 sola etiqueta
        const portion = Math.max(1, parseFloat(selectedPortionG) || 100)
        const ratio = portion / 100
        finalFoods = [
          {
            name: `${scannedProduct.name}${scannedProduct.brand ? ` (${scannedProduct.brand})` : ''}`,
            brand: scannedProduct.brand || null,
            quantity_g: portion,
            calories: Math.round(scannedProduct.calories * ratio),
            protein_g: Number((scannedProduct.protein * ratio).toFixed(1)),
            carbs_g: Number((scannedProduct.carbs * ratio).toFixed(1)),
            fat_g: Number((scannedProduct.fat * ratio).toFixed(1)),
            sugars_g: typeof scannedProduct.sugars === 'number' ? Number((scannedProduct.sugars * ratio).toFixed(1)) : undefined,
            saturated_fat_g: typeof scannedProduct.saturatedFat === 'number' ? Number((scannedProduct.saturatedFat * ratio).toFixed(1)) : undefined,
            salt_g: typeof scannedProduct.saltG === 'number' ? Number((scannedProduct.saltG * ratio).toFixed(2)) : undefined,
            sodium_mg: typeof scannedProduct.sodiumMg === 'number' ? Math.round(scannedProduct.sodiumMg * ratio) : undefined,
            fiber_g: typeof scannedProduct.fiber === 'number' ? Number((scannedProduct.fiber * ratio).toFixed(1)) : undefined,
            micronutrients: scannedProduct.micronutrients,
            ultraProcessedScore: scannedProduct.ultraProcessedScore,
            confidence: 'high',
          },
        ]
        mealTitle = scannedProduct.name
      }


      if (finalFoods.length === 0) {
        Alert.alert('Bandeja vacía', 'Escanea o añade al menos un alimento antes de guardar.')
        return
      }

      await onSaveToMeal(finalFoods, mealTitle)
      handleClose()
    } catch (err: any) {
      Alert.alert('Error al guardar', err.message || 'No se pudo registrar la comida.')
    } finally {
      setSaving(false)
    }
  }

  // Totales calculados de la bandeja / plato compuesto
  const totalPlateCals = plateItems.reduce((s, it) => s + it.calories, 0)
  const totalPlateP = Number(plateItems.reduce((s, it) => s + it.protein, 0).toFixed(1))
  const totalPlateC = Number(plateItems.reduce((s, it) => s + it.carbs, 0).toFixed(1))
  const totalPlateF = Number(plateItems.reduce((s, it) => s + it.fat, 0).toFixed(1))

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={handleClose}>
      <View style={[styles.container, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 16 }]}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <View style={styles.badgeRow}>
              <Sparkles size={13} color="#A1A1AA" />
              <Text style={styles.badgeText}>ESCÁNER DE IA & VISIÓN</Text>
            </View>
            <Text style={styles.headerTitle}>Registrar en {mealName.toUpperCase()}</Text>
          </View>
          <TouchableOpacity style={styles.closeBtn} onPress={handleClose} activeOpacity={0.7}>
            <X size={18} color="#FAFAFA" />
          </TouchableOpacity>
        </View>

        {/* Notificación Toast Flotante */}
        {toastMessage && (
          <View style={styles.toastContainer}>
            <Text style={styles.toastText}>{toastMessage}</Text>
          </View>
        )}

        {/* Barra superior de Alimentos Acumulados (si estamos en otro modo y ya hay alimentos en el plato) */}
        {plateItems.length > 0 && activeMode !== 'plate' && (
          <TouchableOpacity
            style={styles.traySummaryBanner}
            onPress={() => setActiveMode('plate')}
            activeOpacity={0.85}
          >
            <View style={styles.trayBannerLeft}>
              <ShoppingBag size={16} color="#FAFAFA" />
              <Text style={styles.trayBannerTitle}>
                {plateItems.length} {plateItems.length === 1 ? 'alimento añadido' : 'alimentos añadidos'}
              </Text>
              <Text style={styles.trayBannerCals}>({totalPlateCals} kcal)</Text>
            </View>
            <View style={styles.trayBannerRight}>
              <Text style={styles.trayBannerAction}>Ver Bandeja</Text>
              <ChevronRight size={14} color="#FAFAFA" />
            </View>
          </TouchableOpacity>
        )}

        {/* Selector de Modo de Escaneo */}
        <View style={styles.modeTabs}>
          <TouchableOpacity
            style={[styles.tabBtn, activeMode === 'plate' && styles.tabBtnActive]}
            onPress={() => setActiveMode('plate')}
            activeOpacity={0.8}
          >
            <Utensils size={15} color={activeMode === 'plate' ? '#09090B' : '#A1A1AA'} />
            <Text style={[styles.tabText, activeMode === 'plate' && styles.tabTextActive]}>
              Plato
            </Text>
            {plateItems.length > 0 && (
              <View style={[styles.tabBadge, activeMode === 'plate' && styles.tabBadgeActive]}>
                <Text style={[styles.tabBadgeText, activeMode === 'plate' && styles.tabBadgeTextActive]}>
                  {plateItems.length}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeMode === 'barcode' && styles.tabBtnActive]}
            onPress={() => setActiveMode('barcode')}
            activeOpacity={0.8}
          >
            <Barcode size={15} color={activeMode === 'barcode' ? '#09090B' : '#A1A1AA'} />
            <Text style={[styles.tabText, activeMode === 'barcode' && styles.tabTextActive]}>
              Código
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeMode === 'label' && styles.tabBtnActive]}
            onPress={() => setActiveMode('label')}
            activeOpacity={0.8}
          >
            <FileText size={15} color={activeMode === 'label' ? '#09090B' : '#A1A1AA'} />
            <Text style={[styles.tabText, activeMode === 'label' && styles.tabTextActive]}>
              Etiqueta
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeMode === 'natural' && styles.tabBtnActive]}
            onPress={() => setActiveMode('natural')}
            activeOpacity={0.8}
          >
            <Mic size={15} color={activeMode === 'natural' ? '#09090B' : '#A1A1AA'} />
            <Text style={[styles.tabText, activeMode === 'natural' && styles.tabTextActive]}>
              Voz/Texto
            </Text>
          </TouchableOpacity>
        </View>

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
              {/* MODO 1: PLATO DE COMIDA / BANDEJA COMPUESTA */}
              {/* ================================================= */}
              {activeMode === 'plate' && (
                <View>
                  {plateItems.length === 0 ? (
                    <View style={styles.captureCard}>
                      <Utensils size={40} color="#FAFAFA" style={{ marginBottom: 12 }} />
                      <Text style={styles.captureTitle}>Escanear Plato con IA</Text>
                      <Text style={styles.captureSub}>
                        Toma una foto o sube una imagen de tu plato. Nuestra IA detectará cada alimento, sus cantidades estimadas y calculará los macros.
                      </Text>

                      <View style={styles.actionButtonsRow}>
                        <TouchableOpacity
                          style={styles.primaryActionBtn}
                          onPress={() => pickImage(true)}
                          activeOpacity={0.88}
                        >
                          <Camera size={18} color="#09090B" />
                          <Text style={styles.primaryActionBtnText}>Escanear con Cámara</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.secondaryActionBtn}
                          onPress={() => pickImage(false)}
                          activeOpacity={0.85}
                        >
                          <GalleryIcon size={18} color="#FAFAFA" />
                          <Text style={styles.secondaryActionBtnText}>Foto Galería</Text>
                        </TouchableOpacity>
                      </View>

                      {/* Atajos a Código de Barras o Dictado */}
                      <View style={styles.shortcutsBox}>
                        <Text style={styles.shortcutsTitle}>O añade ingredientes uno a uno:</Text>
                        <View style={styles.shortcutsRow}>
                          <TouchableOpacity
                            style={styles.shortcutBtn}
                            onPress={() => setActiveMode('barcode')}
                            activeOpacity={0.8}
                          >
                            <Barcode size={15} color="#FAFAFA" />
                            <Text style={styles.shortcutBtnText}>Escanear Código</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.shortcutBtn}
                            onPress={() => setActiveMode('natural')}
                            activeOpacity={0.8}
                          >
                            <Mic size={15} color="#FAFAFA" />
                            <Text style={styles.shortcutBtnText}>Escribir / Dictar</Text>
                          </TouchableOpacity>
                        </View>
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
                          <Text style={styles.plateTitle}>{plateMealName || `${mealName} Compuesto`}</Text>
                          <Text style={styles.plateSubtitle}>
                            {plateItems.length} {plateItems.length === 1 ? 'alimento registrado' : 'alimentos registrados'} (Toca +/- para gramos)
                          </Text>
                        </View>
                        <TouchableOpacity
                          style={styles.retakeBtn}
                          onPress={() => {
                            Alert.alert(
                              'Limpiar bandeja',
                              '¿Deseas vaciar todos los alimentos añadidos a este plato?',
                              [
                                { text: 'Cancelar', style: 'cancel' },
                                {
                                  text: 'Vaciar',
                                  style: 'destructive',
                                  onPress: () => {
                                    setPlateItems([])
                                    setImageUri(null)
                                  },
                                },
                              ]
                            )
                          }}
                        >
                          <Trash2 size={13} color="#EF4444" />
                          <Text style={[styles.retakeBtnText, { color: '#EF4444' }]}>Vaciar</Text>
                        </TouchableOpacity>
                      </View>

                      {/* Botón "+ Añadir otro alimento" */}
                      <View style={styles.addMoreRow}>
                        <Text style={styles.addMorePrompt}>¿Comiste algo más en este {mealName}?</Text>
                        <View style={styles.addMoreButtons}>
                          <TouchableOpacity
                            style={styles.addMoreBtn}
                            onPress={() => setActiveMode('barcode')}
                          >
                            <Barcode size={14} color="#38BDF8" />
                            <Text style={styles.addMoreBtnText}>+ Código</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.addMoreBtn}
                            onPress={() => setActiveMode('label')}
                          >
                            <FileText size={14} color="#38BDF8" />
                            <Text style={styles.addMoreBtnText}>+ Etiqueta</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.addMoreBtn}
                            onPress={() => setActiveMode('natural')}
                          >
                            <Mic size={14} color="#38BDF8" />
                            <Text style={styles.addMoreBtnText}>+ Texto</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.addMoreBtn}
                            onPress={() => pickImage(true)}
                          >
                            <Camera size={14} color="#38BDF8" />
                            <Text style={styles.addMoreBtnText}>+ Foto</Text>
                          </TouchableOpacity>
                        </View>
                      </View>

                      {/* Lista de alimentos desglosados */}
                      {plateItems.map((item, idx) => (
                        <View key={idx} style={styles.foodItemCard}>
                          <View style={styles.foodItemTop}>
                            <View style={{ flex: 1, marginRight: 8 }}>
                              <Text style={styles.foodItemName}>{item.name}</Text>
                              {item.unitOrPortion && (
                                <Text style={{ color: '#38BDF8', fontSize: 11, fontWeight: '600', marginTop: 2 }}>
                                  {item.unitOrPortion}
                                </Text>
                              )}
                            </View>
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
                            <Text style={styles.summaryLabel}>TOTAL DEL {mealName.toUpperCase()}</Text>
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
              {/* MODO 2: CÓDIGO DE BARRAS */}
              {/* ================================================= */}
              {activeMode === 'barcode' && (
                <View>
                  <View style={styles.barcodeInputCard}>
                    <Barcode size={42} color="#FAFAFA" style={{ marginBottom: 12 }} />
                    <Text style={styles.barcodeInputTitle}>Escanear Código de Barras</Text>
                    <Text style={styles.barcodeInputSub}>
                      Apunta con la cámara, sube una foto o escribe el número para consultar la base de datos oficial.
                    </Text>

                    {/* Botones de Cámara y Galería para Código de Barras */}
                    <View style={[styles.actionButtonsRow, { marginBottom: 18 }]}>
                      <TouchableOpacity
                        style={styles.primaryActionBtn}
                        onPress={() => pickImageForBarcode(true)}
                        activeOpacity={0.88}
                      >
                        <Camera size={18} color="#09090B" />
                        <Text style={styles.primaryActionBtnText}>Escanear con Cámara</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.secondaryActionBtn}
                        onPress={() => pickImageForBarcode(false)}
                        activeOpacity={0.85}
                      >
                        <GalleryIcon size={18} color="#FAFAFA" />
                        <Text style={styles.secondaryActionBtnText}>Foto Galería</Text>
                      </TouchableOpacity>
                    </View>

                    <Text style={styles.manualInputPrompt}>
                      O introduce los dígitos manualmente:
                    </Text>

                    <View style={styles.barcodeSearchRow}>
                      <TextInput
                        style={styles.barcodeField}
                        placeholder="Ej. 841000000000"
                        placeholderTextColor="#52525B"
                        keyboardType="numeric"
                        value={barcodeInput}
                        onChangeText={setBarcodeInput}
                        onSubmitEditing={() => handleBarcodeLookup()}
                      />
                      <TouchableOpacity
                        style={styles.barcodeSearchBtn}
                        onPress={() => handleBarcodeLookup()}
                        activeOpacity={0.85}
                      >
                        <ChevronRight size={22} color="#09090B" strokeWidth={2.8} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {barcodeProduct && (
                    <View style={styles.productCard}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, flexWrap: 'wrap', gap: 6 }}>
                        <View style={styles.productBadgeDetected}>
                          <Check size={14} color="#10B981" />
                          <Text style={styles.productBadgeDetectedText}>Producto Encontrado</Text>
                        </View>
                        {barcodeProduct.isVerified || (barcodeProduct.verifiedCount && barcodeProduct.verifiedCount > 0) ? (
                          <View style={styles.verifiedCommunityBadge}>
                            <ShieldCheck size={12} color="#10B981" />
                            <Text style={styles.verifiedCommunityBadgeText}>
                              Verificado {barcodeProduct.verifiedCount ? `(${barcodeProduct.verifiedCount})` : ''}
                            </Text>
                          </View>
                        ) : barcodeProduct.dataSource === 'openfoodfacts' ? (
                          <View style={styles.officialDbBadge}>
                            <Database size={12} color="#38BDF8" />
                            <Text style={styles.officialDbBadgeText}>Base Oficial</Text>
                          </View>
                        ) : (
                          <TouchableOpacity
                            style={styles.verifyFoodActionBtn}
                            onPress={() => handleVerifyProduct(barcodeProduct, true)}
                            activeOpacity={0.7}
                          >
                            <ShieldCheck size={12} color="#94A3B8" />
                            <Text style={styles.verifyFoodActionBtnText}>Confirmar precisión</Text>
                          </TouchableOpacity>
                        )}
                      </View>

                      <Text style={styles.productName}>{barcodeProduct.name}</Text>
                      {barcodeProduct.brand && (
                        <Text style={styles.productBrand}>Marca: {barcodeProduct.brand}</Text>
                      )}

                      {/* Selector de Porción */}
                      <View style={styles.portionSelectorRow}>
                        <Text style={styles.portionLabel}>Porción que vas a comer:</Text>
                        <View style={styles.portionInputContainer}>
                          <TextInput
                            style={styles.portionInput}
                            keyboardType="numeric"
                            value={barcodePortionG}
                            onChangeText={setBarcodePortionG}
                          />
                          <Text style={styles.portionUnit}>gramos</Text>
                        </View>
                      </View>

                      {/* Macros calculados para la porción */}
                      {(() => {
                        const portion = parseFloat(barcodePortionG) || 100
                        const ratio = portion / 100
                        return (
                          <View>
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

                            {/* Sub-Macros */}
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                              {typeof barcodeProduct.sugars === 'number' && (
                                <View style={{ backgroundColor: '#1E293B', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
                                  <Text style={{ color: '#94A3B8', fontSize: 11 }}>
                                    Azúcares: <Text style={{ color: '#F8FAFC', fontWeight: '700' }}>{(barcodeProduct.sugars * ratio).toFixed(1)}g</Text>
                                  </Text>
                                </View>
                              )}
                              {typeof barcodeProduct.saturatedFat === 'number' && (
                                <View style={{ backgroundColor: '#1E293B', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
                                  <Text style={{ color: '#94A3B8', fontSize: 11 }}>
                                    Sat: <Text style={{ color: '#F8FAFC', fontWeight: '700' }}>{(barcodeProduct.saturatedFat * ratio).toFixed(1)}g</Text>
                                  </Text>
                                </View>
                              )}
                              {typeof barcodeProduct.saltG === 'number' && barcodeProduct.saltG > 0 && (
                                <View style={{ backgroundColor: '#1E293B', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
                                  <Text style={{ color: '#94A3B8', fontSize: 11 }}>
                                    Sal: <Text style={{ color: '#F8FAFC', fontWeight: '700' }}>{(barcodeProduct.saltG * ratio).toFixed(2)}g</Text>
                                  </Text>
                                </View>
                              )}
                              {barcodeProduct.barcode && (
                                <View style={{ backgroundColor: '#0284C720', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: '#0284C750' }}>
                                  <Text style={{ color: '#38BDF8', fontSize: 11, fontWeight: '600' }}>
                                    EAN: {barcodeProduct.barcode}
                                  </Text>
                                </View>
                              )}
                            </View>
                          </View>
                        )
                      })()}

                      {/* Botones de Acción Multialimento */}
                      <View style={styles.compositeActionsContainer}>
                        {/* 1. Añadir y seguir escaneando */}
                        <TouchableOpacity
                          style={styles.addAndContinueBtn}
                          onPress={() => addBarcodeProductToPlate(false)}
                        >
                          <ListPlus size={18} color="#0F172A" />
                          <Text style={styles.addAndContinueBtnText}>
                            Añadir a {mealName} (+ Escanear otro)
                          </Text>
                        </TouchableOpacity>

                        {/* 2. Añadir e ir al plato */}
                        <TouchableOpacity
                          style={styles.addAndReviewBtn}
                          onPress={() => addBarcodeProductToPlate(true)}
                        >
                          <Utensils size={16} color="#38BDF8" />
                          <Text style={styles.addAndReviewBtnText}>
                            Añadir y ver plato ({plateItems.length + 1} alimentos)
                          </Text>
                        </TouchableOpacity>

                        {/* 3. Guardar solo este alimento */}
                        <TouchableOpacity
                          style={styles.saveSingleBtn}
                          onPress={handleConfirmSave}
                          disabled={saving}
                        >
                          {saving ? (
                            <ActivityIndicator color="#94A3B8" size="small" />
                          ) : (
                            <>
                              <Check size={16} color="#94A3B8" />
                              <Text style={styles.saveSingleBtnText}>
                                Guardar solo este alimento directamente
                              </Text>
                            </>
                          )}
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                </View>
              )}

              {/* ================================================= */}
              {/* MODO 3: TABLA NUTRICIONAL / ETIQUETA */}
              {/* ================================================= */}
              {activeMode === 'label' && (
                <View>
                  {!scannedProduct ? (
                    <View style={styles.captureCard}>
                      <FileText size={40} color="#FAFAFA" style={{ marginBottom: 12 }} />
                      <Text style={styles.captureTitle}>Escanear Tabla Nutricional</Text>
                      <Text style={styles.captureSub}>
                        Enfoca la tabla de información nutricional del envase para auditar ingredientes y extraer los macros exactos.
                      </Text>

                      <View style={styles.actionButtonsRow}>
                        <TouchableOpacity
                          style={styles.primaryActionBtn}
                          onPress={() => pickImage(true)}
                          activeOpacity={0.88}
                        >
                          <Camera size={18} color="#09090B" />
                          <Text style={styles.primaryActionBtnText}>Escanear con Cámara</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.secondaryActionBtn}
                          onPress={() => pickImage(false)}
                          activeOpacity={0.85}
                        >
                          <GalleryIcon size={18} color="#FAFAFA" />
                          <Text style={styles.secondaryActionBtnText}>Foto Galería</Text>
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
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginTop: 5 }}>
                              {scannedProduct.isVerified || (scannedProduct.verifiedCount && scannedProduct.verifiedCount > 0) ? (
                                <View style={styles.verifiedCommunityBadge}>
                                  <ShieldCheck size={11} color="#10B981" />
                                  <Text style={styles.verifiedCommunityBadgeText}>
                                    Verificado {scannedProduct.verifiedCount ? `(${scannedProduct.verifiedCount})` : ''}
                                  </Text>
                                </View>
                              ) : null}
                            </View>
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

                        {/* Selector de Porción en Gramos */}
                        <View style={styles.portionSelectorRow}>
                          <Text style={styles.portionLabel}>Cantidad que vas a comer:</Text>
                          <View style={styles.portionInputContainer}>
                            <TextInput
                              style={styles.portionInput}
                              value={selectedPortionG}
                              onChangeText={setSelectedPortionG}
                              keyboardType="numeric"
                              selectTextOnFocus
                            />
                            <Text style={styles.portionUnit}>g</Text>
                          </View>
                        </View>

                        {/* Resumen de Macros */}
                        {(() => {
                          const pG = Number(selectedPortionG) || 100
                          const r = pG / 100
                          return (
                            <View style={styles.macrosGrid}>
                              <View style={styles.macroCell}>
                                <Text style={styles.macroCellVal}>
                                  {Math.round(scannedProduct.calories * r)}
                                </Text>
                                <Text style={styles.macroCellLabel}>kcal</Text>
                              </View>
                              <View style={styles.macroCell}>
                                <Text style={styles.macroCellVal}>
                                  {(scannedProduct.protein * r).toFixed(1)}g
                                </Text>
                                <Text style={styles.macroCellLabel}>Proteína</Text>
                              </View>
                              <View style={styles.macroCell}>
                                <Text style={styles.macroCellVal}>
                                  {(scannedProduct.carbs * r).toFixed(1)}g
                                </Text>
                                <Text style={styles.macroCellLabel}>Carbos</Text>
                              </View>
                              <View style={styles.macroCell}>
                                <Text style={styles.macroCellVal}>
                                  {(scannedProduct.fat * r).toFixed(1)}g
                                </Text>
                                <Text style={styles.macroCellLabel}>Grasas</Text>
                              </View>
                            </View>
                          )
                        })()}

                        {/* Botones de Acción */}
                        <View style={styles.compositeActionsContainer}>
                          <TouchableOpacity
                            style={styles.addAndContinueBtn}
                            onPress={() => addLabelProductToPlate(false)}
                            activeOpacity={0.88}
                          >
                            <ListPlus size={18} color="#09090B" />
                            <Text style={styles.addAndContinueBtnText}>
                              + Añadir al Plato y Seguir
                            </Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={styles.saveSingleBtn}
                            onPress={handleConfirmSave}
                            disabled={saving}
                            activeOpacity={0.85}
                          >
                            {saving ? (
                              <ActivityIndicator color="#A1A1AA" size="small" />
                            ) : (
                              <>
                                <Check size={16} color="#A1A1AA" />
                                <Text style={styles.saveSingleBtnText}>
                                  Guardar solo este alimento directamente
                                </Text>
                              </>
                            )}
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  )}
                </View>
              )}

              {/* ================================================= */}
              {/* MODO 4: VOZ / TEXTO NATURAL */}
              {/* ================================================= */}
              {activeMode === 'natural' && (
                <View style={styles.naturalCard}>
                  <Mic size={36} color="#FAFAFA" style={{ marginBottom: 12 }} />
                  <Text style={styles.naturalTitle}>Voz o Descripción IA</Text>
                  <Text style={styles.naturalSub}>
                    Escribe o dicta en lenguaje natural todo lo que comiste. La IA desglosará automáticamente los ingredientes y macros.
                  </Text>

                  <TextInput
                    style={styles.naturalTextArea}
                    placeholder="Ej. 150g de pechuga a la plancha, 200g de arroz basmati y 10g de aceite de oliva"
                    placeholderTextColor="#52525B"
                    multiline
                    numberOfLines={4}
                    value={naturalText}
                    onChangeText={setNaturalText}
                  />

                  <TouchableOpacity
                    style={styles.primaryActionBtn}
                    onPress={handleNaturalParse}
                    activeOpacity={0.88}
                  >
                    <Sparkles size={18} color="#09090B" />
                    <Text style={styles.primaryActionBtnText}>Desglosar y Añadir con IA</Text>
                  </TouchableOpacity>
                </View>
              )}
            </>
          )}
        </ScrollView>

        {/* Footer con Botón de Confirmación Principal */}
        {plateItems.length > 0 && activeMode === 'plate' && (
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
                    Guardar {mealName} ({plateItems.length} {plateItems.length === 1 ? 'alimento' : 'alimentos'} · {totalPlateCals} kcal)
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
    backgroundColor: '#09090B',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#18181B',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  badgeText: {
    color: '#A1A1AA',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  headerTitle: {
    color: '#FAFAFA',
    fontSize: 22,
    fontWeight: '900',
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
  toastContainer: {
    backgroundColor: '#18181B',
    borderWidth: 1,
    borderColor: '#27272A',
    paddingVertical: 9,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toastText: {
    color: '#FAFAFA',
    fontSize: 12,
    fontWeight: '700',
  },
  traySummaryBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#18181B',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#27272A',
  },
  trayBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  trayBannerTitle: {
    color: '#FAFAFA',
    fontSize: 13,
    fontWeight: '700',
  },
  trayBannerCals: {
    color: '#38BDF8',
    fontSize: 13,
    fontWeight: '800',
  },
  trayBannerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  trayBannerAction: {
    color: '#FAFAFA',
    fontSize: 12,
    fontWeight: '700',
  },
  modeTabs: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    padding: 4,
    borderRadius: 16,
    backgroundColor: '#18181B',
    borderWidth: 1,
    borderColor: '#27272A',
    gap: 4,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: 'transparent',
    position: 'relative',
  },
  tabBtnActive: {
    backgroundColor: '#FAFAFA',
  },
  tabText: {
    color: '#A1A1AA',
    fontSize: 12,
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#09090B',
    fontWeight: '800',
  },
  tabBadge: {
    backgroundColor: '#27272A',
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 1,
    marginLeft: -2,
  },
  tabBadgeActive: {
    backgroundColor: '#09090B',
  },
  tabBadgeText: {
    color: '#FAFAFA',
    fontSize: 10,
    fontWeight: '800',
  },
  tabBadgeTextActive: {
    color: '#FAFAFA',
  },
  scrollContent: {
    flex: 1,
  },
  scrollInner: {
    padding: 16,
  },
  loadingContainer: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  loadingTitle: {
    color: '#FAFAFA',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 16,
    textAlign: 'center',
  },
  loadingSub: {
    color: '#A1A1AA',
    fontSize: 13,
    marginTop: 6,
    textAlign: 'center',
  },
  captureCard: {
    backgroundColor: '#18181B',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#27272A',
  },
  captureTitle: {
    color: '#FAFAFA',
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  captureSub: {
    color: '#A1A1AA',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 20,
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
    backgroundColor: '#FAFAFA',
    paddingVertical: 14,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  primaryActionBtnText: {
    color: '#09090B',
    fontSize: 13.5,
    fontWeight: '800',
  },
  secondaryActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#1E1E22',
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2E2E34',
  },
  secondaryActionBtnText: {
    color: '#FAFAFA',
    fontSize: 13.5,
    fontWeight: '700',
  },
  shortcutsBox: {
    marginTop: 22,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#27272A',
    width: '100%',
    alignItems: 'center',
  },
  shortcutsTitle: {
    color: '#A1A1AA',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 10,
  },
  shortcutsRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  shortcutBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#1E1E22',
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2E2E34',
  },
  shortcutBtnText: {
    color: '#FAFAFA',
    fontSize: 12,
    fontWeight: '600',
  },
  previewImage: {
    width: '100%',
    height: 180,
    borderRadius: 16,
    marginBottom: 16,
  },
  resultHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  plateTitle: {
    color: '#FAFAFA',
    fontSize: 17,
    fontWeight: '700',
  },
  plateSubtitle: {
    color: '#A1A1AA',
    fontSize: 12,
    marginTop: 2,
  },
  retakeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
  },
  retakeBtnText: {
    color: '#F87171',
    fontSize: 11.5,
    fontWeight: '700',
  },
  addMoreRow: {
    backgroundColor: '#18181B',
    borderRadius: 16,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#27272A',
  },
  addMorePrompt: {
    color: '#A1A1AA',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  addMoreButtons: {
    flexDirection: 'row',
    gap: 6,
  },
  addMoreBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#1E1E22',
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2E2E34',
  },
  addMoreBtnText: {
    color: '#FAFAFA',
    fontSize: 11.5,
    fontWeight: '700',
  },
  foodItemCard: {
    backgroundColor: '#18181B',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#27272A',
  },
  foodItemTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  foodItemName: {
    color: '#FAFAFA',
    fontSize: 14.5,
    fontWeight: '700',
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
    backgroundColor: '#27272A',
    borderRadius: 20,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  stepBtn: {
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  gramsText: {
    color: '#FAFAFA',
    fontSize: 12.5,
    fontWeight: '800',
    minWidth: 42,
    textAlign: 'center',
  },
  itemMacrosRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  itemCalText: {
    color: '#38BDF8',
    fontSize: 13,
    fontWeight: '700',
  },
  itemPText: {
    color: '#A1A1AA',
    fontSize: 11,
    fontWeight: '600',
  },
  itemCText: {
    color: '#A1A1AA',
    fontSize: 11,
    fontWeight: '600',
  },
  itemFText: {
    color: '#A1A1AA',
    fontSize: 11,
    fontWeight: '600',
  },
  plateSummaryCard: {
    backgroundColor: '#18181B',
    borderRadius: 18,
    padding: 16,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#27272A',
  },
  summaryTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  summaryLabel: {
    color: '#A1A1AA',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  summaryCalories: {
    color: '#FAFAFA',
    fontSize: 24,
    fontWeight: '900',
    marginTop: 2,
  },
  summaryMacrosRow: {
    flexDirection: 'row',
    gap: 8,
  },
  macroPill: {
    flex: 1,
    backgroundColor: '#121214',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  macroPillLabel: {
    color: '#A1A1AA',
    fontSize: 10,
    fontWeight: '600',
  },
  macroPillVal: {
    color: '#FAFAFA',
    fontSize: 14,
    fontWeight: '800',
    marginTop: 2,
  },
  productCard: {
    backgroundColor: '#18181B',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#27272A',
  },
  productBadgeDetected: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  productBadgeDetectedText: {
    color: '#10B981',
    fontSize: 11,
    fontWeight: '700',
  },
  productTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  productName: {
    color: '#FAFAFA',
    fontSize: 16,
    fontWeight: '800',
  },
  productBrand: {
    color: '#A1A1AA',
    fontSize: 12,
    marginTop: 2,
  },
  portionSelectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#27272A',
    marginBottom: 16,
  },
  portionLabel: {
    color: '#A1A1AA',
    fontSize: 13,
    fontWeight: '600',
  },
  portionInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#121214',
    borderRadius: 12,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#27272A',
  },
  portionInput: {
    color: '#FAFAFA',
    fontSize: 14,
    fontWeight: '800',
    paddingVertical: 6,
    minWidth: 40,
    textAlign: 'center',
  },
  portionUnit: {
    color: '#71717A',
    fontSize: 12,
    marginLeft: 2,
  },
  macrosGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  macroCell: {
    flex: 1,
    backgroundColor: '#121214',
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  macroCellVal: {
    color: '#FAFAFA',
    fontSize: 15,
    fontWeight: '800',
  },
  macroCellLabel: {
    color: '#A1A1AA',
    fontSize: 10,
    marginTop: 2,
  },
  compositeActionsContainer: {
    marginTop: 16,
    gap: 10,
  },
  addAndContinueBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FAFAFA',
    paddingVertical: 14,
    borderRadius: 26,
  },
  addAndContinueBtnText: {
    color: '#09090B',
    fontSize: 13.5,
    fontWeight: '900',
  },
  saveSingleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  saveSingleBtnText: {
    color: '#A1A1AA',
    fontSize: 12,
    fontWeight: '600',
  },
  barcodeInputCard: {
    backgroundColor: '#18181B',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#27272A',
  },
  barcodeInputTitle: {
    color: '#FAFAFA',
    fontSize: 18,
    fontWeight: '800',
  },
  barcodeInputSub: {
    color: '#A1A1AA',
    fontSize: 13,
    marginTop: 4,
    marginBottom: 18,
    textAlign: 'center',
    lineHeight: 19,
  },
  manualInputPrompt: {
    color: '#A1A1AA',
    fontSize: 12.5,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  barcodeSearchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: '100%',
  },
  barcodeField: {
    flex: 1,
    backgroundColor: '#121214',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#FAFAFA',
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#27272A',
  },
  barcodeSearchBtn: {
    backgroundColor: '#FAFAFA',
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  naturalCard: {
    backgroundColor: '#18181B',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: '#27272A',
  },
  naturalTitle: {
    color: '#FAFAFA',
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  naturalSub: {
    color: '#A1A1AA',
    fontSize: 13,
    marginTop: 4,
    marginBottom: 16,
    textAlign: 'center',
    lineHeight: 19,
  },
  naturalTextArea: {
    backgroundColor: '#121214',
    borderRadius: 16,
    padding: 14,
    color: '#FAFAFA',
    fontSize: 14,
    minHeight: 100,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: '#27272A',
    marginBottom: 16,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#18181B',
    backgroundColor: '#09090B',
  },
  saveMainBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FAFAFA',
    paddingVertical: 15,
    borderRadius: 26,
  },
  saveMainBtnText: {
    color: '#09090B',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  verifiedCommunityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  verifiedCommunityBadgeText: {
    color: '#10B981',
    fontSize: 11,
    fontWeight: '700',
  },
  officialDbBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.25)',
  },
  officialDbBadgeText: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '700',
  },
  verifyFoodActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  verifyFoodActionBtnText: {
    color: '#A1A1AA',
    fontSize: 11,
    fontWeight: '600',
  },
  addAndReviewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#1E1E22',
    paddingVertical: 12,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: '#2E2E34',
  },
  addAndReviewBtnText: {
    color: '#FAFAFA',
    fontSize: 13,
    fontWeight: '700',
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
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  healthModerate: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
  },
  healthUltra: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  healthScoreText: {
    color: '#FAFAFA',
    fontSize: 11,
    fontWeight: '700',
  },
})
