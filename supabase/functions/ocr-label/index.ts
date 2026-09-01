import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const OCR_SYSTEM_PROMPT = `Eres un lector de tablas nutricionales y etiquetas de alimentos para la app "Carga".

Analiza la imagen de la etiqueta nutricional y extrae los datos normalizados por cada 100g de producto.

FORMATO DE RESPUESTA (JSON estricto):
{
  "product_name": "nombre o tipo de producto",
  "brand": "marca si se identifica",
  "serving_size_g": número o null,
  "per_100g": {
    "calories": número,
    "protein_g": número,
    "carbs_g": número,
    "sugar_g": número o null,
    "fat_g": número,
    "saturated_fat_g": número o null,
    "fiber_g": número o null,
    "salt_g": número o null
  },
  "confidence": "high" | "medium" | "low",
  "notes": "aclaración si algún número no fue 100% legible"
}`

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  try {
    const { imageBase64, mediaType } = await req.json()

    if (!imageBase64) {
      return new Response(
        JSON.stringify({ error: 'imageBase64 es requerido' }),
        { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      )
    }

    const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
    if (!apiKey) {
      return new Response(
        JSON.stringify({
          product_name: 'Producto Escaneado (Demo)',
          brand: 'Marca Genérica',
          serving_size_g: 100,
          per_100g: {
            calories: 220,
            protein_g: 18,
            carbs_g: 12,
            sugar_g: 2,
            fat_g: 8,
            saturated_fat_g: 2,
            fiber_g: 3,
            salt_g: 1,
          },
          confidence: 'medium',
          notes: 'Configura ANTHROPIC_API_KEY para OCR real.',
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
        max_tokens: 800,
        system: [
          {
            type: 'text',
            text: OCR_SYSTEM_PROMPT,
            cache_control: { type: 'ephemeral' },
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
                  media_type: mediaType || 'image/jpeg',
                  data: imageBase64,
                },
              },
              {
                type: 'text',
                text: 'Extrae la información nutricional de esta etiqueta en el formato JSON indicado.',
              },
            ],
          },
        ],
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
