import { NutritionalLabelResult, NaturalMealItem, MicronutrientItem } from './ai/types'

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

export const KJ_TO_KCAL = 4.184

/**
 * Valida la consistencia termodinámica de los macros:
 * (Proteína * 4) + (Carbohidratos * 4) + (Grasas * 9) ≈ Calorías
 */
export function validateMacroThermodynamics(
  calories: number,
  protein: number,
  carbs: number,
  fat: number
): {
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
 * Validación programática post-parse de tablas nutricionales.
 * Corrige confusiones de LLMs (kJ vs kcal), inconsistencias termodinámicas y límites de sub-macros.
 */
export function sanitizeNutritionalLabelValues(data: NutritionalLabelResult): NutritionalLabelResult {
  if (!data || !data.per100g) return data
  const p100 = { ...data.per100g }

  // 1. Detección y corrección de inversión kJ / kcal
  if (typeof p100.energyKj === 'number' && p100.energyKj > 0 && p100.calories > p100.energyKj) {
    const tempKj = p100.calories
    const tempKcal = p100.energyKj
    p100.calories = Math.round(tempKcal)
    p100.energyKj = Math.round(tempKj)
  }

  // 2. Si calories parece un valor en kJ (> 950 para alimentos que no son 100% grasa pura)
  if (p100.calories > 950 && (p100.fat || 0) < 99) {
    p100.energyKj = p100.calories
    p100.calories = Math.round(p100.energyKj / KJ_TO_KCAL)
  }

  // 3. Si energyKj falta pero tenemos calories, o viceversa
  if ((!p100.energyKj || p100.energyKj <= 0) && p100.calories > 0) {
    p100.energyKj = Math.round(p100.calories * KJ_TO_KCAL)
  } else if (p100.calories <= 0 && typeof p100.energyKj === 'number' && p100.energyKj > 0) {
    p100.calories = Math.round(p100.energyKj / KJ_TO_KCAL)
  }

  // 4. Validación termodinámica Atwater
  const atwaterCalories = Math.round(
    (p100.protein || 0) * 4 + (p100.carbs || 0) * 4 + (p100.fat || 0) * 9
  )
  if (atwaterCalories > 0 && p100.calories > 0) {
    const diffRatio = Math.abs(atwaterCalories - p100.calories) / p100.calories
    if (diffRatio > 0.5 && Math.abs(p100.calories / KJ_TO_KCAL - atwaterCalories) < atwaterCalories * 0.25) {
      p100.energyKj = p100.calories
      p100.calories = Math.round(p100.calories / KJ_TO_KCAL)
    }
  }

  // 5. Restricciones biológicas de sub-macros
  if (typeof p100.sugars === 'number' && p100.sugars > p100.carbs) {
    p100.sugars = p100.carbs
  }
  if (typeof p100.saturatedFat === 'number' && p100.saturatedFat > (p100.fat || 0)) {
    p100.saturatedFat = p100.fat
  }

  return {
    ...data,
    per100g: p100,
  }
}

/**
 * Búsqueda de productos en Open Food Facts por nombre/marca (API abierta y oficial).
 * Limpieza quirúrgica de queries que preserva números como "1,5%" o marcas como "Protein 25".
 */
export async function searchOpenFoodFactsByName(
  query: string,
  brand?: string | null
): Promise<FoodProduct | null> {
  try {
    const cleanQuery = query
      .replace(/\b\d+(?:[.,]\d+)?\s*(g|gr|gramos|kg|kilos|ml|l|litros|scoop|scoops|latas|pack|uds|unidades)\b/gi, '')
      .replace(/\s+/g, ' ')
      .trim()

    if (!cleanQuery || cleanQuery.length < 2) return null

    const searchQuery = brand ? `${cleanQuery} ${brand}` : cleanQuery
    const fields =
      'code,product_name,product_name_es,generic_name,generic_name_es,brands,brand_owner,nutriments,serving_size,serving_quantity,ingredients_text_es,nova_group'
    const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(searchQuery)}&search_simple=1&action=process&json=1&page_size=5&fields=${fields}&lc=es&cc=es`

    const res = await fetch(url, {
      headers: {
        'User-Agent': 'CargaApp-FitnessTracker/1.0 (soporte@carga.app)',
      },
    })

    if (res.ok) {
      const json = await res.json()
      if (json.products && json.products.length > 0) {
        for (const p of json.products) {
          const nutriments = p.nutriments || {}
          let rawKcal =
            nutriments['energy-kcal_100g'] ??
            nutriments['energy-kcal_value'] ??
            nutriments['energy-kcal'] ??
            nutriments.energy_100g

          if (rawKcal && nutriments.energy_unit === 'kJ' && (!nutriments['energy-kcal_100g'] || rawKcal > 950)) {
            rawKcal = Math.round(Number(rawKcal) / KJ_TO_KCAL)
          }

          if (rawKcal !== undefined && rawKcal !== null) {
            const calories = Math.round(Number(rawKcal) || 0)
            const protein = Number(
              (nutriments.proteins_100g ?? nutriments.proteins_value ?? nutriments.proteins ?? 0).toFixed(1)
            )
            const carbs = Number(
              (nutriments.carbohydrates_100g ?? nutriments.carbohydrates_value ?? nutriments.carbohydrates ?? 0).toFixed(1)
            )
            const fat = Number(
              (nutriments.fat_100g ?? nutriments.fat_value ?? nutriments.fat ?? 0).toFixed(1)
            )

            const parsedServingQuantity =
              Number(p.serving_quantity) ||
              parseFloat(String(p.serving_size || '').replace(',', '.')) ||
              100
            const parsedServingName = p.serving_size ? String(p.serving_size) : `${parsedServingQuantity}g`

            const productName =
              p.product_name_es ||
              p.product_name ||
              p.generic_name_es ||
              p.generic_name ||
              cleanQuery

            const foundBrand = p.brands || p.brand_owner || brand || null

            const product: FoodProduct = {
              id: p.code ? `off-${p.code}` : `off-search-${Date.now()}`,
              barcode: p.code || null,
              name: productName,
              brand: foundBrand,
              servingSizeG: parsedServingQuantity,
              servingName: parsedServingName,
              calories,
              energyKj: Math.round(calories * KJ_TO_KCAL),
              protein,
              carbs,
              fat,
              sugars: Number((nutriments.sugars_100g ?? 0).toFixed(1)),
              saturatedFat: Number((nutriments['saturated-fat_100g'] ?? 0).toFixed(1)),
              saltG: Number((nutriments.salt_100g ?? 0).toFixed(2)),
              fiber: Number((nutriments.fiber_100g ?? 0).toFixed(1)),
              sodiumMg: Math.round((nutriments.sodium_100g ?? 0) * 1000),
              ingredients: p.ingredients_text_es
                ? p.ingredients_text_es.split(',').map((s: string) => s.trim())
                : [],
              ultraProcessedScore: p.nova_group || 2,
              dataSource: 'openfoodfacts',
              sourceLabel: 'Open Food Facts (Oficial)',
            }

            return product
          }
        }
      }
    }
  } catch (err) {
    console.warn('[OpenFoodFacts] Error en búsqueda por texto:', err)
  }
  return null
}

/**
 * Enriquecimiento en tiempo real de alimentos desglosados en lenguaje natural
 * con datos certificados de Open Food Facts (Marcas españolas como Hacendado, DIA, Carrefour, etc.)
 */
export async function enrichNaturalMealWithOpenFoodFacts(items: NaturalMealItem[]): Promise<NaturalMealItem[]> {
  if (!items || items.length === 0) return []

  const results = await Promise.allSettled(
    items.map(async (item) => {
      try {
        const match = await searchOpenFoodFactsByName(item.name, item.brand)
        if (match && (match.calories > 0 || match.protein > 0 || match.carbs > 0)) {
          const grams = item.grams || 100
          const ratio = grams / 100
          const enrichedItem: NaturalMealItem = {
            name: match.name,
            brand: match.brand || item.brand,
            unitOrPortion: item.unitOrPortion,
            grams,
            calories: Math.round(match.calories * ratio),
            protein: Number((match.protein * ratio).toFixed(1)),
            carbs: Number((match.carbs * ratio).toFixed(1)),
            fat: Number((match.fat * ratio).toFixed(1)),
            source: 'openfoodfacts',
            barcode: match.barcode,
          }
          return enrichedItem
        }
      } catch (err) {
        console.warn(`[Enrichment] Error al buscar ${item.name}:`, err)
      }

      const fallbackItem: NaturalMealItem = {
        ...item,
        source: 'ai_estimate',
      }
      return fallbackItem
    })
  )

  return results.map((r, i) => (r.status === 'fulfilled' ? r.value : items[i]))
}
