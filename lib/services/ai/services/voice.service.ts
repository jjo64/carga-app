import {
  VoiceLogResult,
  ActiveExerciseContext,
  AthleteProfileContext,
  AiServiceResponse,
} from '../types'
import { VOICE_LOGGER_SYSTEM_PROMPT } from '../prompts'
import { callAnthropicApi, extractAndParseJson } from '../client'
import { voiceLogResultSchema, VOICE_LOGGER_TOOL } from '../schemas'

/**
 * Hands-Free Voice Logger (Claude 3.5 Haiku - ~300ms)
 * Utiliza Tool Calling y validación runtime con Zod para garantizar
 * extracción determinista de datos de series por voz.
 */
export async function parseVoiceLog(
  transcript: string,
  exerciseContextOrName?: ActiveExerciseContext | string,
  athleteProfile?: AthleteProfileContext
): Promise<AiServiceResponse<VoiceLogResult>> {
  let activeExName: string | undefined
  let promptText = ''

  if (typeof exerciseContextOrName === 'object' && exerciseContextOrName !== null) {
    activeExName = exerciseContextOrName.name
    const lines: string[] = [
      `Ejercicio activo: ${exerciseContextOrName.name}${exerciseContextOrName.muscleGroup ? ` (${exerciseContextOrName.muscleGroup})` : ''}`,
      `Serie objetivo: ${exerciseContextOrName.targetSets || 3}x${exerciseContextOrName.targetReps || 10} @ RPE ${exerciseContextOrName.targetRpe || 8} (Serie en curso: #${exerciseContextOrName.currentSetNumber || 1})`,
    ]
    if (exerciseContextOrName.previousSet) {
      lines.push(`Serie previa: ${exerciseContextOrName.previousSet.weightKg}kg x ${exerciseContextOrName.previousSet.reps} reps @ RPE ${exerciseContextOrName.previousSet.rpe || 'N/A'}`)
    }
    if (athleteProfile?.preferredUnit) {
      lines.push(`Unidad preferida del atleta: ${athleteProfile.preferredUnit}`)
    }
    lines.push(`Dictado: "${transcript}"`)
    promptText = lines.join('\n')
  } else {
    activeExName = exerciseContextOrName
    promptText = `Ejercicio activo: ${exerciseContextOrName || 'No especificado'}\nDictado: "${transcript}"`
  }

  const { text, metrics } = await callAnthropicApi({
    modelTier: 'haiku',
    system: VOICE_LOGGER_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: promptText }],
    tools: [VOICE_LOGGER_TOOL],
    toolChoice: { type: 'tool', name: 'log_exercise_set' },
    temperature: 0.0,
    maxTokens: 300,
  })

  const parsed = extractAndParseJson<VoiceLogResult>(text, voiceLogResultSchema, metrics.modelUsed)
  parsed.rawTranscript = transcript
  if (!parsed.exerciseName && activeExName) {
    parsed.exerciseName = activeExName
  }

  return { data: parsed, metrics }
}

export const voiceService = {
  parseVoiceLog,
}
