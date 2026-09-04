import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages'
const ANTHROPIC_VERSION = '2023-06-01'

const PRICING = {
  haiku: {
    input: 1.0,
    output: 5.0,
    cacheWrite: 1.25,
    cacheRead: 0.10,
  },
  sonnet: {
    input: 2.0,
    output: 10.0,
    cacheWrite: 2.50,
    cacheRead: 0.20,
  },
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  const startTime = Date.now()

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No autorizado. Se requiere token JWT.' }), {
        status: 401,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // 1. Validar el token JWT del usuario
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Sesión inválida o expirada.' }), {
        status: 401,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    const {
      modelTier = 'haiku',
      actionType = 'general',
      system,
      messages,
      tools,
      toolChoice,
      maxTokens = 1000,
      temperature = 0.1,
    } = await req.json()

    // 2. Comprobar si el usuario es administrador (bypass de cuotas)
    const userEmail = (user.email || '').toLowerCase()
    let isAdmin = userEmail.includes('admin') || userEmail.includes('cueva') || userEmail.endsWith('@carga.app')

    if (!isAdmin) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin, role')
        .eq('id', user.id)
        .maybeSingle()

      if (profile?.is_admin === true || profile?.role === 'admin') {
        isAdmin = true
      }
    }

    // 3. RATE LIMITING EN SERVIDOR
    if (!isAdmin) {
      const now = new Date()

      if (actionType === 'scan_photo' || actionType === 'scan_plate' || actionType === 'scan_label') {
        const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()
        const { count, error: countErr } = await supabase
          .from('ai_usage_log')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .in('action_type', ['scan_photo', 'scan_plate', 'scan_label'])
          .gte('created_at', twentyFourHoursAgo)

        if (!countErr && typeof count === 'number' && count >= 5) {
          return new Response(
            JSON.stringify({
              error: 'Has alcanzado tu límite de 5 escaneos por foto de hoy. Usa el lector de código de barras ilimitado.',
              code: 'RATE_LIMIT_DAILY_PHOTOS',
              remaining: 0,
            }),
            {
              status: 429,
              headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
            }
          )
        }
      }

      if (actionType === 'generate_routine' || actionType === 'generate_mesocycle') {
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
        const { data: recentRoutine, error: routineErr } = await supabase
          .from('ai_usage_log')
          .select('created_at')
          .eq('user_id', user.id)
          .in('action_type', ['generate_routine', 'generate_mesocycle'])
          .gte('created_at', sevenDaysAgo)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (!routineErr && recentRoutine) {
          const lastDate = new Date(recentRoutine.created_at)
          const daysElapsed = (now.getTime() - lastDate.getTime()) / (24 * 60 * 60 * 1000)
          const daysRemaining = Math.max(1, Math.ceil(7 - daysElapsed))

          return new Response(
            JSON.stringify({
              error: `Límite semanal alcanzado. Podrás generar una nueva rutina con IA en ${daysRemaining} día(s).`,
              code: 'RATE_LIMIT_WEEKLY_ROUTINE',
              daysRemaining,
            }),
            {
              status: 429,
              headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
            }
          )
        }
      }
    }

    // 4. API Key de Anthropic Custodiada en el Servidor
    const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'Servidor no configurado: Falta ANTHROPIC_API_KEY en Supabase secrets.' }),
        { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      )
    }

    const candidate = modelTier === 'sonnet' ? 'claude-sonnet-5' : 'claude-haiku-4-5-20251001'

    const payload: Record<string, any> = {
      model: candidate,
      max_tokens: maxTokens,
      system,
      messages,
      temperature,
    }

    if (tools && tools.length > 0) {
      payload.tools = tools
      if (toolChoice) {
        payload.tool_choice = toolChoice
      }
    }

    const anthropicRes = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': ANTHROPIC_VERSION,
      },
      body: JSON.stringify(payload),
    })

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text()
      return new Response(
        JSON.stringify({ error: `Anthropic API Error (${anthropicRes.status}): ${errText}` }),
        { status: anthropicRes.status, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      )
    }

    const data = await anthropicRes.json()
    const latencyMs = Date.now() - startTime

    const toolUseBlock = data.content?.find((c: any) => c.type === 'tool_use')
    let text = ''
    let toolUseData: { name: string; input: any } | undefined

    if (toolUseBlock && toolUseBlock.input) {
      text = typeof toolUseBlock.input === 'string' ? toolUseBlock.input : JSON.stringify(toolUseBlock.input)
      toolUseData = {
        name: toolUseBlock.name || '',
        input: toolUseBlock.input,
      }
    } else {
      text = data.content?.find((c: any) => c.type === 'text')?.text || data.content?.[0]?.text || ''
    }

    const inputTokens = data.usage?.input_tokens || 0
    const outputTokens = data.usage?.output_tokens || 0
    const cacheCreationTokens = data.usage?.cache_creation_input_tokens || 0
    const cacheReadTokens = data.usage?.cache_read_input_tokens || 0

    const pricing = modelTier === 'sonnet' ? PRICING.sonnet : PRICING.haiku
    const cost =
      (inputTokens / 1000000) * pricing.input +
      (outputTokens / 1000000) * pricing.output +
      (cacheCreationTokens / 1000000) * pricing.cacheWrite +
      (cacheReadTokens / 1000000) * pricing.cacheRead

    // 5. REGISTRAR AUDITORÍA EN BD
    await supabase.from('ai_usage_log').insert({
      user_id: user.id,
      function_name: actionType,
      action_type: actionType,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      cost_usd: cost,
      model_used: candidate,
    })

    return new Response(
      JSON.stringify({
        text,
        metrics: {
          inputTokens,
          outputTokens,
          cacheCreationTokens,
          cacheReadTokens,
          estimatedCostUsd: cost,
          latencyMs,
          modelUsed: candidate,
          fromLocalCache: false,
        },
        toolUse: toolUseData,
      }),
      { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message || 'Error interno en ai-proxy' }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    )
  }
})
