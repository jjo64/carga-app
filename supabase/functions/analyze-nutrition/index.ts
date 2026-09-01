import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const NUTRITION_SYSTEM_PROMPT = `Eres un nutricionista deportivo experto y motor de análisis de alimentos para la app de fitness "Carga".

Tu tarea es analizar texto libre en español que describe una comida y devolver un desglose nutricional exacto en formato JSON estricto.

REGLAS DE ANÁLISIS:
1. Identifica cada alimento mencionado, su cantidad aproximada en gramos/mililitros y la marca si se indica.
2. Para marcas y supermercados españoles (Mercadona / Hacendado, Dia, Carrefour, Lidl, Alcampo, etc.), usa valores nutricionales estándar de esos productos.
3. Si no se especifica el peso exacto pero sí unidades ("2 huevos", "1 lata de atún", "un plato de arroz"), realiza la estimación estándar (1 huevo = 60g, 1 lata de atún = 52g escurrido, 1 plato de arroz cocido = 200g).
4. Razona sobre el estado del alimento (crudo vs cocinado):
   - Pechuga de pollo cruda: 120 kcal, 22g P, 0g C, 2.5g G por 100g.
   - Pechuga de pollo plancha: 165 kcal, 31g P, 0g C, 3.6g G por 100g.
   - Pasta/arroz seco: ~350 kcal, 12g P, 72g C, 1.5g G por 100g.
   - Pasta/arroz cocido: ~130 kcal, 3g P, 28g C, 0.5g G por 100g.
   - Huevo L (60g): ~80 kcal, 7.5g P, 0.5g C, 5.5g G.
   - Aceite de oliva (1 cucharada = 10g): ~90 kcal, 0g P, 0g C, 10g G.
5. Calcula los totales sumando todos los alimentos.

FORMATO DE RESPUESTA REQUERIDO (JSON estricto sin bloques de texto adicionales):
{
  "foods": [
    {
      "name": "nombre del alimento",
      "brand": "marca si se especificó o null",
      "quantity_g": número,
      "calories": número,
      "protein_g": número,
      "carbs_g": número,
      "fat_g": número,
      "confidence": "high" | "medium" | "low",
      "notes": "aclaración breve sobre peso o cocción"
    }
  ],
  "totals": {
    "calories": número,
    "protein_g": número,
    "carbs_g": número,
    "fat_g": número
  },
  "overall_confidence": "high" | "medium" | "low",
  "ai_notes": "comentario breve del nutricionista"
}`

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  try {
    const { rawInput, mealType } = await req.json()

    if (!rawInput || typeof rawInput !== 'string') {
      return new Response(
        JSON.stringify({ error: 'rawInput es requerido' }),
        { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      )
    }

    const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
    if (!apiKey) {
      // Fallback de contingencia si no hay API key configurada
      return new Response(
        JSON.stringify({
          foods: [
            {
              name: rawInput,
              brand: null,
              quantity_g: 200,
              calories: 350,
              protein_g: 25,
              carbs_g: 40,
              fat_g: 10,
              confidence: 'medium',
              notes: 'Modo offline / Estimación base',
            },
          ],
          totals: { calories: 350, protein_g: 25, carbs_g: 40, fat_g: 10 },
          overall_confidence: 'medium',
          ai_notes: 'Configura ANTHROPIC_API_KEY en Supabase para análisis en tiempo real con IA.',
        }),
        { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      )
    }

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
        max_tokens: 1200,
        system: [
          {
            type: 'text',
            text: NUTRITION_SYSTEM_PROMPT,
            cache_control: { type: 'ephemeral' },
          },
        ],
        messages: [
          {
            role: 'user',
            content: `Tipo de comida: ${mealType || 'comida'}\nTexto del usuario:\n"${rawInput}"`,
          },
        ],
      }),
    })

    const claudeData = await response.json()
    if (!response.ok) {
      throw new Error(`Error de Claude API: ${JSON.stringify(claudeData)}`)
    }

    const rawText = claudeData.content[0]?.text || '{}'
    // Sanitizar posibles bloques de código markdown
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
