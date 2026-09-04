import AsyncStorage from '@react-native-async-storage/async-storage'

const RECENT_IMAGE_HASHES_KEY = '@carga_recent_image_hashes_v1'
const MAX_RECENT_HASHES = 30
const HASH_TTL_MS = 24 * 60 * 60 * 1000 // 24 horas

interface CachedImageEntry {
  hash: string
  timestamp: number
  data: any
}

/**
 * Genera un hash perceptual ligero de 64 bits a partir de los datos base64 de una imagen.
 * Muestrea 64 puntos distribuidos uniformemente para crear una huella digital estructural.
 */
export function computeImagePerceptualHash(base64OrUri: string): string {
  // Limpiar encabezados data:image/...;base64,
  const cleanData = base64OrUri.includes('base64,')
    ? base64OrUri.split('base64,')[1]
    : base64OrUri

  if (!cleanData || cleanData.length < 64) {
    return '0'.repeat(64)
  }

  const length = cleanData.length
  const step = Math.floor(length / 64)
  let hashBits = ''

  for (let i = 0; i < 64; i++) {
    const idx1 = i * step
    const idx2 = Math.min(length - 1, idx1 + Math.floor(step / 2))
    const charCode1 = cleanData.charCodeAt(idx1)
    const charCode2 = cleanData.charCodeAt(idx2)
    hashBits += charCode1 > charCode2 ? '1' : '0'
  }

  return hashBits
}

/**
 * Calcula la distancia Hamming entre dos hashes binarios (número de bits diferentes).
 */
export function calculateHammingDistance(hashA: string, hashB: string): number {
  if (hashA.length !== hashB.length) return 64
  let diff = 0
  for (let i = 0; i < hashA.length; i++) {
    if (hashA[i] !== hashB[i]) diff++
  }
  return diff
}

/**
 * Determina si dos imágenes son esencialmente la misma captura (distancia <= 5 bits de 64).
 */
export function isImageNearDuplicate(hashA: string, hashB: string, maxDiffBits = 5): boolean {
  return calculateHammingDistance(hashA, hashB) <= maxDiffBits
}

/**
 * Busca si una imagen idéntica o casi idéntica fue escaneada recientemente.
 * Si existe coincidencia, retorna el resultado guardado ($0.00 de coste en tokens).
 */
export async function getCachedProductByImageHash<T>(
  imageHash: string,
  maxDiffBits = 4
): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(RECENT_IMAGE_HASHES_KEY)
    if (!raw) return null

    const entries: CachedImageEntry[] = JSON.parse(raw)
    const now = Date.now()

    // Filtrar entradas expiradas
    const validEntries = entries.filter((e) => now - e.timestamp < HASH_TTL_MS)

    for (const entry of validEntries) {
      if (isImageNearDuplicate(imageHash, entry.hash, maxDiffBits)) {
        return entry.data as T
      }
    }
  } catch (err) {
    console.warn('[ImageHasher] Error leyendo caché de huella perceptual:', err)
  }

  return null
}

/**
 * Guarda el resultado de un escaneo asociado a su huella perceptual para reusarlo gratis.
 */
export async function saveProductByImageHash(imageHash: string, data: any): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(RECENT_IMAGE_HASHES_KEY)
    let entries: CachedImageEntry[] = raw ? JSON.parse(raw) : []

    const now = Date.now()
    // Limpiar expirados y limitar tamaño
    entries = entries.filter((e) => now - e.timestamp < HASH_TTL_MS)

    entries.unshift({
      hash: imageHash,
      timestamp: now,
      data,
    })

    await AsyncStorage.setItem(
      RECENT_IMAGE_HASHES_KEY,
      JSON.stringify(entries.slice(0, MAX_RECENT_HASHES))
    )
  } catch (err) {
    console.warn('[ImageHasher] Error guardando huella perceptual:', err)
  }
}
