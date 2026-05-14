// worker/index.js
// Cloudflare Worker — AI Proxy
// ─────────────────────────────────────────────────────────────────────────────
// Handles all AI API calls server-side so API keys are never exposed to the browser.
// Deploy: wrangler deploy
//
// Environment secrets (set via `wrangler secret put`):
//   OPENAI_API_KEY   — for Codex/GPT-4o
//   CLAUDE_API_KEY   — for Anthropic Claude
//   AI_PROVIDER      — "codex" | "claude"  (default: "codex")
//   AI_MODEL         — override default model
//   ALLOWED_ORIGIN   — your frontend domain e.g. https://broadevent.pages.dev
// ─────────────────────────────────────────────────────────────────────────────

const CORS_HEADERS = (origin) => ({
  'Access-Control-Allow-Origin': origin || '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
})

function corsResponse(body, status, origin) {
  return new Response(body, {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS(origin) },
  })
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || ''
    const allowed = env.ALLOWED_ORIGIN || ''
    if (allowed && origin && origin !== allowed) {
      return corsResponse(JSON.stringify({ error: 'Forbidden' }), 403, null)
    }

    // Preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS(origin) })
    }

    const url = new URL(request.url)
    const provider = env.AI_PROVIDER || 'codex'

    try {
      if (url.pathname === '/ai') {
        const body = await request.json()
        const { messages, useWebSearch, maxTokens, model } = body
        const finalModel = model || env.AI_MODEL || (provider === 'claude' ? 'claude-sonnet-4-20250514' : 'gpt-4o')

        let text
        if (provider === 'claude') {
          text = await callClaude(env.CLAUDE_API_KEY, finalModel, messages, useWebSearch, maxTokens)
        } else {
          text = await callCodex(env.OPENAI_API_KEY, finalModel, messages, useWebSearch, maxTokens)
        }
        return corsResponse(JSON.stringify({ text }), 200, origin)
      }

      if (url.pathname === '/ai/vision') {
        const body = await request.json()
        const { base64, mimeType, systemPrompt } = body
        const finalModel = env.AI_MODEL || (provider === 'claude' ? 'claude-sonnet-4-20250514' : 'gpt-4o')
        let text
        if (provider === 'claude') {
          text = await callClaudeVision(env.CLAUDE_API_KEY, finalModel, base64, mimeType, systemPrompt)
        } else {
          text = await callCodexVision(env.OPENAI_API_KEY, finalModel, base64, mimeType, systemPrompt)
        }
        return corsResponse(JSON.stringify({ text }), 200, origin)
      }

      return corsResponse(JSON.stringify({ error: 'Not found' }), 404, origin)
    } catch (err) {
      return corsResponse(JSON.stringify({ error: err.message }), 500, origin)
    }
  },
}

// ── OpenAI Codex/GPT-4o ──────────────────────────────────────────────────
async function callCodex(apiKey, model, messages, useWebSearch, maxTokens = 4096) {
  if (useWebSearch) {
    const system = messages.find((m) => m.role === 'system')
    const userMsgs = messages.filter((m) => m.role !== 'system')
    const inputText = userMsgs.map((m) => (typeof m.content === 'string' ? m.content : '')).join('\n')
    const resp = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        tools: [{ type: 'web_search_preview' }],
        instructions: system?.content || undefined,
        input: inputText,
        max_output_tokens: maxTokens,
      }),
    })
    const data = await resp.json()
    return data.output_text || ''
  }

  const resp = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, max_tokens: maxTokens, messages }),
  })
  const data = await resp.json()
  return data.choices?.[0]?.message?.content || ''
}

async function callCodexVision(apiKey, model, base64, mimeType, systemPrompt) {
  const resp = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      max_tokens: 1024,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: [
          { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64}` } },
          { type: 'text', text: 'Extract event details from this screenshot and return JSON.' },
        ]},
      ],
    }),
  })
  const data = await resp.json()
  return data.choices?.[0]?.message?.content || ''
}

// ── Anthropic Claude ──────────────────────────────────────────────────────
async function callClaude(apiKey, model, messages, useWebSearch, maxTokens = 4096) {
  const system = messages.find((m) => m.role === 'system')
  const rest   = messages.filter((m) => m.role !== 'system')
  const body = {
    model, max_tokens: maxTokens,
    messages: rest,
    ...(system ? { system: system.content } : {}),
    ...(useWebSearch ? { tools: [{ type: 'web_search_20250305', name: 'web_search' }] } : {}),
  }
  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-beta': 'web-search-2025-03-05',
    },
    body: JSON.stringify(body),
  })
  const data = await resp.json()
  return (data.content || []).filter((c) => c.type === 'text').map((c) => c.text).join('\n')
}

async function callClaudeVision(apiKey, model, base64, mimeType, systemPrompt) {
  const body = {
    model, max_tokens: 1024,
    system: systemPrompt,
    messages: [{
      role: 'user',
      content: [
        { type: 'image', source: { type: 'base64', media_type: mimeType, data: base64 } },
        { type: 'text', text: 'Extract event details from this screenshot and return JSON.' },
      ],
    }],
  }
  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(body),
  })
  const data = await resp.json()
  return (data.content || []).map((c) => c.text || '').join('')
}
