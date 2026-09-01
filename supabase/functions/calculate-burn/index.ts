import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const BURN_SYSTEM_PROMPT = `Eres un fisiólogo del ejercicio y experto en biomecánica de la fuerza para la app "Carga".

Tu labor es calcular el gasto calórico real de una sesión de entrenamiento con pesas basándote en:
1. Volumen total levantado en kg (peso × reps en series efectivas).
2. Duración de la sesión en minutos.
3. Intensidad percibida (RPE promedio o descansos).
4. Perfil del usuario (peso corporal, altura, edad, género).
5. Efecto EPOC (Excess Post-Exercise Oxygen Consumption): +10-15% para entrenamientos de alta intensidad con sobrecarga progresiva.

FÓRMULA BASE MET:
- Entrenamiento con pesas moderado: MET 4.0
- Entrenamiento de hipertrofia intenso (RPE 7-9): MET 5.5 - 6.0
- Gasto base = MET × peso_kg × (duración_minutos / 60)
- Bonus por tonelaje: +0.08 kcal por cada 100 kg de volumen total levantado.

FORMATO DE RESPUESTA (JSON estricto):
{
  "calories_burned": número entero,
  "intensity_rating": "baja" | "moderada" | "alta" | "máxima",
  "total_volume_kg": número,
  "breakdown": {
    "base_calories": número,
    "volume_bonus": número,
    "epoc_bonus": número
  },
  "ai_comment": "comentario breve sobre el rendimiento de la sesión y recomendación de recuperación"
}`

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  try {
    const { sets, duration_minutes, user_profile } = await req.json()

    const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
    if (!apiKey) {
      const weight = user_profile?.weight_kg || 75
      const duration = duration_minutes || 45
      const totalVol = sets?.reduce((acc: number, s: any) => acc + (s.weight_kg || 0) * (s.reps || 0), 0) || 0
      const baseCal = Math.round(5.0 * weight * (duration / 60))
      const bonus = Math.round((totalVol / 100) * 0.08)
      const total = baseCal + bonus

      return new Response(
        JSON.stringify({
          calories_burned: total,
          intensity_rating: 'moderada',
          total_volume_kg: totalVol,
          breakdown: { base_calories: baseCal, volume_bonus: bonus, epoc_bonus: Math.round(total * 0.1) },
          ai_comment: 'Sesión completada con buena intensidad. Prioriza descanso e hidratación.',
        }),
        { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      )
    }

    const sessionSummary = sets
      ?.map((s: any) => `${s.exercise_name}: ${s.weight_kg}kg × ${s.reps} reps${s.rpe ? ` (RPE ${s.rpe})` : ''}`)
      .join('\n')

    const userMessage = `
DATOS DEL USUARIO:
- Peso: ${user_profile?.weight_kg || 75} kg
- Altura: ${user_profile?.height_cm || 175} cm
- Género: ${user_profile?.gender || 'male'}

SESIÓN REALIZADA:
- Duración: ${duration_minutes || 45} minutos
- Series:
${sessionSummary || 'Sin detalle de series'}
`

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'prompt-caching-2024-07-31',
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 800,
        system: [
          {
            type: 'text',
            text: BURN_SYSTEM_PROMPT,
            cache_control: { type: 'ephemeral' },
          },
        ],
        messages: [{ role: 'user', content: userMessage }],
      }),
    })

    const claudeData = await response.json()
    if (!response.ok) throw new Error(`Error de Claude API: ${JSON.stringify(claudeData)}`)

    const rawText = claudeData.content[0]?.text || '{}'
    const cleanedText = rawText.replace(/```json/g, '').replace(/```/g, '').trim()
    const parsed = JSON.parse(cleanedText)

    return new Response(JSON.stringify(parsed), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    )
  }
})
