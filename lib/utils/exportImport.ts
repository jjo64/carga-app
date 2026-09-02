import { Share, Alert, Platform } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { supabase } from '../supabase'

export interface ExportDataPayload {
  version: string
  exportedAt: string
  profile: any
  workoutHistory: any[]
  bodyMeasurements: any[]
  routines: any[]
  notifications: any
}

export async function exportAllAppData(data: {
  profile: any
  workoutHistory: any[]
  bodyMeasurements: any[]
  routines: any[]
  notifications?: any
}): Promise<{ success: boolean; jsonString?: string; error?: string }> {
  try {
    const payload: ExportDataPayload = {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      profile: data.profile,
      workoutHistory: data.workoutHistory,
      bodyMeasurements: data.bodyMeasurements,
      routines: data.routines,
      notifications: data.notifications || {},
    }

    const jsonString = JSON.stringify(payload, null, 2)

    await Share.share({
      title: `FitAI_Backup_${new Date().toISOString().split('T')[0]}.json`,
      message: jsonString,
    })

    return { success: true, jsonString }
  } catch (err: any) {
    console.log('Export data error:', err)
    return { success: false, error: err?.message || 'Error al exportar datos' }
  }
}

export async function importAppData(jsonString: string): Promise<{
  success: boolean
  importedCounts?: {
    historyCount: number
    measurementsCount: number
    routinesCount: number
  }
  error?: string
}> {
  try {
    const parsed: ExportDataPayload = JSON.parse(jsonString)

    if (!parsed || typeof parsed !== 'object') {
      return { success: false, error: 'Formato de archivo inválido. No es un JSON válido.' }
    }

    let historyCount = 0
    let measurementsCount = 0
    let routinesCount = 0

    // 1. Save Measurements if provided
    if (Array.isArray(parsed.bodyMeasurements)) {
      await AsyncStorage.setItem(
        '@fitness_ia_body_measurements',
        JSON.stringify(parsed.bodyMeasurements)
      )
      measurementsCount = parsed.bodyMeasurements.length
    }

    // 2. Count History and Routines
    if (Array.isArray(parsed.workoutHistory)) {
      historyCount = parsed.workoutHistory.length
    }

    if (Array.isArray(parsed.routines)) {
      routinesCount = parsed.routines.length
    }

    return {
      success: true,
      importedCounts: {
        historyCount,
        measurementsCount,
        routinesCount,
      },
    }
  } catch (err: any) {
    console.log('Import data error:', err)
    return {
      success: false,
      error: 'No se pudo procesar el JSON. Comprueba que el texto copiado sea válido.',
    }
  }
}
