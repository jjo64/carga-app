import { supabase } from '@/lib/supabase'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { aiService } from './ai'
import { FoodPlateItem, NutritionalLabelResult, MicronutrientItem } from './ai/types'
import { callAnthropicApi, extractAndParseJson } from './ai/client'
import { optimizeImageForVision } from './ai/imageOptimizer'

export interface FoodProduct {
  id: string
  barcode?: string | null
  name: string
  brand?: string | null
  servingSizeG: number
  servingName: string
  calories: number // ¡Siempre en kcal!
  energyKj?: number
  protein: number
  carbs: number
  fat: number
  sugars?: number
  saturatedFat?: number
  saltG?: number
  fiber?: number
  sodiumMg?: number
  micronutrients?: MicronutrientItem[]
  ingredients?: string[]
  ultraProcessedScore?: number // 1 (Limpio) a 10 (Ultraprocesado)
  dataSource: 'verified' | 'openfoodfacts' | 'ai_scan' | 'user'
  sourceLabel?: string
}

const LOCAL_PRODUCTS_CACHE_KEY = '@carga_cached_food_products'

/**
 * Valida la consistencia termodinámica de los macros:
 * (Proteína * 4) + (Carbohidratos * 4) + (Grasas * 9) ≈ Calorías
 */
export function validateMacroThermodynamics(calories: number, protein: number, carbs: number, fat: number): {
  isValid: boolean
  calculatedCalories: number
  differencePercent: number
} {
  const calculated = protein * 4 + carbs * 4 + fat * 9
  if (calories <= 0) return { isValid: true, calculatedCalories: calculated, differencePercent: 0 }
  const diff = Math.abs(calculated - calories)
  const diffPercent = (diff / calories) * 100
  return {
    isValid: diffPercent <= 20, // Tolerancia del 20%
    calculatedCalories: Math.round(calculated),
    differencePercent: Math.round(diffPercent),
  }
}

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
            text: 'Eres un lector OCR de códigos de barras. Analiza la imagen y extrae ÚNICAMENTE la secuencia numérica del código de barras (generalmente 8 a 13 dígitos numéricos). Responde ÚNICAMENTE un objeto JSON con este esquema: {"barcode": "8410128795603"} o {"barcode": null} si no hay código de barras.',
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
                text: 'Extrae los dígitos numéricos del código de barras.',
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
    const cleanBarcode = barcode.trim()

    // 1. Buscar en caché local de AsyncStorage
    try {
      const localRaw = await AsyncStorage.getItem(LOCAL_PRODUCTS_CACHE_KEY)
      if (localRaw) {
        const localList: FoodProduct[] = JSON.parse(localRaw)
        const match = localList.find((p) => p.barcode === cleanBarcode)
        if (match) {
          return {
            product: match,
            source: 'supabase_db',
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
        .maybeSingle()

      if (dbProduct && !error) {
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
      // Supabase no configurado o tabla pendiente, continuar a OpenFoodFacts
    }

    // 3. Consultar Open Food Facts API v2 (Nivel 2 - Optimizada con fields, lc y cc)
    try {
      const fields =
        'code,product_name,product_name_es,brands,nutriments,serving_size,serving_quantity,ingredients_text_es,ingredients_text,nova_group,image_front_url'
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

          const calories =
            Math.round(
              nutriments['energy-kcal_100g'] ||
                (nutriments['energy-kj_100g'] ? nutriments['energy-kj_100g'] / 4.184 : 0) ||
                nutriments.calories ||
                0
            ) || 0
          const protein = Number((nutriments.proteins_100g || nutriments.proteins || 0).toFixed(1))
          const carbs = Number((nutriments.carbohydrates_100g || nutriments.carbohydrates || 0).toFixed(1))
          const fat = Number((nutriments.fat_100g || nutriments.fat || 0).toFixed(1))
          const sugars = Number((nutriments.sugars_100g || nutriments.sugars || 0).toFixed(1))
          const fiber = Number((nutriments.fiber_100g || nutriments.fiber || 0).toFixed(1))
          const sodiumMg = Math.round((nutriments.sodium_100g || 0) * 1000)

          const ingredients = p.ingredients_text_es
            ? p.ingredients_text_es.split(',').map((s: string) => s.trim())
            : p.ingredients_text
            ? p.ingredients_text.split(',').map((s: string) => s.trim())
            : []

          const product: FoodProduct = {
            id: `off-${cleanBarcode}`,
            barcode: cleanBarcode,
            name: p.product_name_es || p.product_name || 'Producto sin nombre',
            brand: p.brands || null,
            servingSizeG: p.serving_quantity ? Number(p.serving_quantity) : 100,
            servingName: p.serving_size || '100g',
            calories,
            protein,
            carbs,
            fat,
            sugars,
            fiber,
            sodiumMg,
            ingredients,
            ultraProcessedScore: p.nova_group || 2,
            dataSource: 'openfoodfacts',
            sourceLabel: 'Open Food Facts (Global)',
          }

          // Auto-poblado en nuestra base de datos (Background sync)
          foodScannerService.persistProductToDatabase(product).catch(() => {})
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
  // NIVEL 3: Escaneo de Tabla Nutricional / OCR con IA (Claude 3.5 Sonnet)
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
    const { data: aiResult, metrics } = await aiService.scanNutritionLabel(imageUriOrBase64)
    const detectedBarcode = optionalBarcode || aiResult.barcode || null

    let finalName = aiResult.productName || 'Producto Escaneado por IA'
    let finalBrand = aiResult.brand || null

    // Si se detectó un código de barras (EAN), consultamos la base de datos oficial para obtener nombre y marca certificados
    if (detectedBarcode) {
      try {
        const officialLookup = await foodScannerService.lookupByBarcode(detectedBarcode)
        if (officialLookup?.product) {
          if (officialLookup.product.name && !officialLookup.product.name.toLowerCase().includes('sin nombre')) {
            finalName = officialLookup.product.name
          }
          if (officialLookup.product.brand) {
            finalBrand = officialLookup.product.brand
          }
        }
      } catch (e) {
        console.warn('[FoodScanner] Error al auto-completar desde código de barras:', e)
      }
    }

    const product: FoodProduct = {
      id: `ai-label-${Date.now()}`,
      barcode: detectedBarcode,
      name: finalName,
      brand: finalBrand,
      servingSizeG: aiResult.packageServingSizeG || 100,
      servingName: aiResult.servingName || (aiResult.packageServingSizeG ? `${aiResult.packageServingSizeG}ml/g` : '100g'),
      calories: aiResult.per100g.calories,
      energyKj: aiResult.per100g.energyKj,
      protein: aiResult.per100g.protein,
      carbs: aiResult.per100g.carbs,
      fat: aiResult.per100g.fat,
      sugars: aiResult.per100g.sugars || 0,
      saturatedFat: aiResult.per100g.saturatedFat || 0,
      saltG: aiResult.per100g.saltG || 0,
      fiber: aiResult.per100g.fiber || 0,
      sodiumMg: aiResult.per100g.sodiumMg || 0,
      micronutrients: aiResult.micronutrients || [],
      ingredients: aiResult.ingredientsList || [],
      ultraProcessedScore: aiResult.ultraProcessedScore || 3,
      dataSource: 'ai_scan',
      sourceLabel: 'Escaneo IA',
    }

    // Si tiene código de barras, lo guardamos para que el próximo usuario lo tenga a $0
    if (optionalBarcode) {
      foodScannerService.persistProductToDatabase(product).catch(() => {})
    }
    await foodScannerService.saveToLocalCache(product)

    return {
      product,
      aiResult,
      costUsd: metrics.estimatedCostUsd,
      latencyMs: metrics.latencyMs,
    }
  },

  // =========================================================================
  // NIVEL 3: Escaneo de Plato de Comida con IA (Claude 3.5 Sonnet)
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
    const { data: aiResult, metrics } = await aiService.scanMealPlate(imageUriOrBase64)

    return {
      mealName: aiResult.mealName || 'Plato Detectado por IA',
      items: aiResult.items || [],
      totalCalories: aiResult.estimatedTotalCalories,
      totalProtein: aiResult.estimatedTotalMacros.protein,
      totalCarbs: aiResult.estimatedTotalMacros.carbs,
      totalFat: aiResult.estimatedTotalMacros.fat,
      costUsd: metrics.estimatedCostUsd,
      latencyMs: metrics.latencyMs,
    }
  },

  // =========================================================================
  // Persistencia y Auto-Poblado en Supabase y Caché Local
  // =========================================================================
  async persistProductToDatabase(product: FoodProduct): Promise<void> {
    try {
      const { error } = await supabase.from('food_products').upsert(
        {
          barcode: product.barcode,
          name: product.name,
          brand: product.brand,
          serving_size_g: product.servingSizeG,
          serving_name: product.servingName,
          calories: product.calories,
          protein: product.protein,
          carbs: product.carbs,
          fat: product.fat,
          sugars: product.sugars || 0,
          fiber: product.fiber || 0,
          sodium_mg: product.sodiumMg || 0,
          ingredients: product.ingredients || [],
          ultra_processed_score: product.ultraProcessedScore || 1,
          data_source: product.dataSource,
        },
        { onConflict: 'barcode' }
      )

      if (error) {
        // Puede fallar si la tabla en Supabase no existe aún
      }
    } catch {
      // Continuar silenciosamente
    }
  },

  async saveToLocalCache(product: FoodProduct): Promise<void> {
    try {
      const raw = await AsyncStorage.getItem(LOCAL_PRODUCTS_CACHE_KEY)
      const list: FoodProduct[] = raw ? JSON.parse(raw) : []
      const index = list.findIndex((p) => (product.barcode && p.barcode === product.barcode) || p.id === product.id)
      if (index >= 0) {
        list[index] = product
      } else {
        list.unshift(product)
      }
      // Limitar a los 100 productos más recientes en cliente
      await AsyncStorage.setItem(LOCAL_PRODUCTS_CACHE_KEY, JSON.stringify(list.slice(0, 100)))
    } catch {
      // Ignorar
    }
  },
}
