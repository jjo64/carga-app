import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const PLAN_SYSTEM_PROMPT = `Eres un entrenador personal de alto rendimiento para la app "Carga".

Tu objetivo es estructurar planes de entrenamiento semanales fundamentados en hipertrofia y sobrecarga progresiva.

PRINCIPIOS:
- 2 días: Full Body × 2
- 3 días: Push / Pull / Legs o Full Body × 3
- 4 días: Torso / Pierna × 2 (Upper / Lower)
- 5 días: Push / Pull / Legs / Torso / Pierna
- 6 días: PPL × 2

FORMATO DE RESPUESTA (JSON estricto):
{
  "split_name": "nombre del split (ej: Torso / Pierna)",
  "days": [
    {
      "day_number": 1,
      "day_name": "Lunes",
      "muscle_focus": "Torso (Pecho, Espalda, Hombro)",
      "exercises": [
        {
          "name": "Press de banca con barra",
          "sets": 4,
          "reps": "6-8",
          "rest_seconds": 120,
          "notes": "Controlar la bajada en 2 segundos"
        }
      ]
    }
  ],
  "ai_notes": "explicación de la distribución del volumen semanal"
}`

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  try {
    const { goal, available_days, level, preferences, user_profile } = await req.json()

    const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
    if (!apiKey) {
      return new Response(
        JSON.stringify({
          split_name: 'PPL Clásico',
          days: [
            {
              day_number: 1,
              day_name: 'Día 1',
              muscle_focus: 'Empuje (Pecho, Hombro, Tríceps)',
              exercises: [
                { name: 'Press de banca plano', sets: 4, reps: '8-10', rest_seconds: 90, notes: 'Sobrecarga' },
                { name: 'Press militar mancuernas', sets: 3, reps: '10-12', rest_seconds: 90, notes: 'Control' },
                { name: 'Fondos en paralelas', sets: 3, reps: '10-12', rest_seconds: 90, notes: 'Pecho/Tríceps' },
              ],
            },
          ],
          ai_notes: 'Plan estándar generado en modo base.',
        }),
        { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      )
    }

    const userMessage = `
OBJETIVO: ${goal || 'Hipertrofia'}
DÍAS DISPONIBLES: ${available_days || 4} días a la semana
NIVEL: ${level || 'Intermedio'}
LIMITACIONES O PREFERENCIAS: ${preferences || 'Ninguna'}
PERFIL: ${user_profile?.gender || 'Hombre'}, ${user_profile?.weight_kg || 75}kg
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
        max_tokens: 2000,
        system: [
          {
            type: 'text',
            text: PLAN_SYSTEM_PROMPT,
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
