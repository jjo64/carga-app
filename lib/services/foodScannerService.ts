import { supabase } from '@/lib/supabase'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { aiService } from './ai'
import { FoodPlateItem, NutritionalLabelResult, MicronutrientItem, NaturalMealItem } from './ai/types'
import { callAnthropicApi, extractAndParseJson } from './ai/client'
import { optimizeImageForVision } from './ai/imageOptimizer'
import {
  computeImagePerceptualHash,
  getCachedProductByImageHash,
  saveProductByImageHash,
} from './ai/imageHasher'

import {
  FoodProduct,
  KJ_TO_KCAL,
  validateMacroThermodynamics,
  sanitizeNutritionalLabelValues,
  searchOpenFoodFactsByName,
  enrichNaturalMealWithOpenFoodFacts,
} from './nutritionUtils'

export {
  FoodProduct,
  KJ_TO_KCAL,
  validateMacroThermodynamics,
  sanitizeNutritionalLabelValues,
  searchOpenFoodFactsByName,
  enrichNaturalMealWithOpenFoodFacts,
}

const LOCAL_PRODUCTS_CACHE_KEY = '@carga_cached_food_products'

/**
 * Servicio en Cascada de 3 Niveles para Alimentos y Productos Nutricionales
 */
export const foodScannerService = {
  // =========================================================================
  // Extracción rápida de Código de Barras desde Imagen
  // =========================================================================
  async extractBarcodeFromImage(imageUriOrBase64: string): Promise<string | null> {
    // 1. Detección nativa del navegador / sistema (100% local, $0)
    if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
      try {
        const detector = new (window as any).BarcodeDetector({
          formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'qr_code'],
        })
        const img = new Image()
        img.crossOrigin = 'anonymous'
        const loaded = await new Promise<boolean>((resolve) => {
          img.onload = () => resolve(true)
          img.onerror = () => resolve(false)
          img.src = imageUriOrBase64
        })
        if (loaded) {
          const barcodes = await detector.detect(img)
          if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
            return barcodes[0].rawValue.trim()
          }
        }
      } catch (err) {
        console.warn('[BarcodeDetector] Error en BarcodeDetector nativo:', err)
      }
    }

    // 2. Fallback con Visión Ligera (Claude Haiku - 300ms) para extraer los dígitos del código de barras
    try {
      const optimized = await optimizeImageForVision(imageUriOrBase64, 1024, 1024, 0.7)
      const { text } = await callAnthropicApi({
        modelTier: 'haiku',
        system: [
          {
            type: 'text',
            text: 'Eres un lector OCR de códigos de barras. Analiza la imagen y extrae ÚNICAMENTE la secuencia numérica del código de barras (generalmente 8 a 13 dígitos numéricos) si es visible y legible con certeza. Si no hay código de barras visible o los números son ilegibles, responde {"barcode": null}. Responde ÚNICAMENTE un JSON válido.',
          },
        ],
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: optimized.mediaType,
                  data: optimized.base64,
                },
              },
              {
                type: 'text',
                text: 'Extrae los dígitos numéricos del código de barras. Si no hay, devuelve barcode: null.',
              },
            ],
          },
        ],
        temperature: 0.0,
        maxTokens: 150,
      })

      const parsed = extractAndParseJson<{ barcode: string | null }>(text)
      if (parsed?.barcode) {
        const cleanDigits = parsed.barcode.replace(/\D/g, '')
        if (cleanDigits.length >= 8) {
          return cleanDigits
        }
      }
    } catch (err) {
      console.warn('[BarcodeScanner] Error en lector de código de barras:', err)
    }

    return null
  },

  // =========================================================================
  // NIVEL 1 & 2: Búsqueda por Código de Barras (Local DB -> Supabase -> Open Food Facts)
  // =========================================================================
  async lookupByBarcode(barcode: string): Promise<{
    product: FoodProduct | null
    source: 'supabase_db' | 'openfoodfacts' | 'not_found'
    costUsd: number
    latencyMs: number
  }> {
    const startTime = Date.now()
    const cleanBarcode = barcode.trim().replace(/\D/g, '')

    if (!cleanBarcode || cleanBarcode.length < 5) {
      return {
        product: null,
        source: 'not_found',
        costUsd: 0,
        latencyMs: 0,
      }
    }

    // 1. Buscar en caché local de AsyncStorage
    try {
      const localRaw = await AsyncStorage.getItem(LOCAL_PRODUCTS_CACHE_KEY)
      if (localRaw) {
        const localList: FoodProduct[] = JSON.parse(localRaw)
        const match = localList.find((p) => p.barcode === cleanBarcode && p.dataSource !== 'ai_scan')
        if (match && match.name && !match.name.toLowerCase().includes('sin nombre')) {
          return {
            product: match,
            source: match.dataSource === 'verified' ? 'supabase_db' : 'openfoodfacts',
            costUsd: 0,
            latencyMs: Date.now() - startTime,
          }
        }
      }
    } catch {
      // Continuar a Supabase
    }

    // 2. Buscar en Supabase tabla `food_products`
    try {
      const { data: dbProduct, error } = await supabase
        .from('food_products')
        .select('*')
        .eq('barcode', cleanBarcode)
        .neq('data_source', 'ai_scan')
        .maybeSingle()

      if (dbProduct && !error && dbProduct.name) {
        const product: FoodProduct = {
          id: dbProduct.id,
          barcode: dbProduct.barcode,
          name: dbProduct.name,
          brand: dbProduct.brand,
          servingSizeG: Number(dbProduct.serving_size_g) || 100,
          servingName: dbProduct.serving_name || '100g',
          calories: Number(dbProduct.calories) || 0,
          protein: Number(dbProduct.protein) || 0,
          carbs: Number(dbProduct.carbs) || 0,
          fat: Number(dbProduct.fat) || 0,
          sugars: Number(dbProduct.sugars) || 0,
          saturatedFat: typeof dbProduct.saturated_fat === 'number' ? dbProduct.saturated_fat : undefined,
          saltG: typeof dbProduct.salt_g === 'number' ? dbProduct.salt_g : undefined,
          fiber: Number(dbProduct.fiber) || 0,
          sodiumMg: Number(dbProduct.sodium_mg) || 0,
          ingredients: dbProduct.ingredients || [],
          ultraProcessedScore: dbProduct.ultra_processed_score || 1,
          dataSource: dbProduct.data_source || 'verified',
          sourceLabel: 'Base de Datos Carga',
        }

        await foodScannerService.saveToLocalCache(product)

        return {
          product,
          source: 'supabase_db',
          costUsd: 0,
          latencyMs: Date.now() - startTime,
        }
      }
    } catch {
      // Supabase no configurado, continuar a OpenFoodFacts
    }

    // 3. Consultar Open Food Facts API v2
    try {
      const fields =
        'code,product_name,product_name_es,generic_name,generic_name_es,brands,brand_owner,nutriments,serving_size,serving_quantity,ingredients_text_es,ingredients_text,nova_group,image_front_url'
      const url = `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(cleanBarcode)}.json?fields=${fields}&lc=es&cc=es`

      const offResponse = await fetch(url, {
        headers: {
          'User-Agent': 'CargaApp-FitnessTracker/1.0 (soporte@carga.app)',
        },
      })

      if (offResponse.ok) {
        const json = await offResponse.json()
        if (json.status === 1 && json.product) {
          const p = json.product
          const nutriments = p.nutriments || {}

          let rawKcal =
            nutriments['energy-kcal_100g'] ??
            nutriments['energy-kcal_value'] ??
            nutriments['energy-kcal'] ??
            (nutriments['energy-kj_100g'] ? nutriments['energy-kj_100g'] / KJ_TO_KCAL : undefined) ??
            (nutriments['energy_100g'] && nutriments['energy_unit'] === 'kJ' ? nutriments['energy_100g'] / KJ_TO_KCAL : undefined) ??
            nutriments.calories ??
            0

          const calories = Math.round(Number(rawKcal) || 0)
          const energyKj = Math.round(
            nutriments['energy-kj_100g'] ??
              nutriments['energy-kj_value'] ??
              nutriments['energy-kj'] ??
              (calories * KJ_TO_KCAL)
          )

          const protein = Number((nutriments.proteins_100g ?? nutriments.proteins_value ?? nutriments.proteins ?? 0).toFixed(1))
          const carbs = Number((nutriments.carbohydrates_100g ?? nutriments.carbohydrates_value ?? nutriments.carbohydrates ?? 0).toFixed(1))
          const fat = Number((nutriments.fat_100g ?? nutriments.fat_value ?? nutriments.fat ?? 0).toFixed(1))
          const sugars = Number((nutriments.sugars_100g ?? nutriments.sugars_value ?? nutriments.sugars ?? 0).toFixed(1))
          const saturatedFat = Number((nutriments['saturated-fat_100g'] ?? nutriments['saturated-fat_value'] ?? nutriments['saturated-fat'] ?? 0).toFixed(1))
          const saltG = Number((nutriments.salt_100g ?? nutriments.salt_value ?? nutriments.salt ?? 0).toFixed(2))
          const fiber = Number((nutriments.fiber_100g ?? nutriments.fiber_value ?? nutriments.fiber ?? 0).toFixed(1))
          const sodiumMg = Math.round(
            (nutriments.sodium_100g ?? (nutriments.salt_100g ? nutriments.salt_100g / 2.5 : 0)) * 1000
          )

          const parsedServingQuantity = Number(p.serving_quantity) || parseFloat(String(p.serving_size || '').replace(',', '.')) || 100
          const parsedServingName = p.serving_size ? String(p.serving_size) : `${parsedServingQuantity}g`

          const ingredients = p.ingredients_text_es
            ? p.ingredients_text_es.split(',').map((s: string) => s.trim())
            : p.ingredients_text
            ? p.ingredients_text.split(',').map((s: string) => s.trim())
            : []

          const productName =
            p.product_name_es ||
            p.product_name ||
            p.generic_name_es ||
            p.generic_name ||
            'Producto sin nombre'

          const brand = p.brands || p.brand_owner || null

          const product: FoodProduct = {
            id: `off-${cleanBarcode}`,
            barcode: cleanBarcode,
            name: productName,
            brand,
            servingSizeG: parsedServingQuantity,
            servingName: parsedServingName,
            calories,
            energyKj,
            protein,
            carbs,
            fat,
            sugars,
            saturatedFat,
            saltG,
            fiber,
            sodiumMg,
            ingredients,
            ultraProcessedScore: p.nova_group || 2,
            dataSource: 'openfoodfacts',
            sourceLabel: 'Open Food Facts (Oficial)',
          }

          await foodScannerService.saveToLocalCache(product)

          return {
            product,
            source: 'openfoodfacts',
            costUsd: 0,
            latencyMs: Date.now() - startTime,
          }
        }
      }
    } catch (err) {
      console.warn('[FoodScanner] Error en Open Food Facts:', err)
    }

    return {
      product: null,
      source: 'not_found',
      costUsd: 0,
      latencyMs: Date.now() - startTime,
    }
  },

  // =========================================================================
  // NIVEL 3: Escaneo de Tabla Nutricional / OCR con IA (Claude Haiku 4.5 Vision)
  // Con auditoría programática post-parse de kJ/kcal, huella perceptual y base de datos
  // =========================================================================
  async scanLabelWithAi(
    imageUriOrBase64: string,
    optionalBarcode?: string
  ): Promise<{
    product: FoodProduct
    aiResult: NutritionalLabelResult
    costUsd: number
    latencyMs: number
  }> {
    const startTime = Date.now()
    const imageHash = computeImagePerceptualHash(imageUriOrBase64)

    // 1. CAPA 0: Comprobar si esta imagen exacta o muy similar ya se procesó ($0.00)
    try {
      const cachedScan = await getCachedProductByImageHash<{
        product: FoodProduct
        aiResult: NutritionalLabelResult
      }>(imageHash)
      if (cachedScan && cachedScan.product && cachedScan.aiResult) {
        return {
          product: cachedScan.product,
          aiResult: cachedScan.aiResult,
          costUsd: 0,
          latencyMs: Date.now() - startTime,
        }
      }
    } catch {
      // Continuar al flujo estándar
    }

    // 2. CAPA 1: Detección rápida de código de barras visible en la foto ($0.00)
    let detectedBarcode = optionalBarcode || null
    if (!detectedBarcode) {
      try {
        detectedBarcode = await foodScannerService.extractBarcodeFromImage(imageUriOrBase64)
      } catch {
        // Silencioso
      }
    }

    // 3. CAPA 2: Llamada a Claude Haiku 4.5 Vision
    const { data: rawAiResult, metrics } = await aiService.scanNutritionLabel(imageUriOrBase64)
    const aiResult = sanitizeNutritionalLabelValues(rawAiResult)
    detectedBarcode = detectedBarcode || aiResult.barcode || null

    let finalName = aiResult.productName || 'Producto Escaneado por IA'
    let finalBrand = aiResult.brand || null
    let finalCalories = aiResult.per100g?.calories ?? 0
    let finalProtein = aiResult.per100g?.protein ?? 0
    let finalCarbs = aiResult.per100g?.carbs ?? 0
    let finalFat = aiResult.per100g?.fat ?? 0
    let finalSugars = aiResult.per100g?.sugars ?? 0
    let finalSaturatedFat = aiResult.per100g?.saturatedFat ?? 0
    let finalSaltG = aiResult.per100g?.saltG ?? 0
    let finalServingSizeG = aiResult.packageServingSizeG || 100
    let finalServingName = aiResult.servingName || (aiResult.packageServingSizeG ? `${aiResult.packageServingSizeG}g` : '100g')
    let isCorroboratedWithApi = false
    let officialProduct: FoodProduct | null = null

    // CORROBORACIÓN: Si se detectó un código de barras (EAN), corroboramos con la API oficial
    if (detectedBarcode) {
      try {
        const officialLookup = await foodScannerService.lookupByBarcode(detectedBarcode)
        if (officialLookup?.product) {
          officialProduct = officialLookup.product
          isCorroboratedWithApi = true

          if (officialProduct.name && !officialProduct.name.toLowerCase().includes('sin nombre')) {
            finalName = officialProduct.name
          }
          if (officialProduct.brand) {
            finalBrand = officialProduct.brand
          }

          if (officialProduct.calories > 0 || officialProduct.protein > 0 || officialProduct.carbs > 0) {
            finalCalories = officialProduct.calories
            finalProtein = officialProduct.protein
            finalCarbs = officialProduct.carbs
            finalFat = officialProduct.fat
            if (typeof officialProduct.sugars === 'number') finalSugars = officialProduct.sugars
            if (typeof officialProduct.saturatedFat === 'number') finalSaturatedFat = officialProduct.saturatedFat
            if (typeof officialProduct.saltG === 'number') finalSaltG = officialProduct.saltG
            if (officialProduct.servingSizeG > 0) finalServingSizeG = officialProduct.servingSizeG
            if (officialProduct.servingName) finalServingName = officialProduct.servingName
          }
        }
      } catch (e) {
        console.warn('[FoodScanner] Error al corroborar desde código de barras:', e)
      }
    }

    const product: FoodProduct = {
      id: `ai-label-${Date.now()}`,
      barcode: detectedBarcode,
      name: finalName,
      brand: finalBrand,
      servingSizeG: finalServingSizeG,
      servingName: finalServingName,
      calories: finalCalories,
      energyKj: aiResult.per100g?.energyKj || Math.round(finalCalories * KJ_TO_KCAL),
      protein: finalProtein,
      carbs: finalCarbs,
      fat: finalFat,
      sugars: finalSugars,
      saturatedFat: finalSaturatedFat,
      saltG: finalSaltG,
      fiber: aiResult.per100g?.fiber || 0,
      sodiumMg: aiResult.per100g?.sodiumMg || 0,
      micronutrients: aiResult.micronutrients || [],
      ingredients: (isCorroboratedWithApi && officialProduct?.ingredients?.length) ? officialProduct.ingredients : (aiResult.ingredientsList || []),
      ultraProcessedScore: aiResult.ultraProcessedScore || 3,
      dataSource: isCorroboratedWithApi ? 'openfoodfacts' : 'ai_scan',
      sourceLabel: isCorroboratedWithApi ? 'Corroborado con API Oficial' : 'Lector OCR de Etiqueta (IA Auditado)',
    }

    // 4. GUARDADO GLOBAL: Persistir en Supabase, AsyncStorage y huella perceptual para siempre
    await foodScannerService.saveToLocalCache(product)
    await foodScannerService.persistProductToDatabase(product)
    await saveProductByImageHash(imageHash, { product, aiResult })

    return {
      product,
      aiResult,
      costUsd: metrics.estimatedCostUsd,
      latencyMs: metrics.latencyMs,
    }
  },

  // =========================================================================
  // NIVEL 3: Escaneo de Plato de Comida con IA (Claude Haiku 4.5 Vision)
  // =========================================================================
  async scanPlateWithAi(imageUriOrBase64: string): Promise<{
    mealName: string
    items: FoodPlateItem[]
    totalCalories: number
    totalProtein: number
    totalCarbs: number
    totalFat: number
    costUsd: number
    latencyMs: number
  }> {
    const startTime = Date.now()
    const imageHash = computeImagePerceptualHash(imageUriOrBase64)

    // 1. CAPA 0: Comprobar huella perceptual ($0.00)
    try {
      const cached = await getCachedProductByImageHash<{
        mealName: string
        items: FoodPlateItem[]
        totalCalories: number
        totalProtein: number
        totalCarbs: number
        totalFat: number
      }>(imageHash)
      if (cached && cached.items) {
        return {
          ...cached,
          costUsd: 0,
          latencyMs: Date.now() - startTime,
        }
      }
    } catch {
      // Continuar
    }

    const { data: aiResult, metrics } = await aiService.scanMealPlate(imageUriOrBase64)

    const scanOutput = {
      mealName: aiResult.mealName || 'Plato Detectado por IA',
      items: aiResult.items || [],
      totalCalories: aiResult.estimatedTotalCalories,
      totalProtein: aiResult.estimatedTotalMacros.protein,
      totalCarbs: aiResult.estimatedTotalMacros.carbs,
      totalFat: aiResult.estimatedTotalMacros.fat,
      costUsd: metrics.estimatedCostUsd,
      latencyMs: metrics.latencyMs,
    }

    await saveProductByImageHash(imageHash, scanOutput)

    return scanOutput
  },

  // =========================================================================
  // Persistencia y Caché Global Permanente
  // =========================================================================
  async persistProductToDatabase(product: FoodProduct): Promise<void> {
    try {
      const payload: Record<string, any> = {
        name: product.name,
        brand: product.brand,
        serving_size_g: product.servingSizeG,
        serving_name: product.servingName,
        calories: product.calories,
        protein: product.protein,
        carbs: product.carbs,
        fat: product.fat,
        sugars: product.sugars || 0,
        saturated_fat: product.saturatedFat || 0,
        salt_g: product.saltG || 0,
        fiber: product.fiber || 0,
        sodium_mg: product.sodiumMg || 0,
        ingredients: product.ingredients || [],
        ultra_processed_score: product.ultraProcessedScore || 1,
        data_source: product.dataSource,
      }

      if (product.barcode && product.barcode.trim().length >= 5) {
        payload.barcode = product.barcode.trim()
        await supabase.from('food_products').upsert(payload, { onConflict: 'barcode' })
      } else {
        await supabase.from('food_products').insert(payload)
      }
    } catch (err) {
      console.warn('[FoodScanner] Error guardando producto en Supabase:', err)
    }
  },

  async saveToLocalCache(product: FoodProduct): Promise<void> {
    try {
      const raw = await AsyncStorage.getItem(LOCAL_PRODUCTS_CACHE_KEY)
      let list: FoodProduct[] = raw ? JSON.parse(raw) : []

      // Versión ligera (omitir micronutrientes pesados y recortar ingredientes para mantener AsyncStorage ultraligero <50KB)
      const leanProduct: FoodProduct = {
        ...product,
        micronutrients: undefined,
        ingredients: product.ingredients ? product.ingredients.slice(0, 10) : [],
      }

      const index = list.findIndex(
        (p) => (leanProduct.barcode && p.barcode === leanProduct.barcode) || p.name.toLowerCase() === leanProduct.name.toLowerCase()
      )
      if (index >= 0) {
        list[index] = leanProduct
      } else {
        list.unshift(leanProduct)
      }
      await AsyncStorage.setItem(LOCAL_PRODUCTS_CACHE_KEY, JSON.stringify(list.slice(0, 80)))
    } catch {
      // Ignorar
    }
  },

  async clearCorruptedCache(): Promise<void> {
    try {
      const raw = await AsyncStorage.getItem(LOCAL_PRODUCTS_CACHE_KEY)
      if (raw) {
        const list: FoodProduct[] = JSON.parse(raw)
        const cleanList = list.filter((p) => p.dataSource === 'openfoodfacts' || p.dataSource === 'verified')
        await AsyncStorage.setItem(LOCAL_PRODUCTS_CACHE_KEY, JSON.stringify(cleanList))
      }
    } catch {
      // Ignorar
    }
  },
}
