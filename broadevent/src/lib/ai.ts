// src/lib/ai.ts
// ─────────────────────────────────────────────────────────────────────────────
// AI Provider Abstraction Layer — 무료/저비용 한도 최적화 버전
//
// 모델 선택 가이드 (비용 순):
//   gpt-4o-mini  → 가장 저렴, 무료 한도에 적합 ← 기본값
//   gpt-4o       → 고품질, 유료 (월 $5 이상 크레딧 필요)
//   claude-haiku → Anthropic 저비용 옵션
//
// .env 설정:
//   VITE_AI_MODEL=gpt-4o-mini  ← 무료/저비용 운영 시
//   VITE_AI_MODEL=gpt-4o       ← 고품질 원할 때
// ─────────────────────────────────────────────────────────────────────────────
import OpenAI from 'openai'
import type { AiSearchResult, InterestFilter, OcrResult } from '@/types'

export type AiProvider = 'codex' | 'claude' | 'worker'

// ── 무료 한도 최적화: 기본 모델을 gpt-4o-mini로 변경 ──────────────────────
const MODEL_DEFAULTS: Record<AiProvider, string> = {
  codex:  'gpt-4o-mini',   // ← 변경: gpt-4o → gpt-4o-mini (비용 약 20분의 1)
  claude: 'claude-haiku-4-5',  // ← 변경: Sonnet → Haiku (저비용)
  worker: 'gpt-4o-mini',
}

function resolveProvider(): AiProvider {
  return (
    (localStorage.getItem('ai_provider') as AiProvider | null) ||
    (import.meta.env.VITE_AI_PROVIDER as AiProvider | undefined) ||
    'codex'
  )
}
function resolveModel(p: AiProvider): string {
  return (
    localStorage.getItem('ai_model') ||
    import.meta.env.VITE_AI_MODEL ||
    MODEL_DEFAULTS[p]
  )
}

const OPENAI_KEY = () => import.meta.env.VITE_OPENAI_API_KEY || ''
const CLAUDE_KEY = () => import.meta.env.VITE_CLAUDE_API_KEY || ''
const WORKER_URL = () => import.meta.env.VITE_WORKER_URL || ''

let _openai: OpenAI | null = null
function getOpenAI(): OpenAI {
  if (!_openai) _openai = new OpenAI({ apiKey: OPENAI_KEY(), dangerouslyAllowBrowser: true })
  return _openai
}

interface TextPart  { type: 'text'; text: string }
interface ImagePart { type: 'image_url'; image_url: { url: string } }
type ContentPart = TextPart | ImagePart

export interface AiMessage {
  role: 'system' | 'user' | 'assistant'
  content: string | ContentPart[]
}

// ── 재시도 로직 (Rate Limit 429 오류 자동 재시도) ─────────────────────────
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  delayMs = 2000,
): Promise<T> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (e) {
      const isRateLimit =
        e instanceof Error &&
        (e.message.includes('429') ||
         e.message.toLowerCase().includes('rate limit') ||
         e.message.toLowerCase().includes('quota'))
      if (isRateLimit && attempt < maxRetries) {
        const wait = delayMs * attempt  // 2s → 4s → 6s 점진 대기
        console.warn(`[AI] Rate limit, retry ${attempt}/${maxRetries} in ${wait}ms…`)
        await new Promise((r) => setTimeout(r, wait))
        continue
      }
      throw e
    }
  }
  throw new Error('AI 요청 최대 재시도 횟수 초과')
}

// ── 핵심 dispatcher ────────────────────────────────────────────────────────
async function callAI(
  messages: AiMessage[],
  opts: { useWebSearch?: boolean; maxTokens?: number } = {},
): Promise<string> {
  const provider   = resolveProvider()
  const model      = resolveModel(provider)
  // 토큰 절약: 기본값을 2048로 낮춤 (검색에는 충분, 비용 절감)
  const maxTokens  = opts.maxTokens ?? 2048
  const useWebSearch = opts.useWebSearch ?? false

  return withRetry(() => {
    if (provider === 'worker' && WORKER_URL()) return callWorker(messages, useWebSearch, maxTokens, model)
    if (provider === 'claude' && CLAUDE_KEY()) return callClaude(messages, useWebSearch, maxTokens, model)
    return callCodex(messages, useWebSearch, maxTokens, model)
  })
}

// ── OpenAI GPT-4o / gpt-4o-mini ───────────────────────────────────────────
async function callCodex(
  messages: AiMessage[], useWebSearch: boolean, maxTokens: number, model: string,
): Promise<string> {
  const client = getOpenAI()

  // gpt-4o-mini는 Responses API(web_search) 지원 여부 불확실 → Chat으로 폴백
  if (useWebSearch && (model === 'gpt-4o' || model === 'o3')) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const responsesApi = (client as any).responses
    if (responsesApi) {
      const systemMsg = messages.find((m) => m.role === 'system')
      const userText  = messages
        .filter((m) => m.role !== 'system')
        .map((m) => typeof m.content === 'string' ? m.content : (m.content as ContentPart[]).map((p) => ('text' in p ? p.text : '')).join('\n'))
        .join('\n')
      const resp = await responsesApi.create({
        model,
        tools: [{ type: 'web_search_preview' }],
        ...(systemMsg ? { instructions: typeof systemMsg.content === 'string' ? systemMsg.content : '' } : {}),
        input: userText,
        max_output_tokens: maxTokens,
      })
      return resp.output_text || ''
    }
  }

  // gpt-4o-mini or 폴백: 일반 Chat Completions
  const chatMsgs = messages.map((m) => ({
    role:    m.role as 'system' | 'user' | 'assistant',
    content: typeof m.content === 'string' ? m.content : (m.content as ContentPart[]).map((p) => ('text' in p ? p.text : '')).join('\n'),
  }))
  const completion = await client.chat.completions.create({
    model, max_tokens: maxTokens, messages: chatMsgs,
  })
  return completion.choices[0]?.message?.content || ''
}

// ── Anthropic Claude ────────────────────────────────────────────────────────
async function callClaude(
  messages: AiMessage[], useWebSearch: boolean, maxTokens: number, model: string,
): Promise<string> {
  const system = messages.find((m) => m.role === 'system')
  const rest   = messages.filter((m) => m.role !== 'system')
  const body: Record<string, unknown> = {
    model, max_tokens: maxTokens,
    messages: rest.map((m) => ({ role: m.role, content: m.content })),
  }
  if (system) body.system = system.content
  if (useWebSearch) body.tools = [{ type: 'web_search_20250305', name: 'web_search' }]
  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': CLAUDE_KEY(),
      'anthropic-version': '2023-06-01',
      'anthropic-beta': 'web-search-2025-03-05',
    },
    body: JSON.stringify(body),
  })
  if (!resp.ok) {
    const errText = await resp.text()
    throw new Error(`Claude ${resp.status}: ${errText}`)
  }
  const data = await resp.json()
  return (data.content as { type: string; text?: string }[])
    .filter((c) => c.type === 'text' && c.text).map((c) => c.text!).join('\n')
}

// ── Cloudflare Worker ────────────────────────────────────────────────────────
async function callWorker(
  messages: AiMessage[], useWebSearch: boolean, maxTokens: number, model: string,
): Promise<string> {
  const resp = await fetch(`${WORKER_URL()}/ai`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, useWebSearch, maxTokens, model }),
  })
  if (!resp.ok) throw new Error(`Worker ${resp.status}: ${await resp.text()}`)
  const data = await resp.json()
  return data.text || ''
}

// ── JSON 파싱 ────────────────────────────────────────────────────────────────
export function parseJsonArray<T>(raw: string): T[] {
  try {
    const clean = raw.replace(/```json\s*/g, '').replace(/```/g, '').trim()
    const match = clean.match(/\[[\s\S]*\]/)
    if (!match) return []
    return JSON.parse(match[0]) as T[]
  } catch { return [] }
}
export function parseJsonObject<T>(raw: string): T {
  const clean = raw.replace(/```json\s*/g, '').replace(/```/g, '').trim()
  const match = clean.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('AI 응답에서 JSON을 찾을 수 없습니다')
  return JSON.parse(match[0]) as T
}

function buildPeriod(f: InterestFilter): string {
  const today = new Date().toISOString().split('T')[0]
  if (f.period === 'custom' && f.customStart && f.customEnd) return `${f.customStart} ~ ${f.customEnd}`
  const end = new Date()
  if (f.period === '3m') end.setMonth(end.getMonth() + 3)
  else if (f.period === '6m') end.setMonth(end.getMonth() + 6)
  else end.setFullYear(end.getFullYear() + 1)
  return `${today} ~ ${end.toISOString().split('T')[0]}`
}

// ════════════════════════════════════════════════════════════════════════════
// 공개 API — 각 함수별 토큰 최적화 적용
// ════════════════════════════════════════════════════════════════════════════

// ① 행사 검색 — 토큰 절약: 최대 30건으로 제한, 프롬프트 압축
export async function searchEvents(filter: InterestFilter): Promise<AiSearchResult[]> {
  const period = buildPeriod(filter)
  const row3   = [...filter.eventTypes, filter.eventTypeCustom].filter(Boolean).join('|')
  const row2   = [...filter.orgs, filter.orgCustom].filter(Boolean).join('|')
  const row1   = filter.regions.includes('all') ? '전체' :
    filter.regions.map((r) => r === 'domestic' ? '국내' : '해외').join('|')

  // 프롬프트를 최대한 짧게 — 토큰 소모 절감
  const system = `방송 업계 행사 조사 전문가. 다음 조건으로 행사를 검색하라.
검색 순서(좁혀가기): [1단계 유형: ${row3}] → [2단계 기관: ${row2}] → [3단계 지역: ${row1}]
기간: ${period}
${filter.keyword ? `키워드: ${filter.keyword}` : ''}
JSON 배열만 반환(마크다운 금지). 각 항목:
name,startDate(YYYY-MM-DD),endDate,location,url,country(domestic|international),summary(50자 이내)
최대 20건.`  // ← 30→20건으로 줄여 토큰 절약

  const raw = await callAI(
    [
      { role: 'system', content: system },
      { role: 'user',   content: '행사 검색 후 JSON 배열을 반환하라.' },
    ],
    { useWebSearch: true, maxTokens: 2000 },  // ← 4096→2000 절약
  )
  return parseJsonArray<AiSearchResult>(raw)
}

// ② 이미지 OCR — 토큰 적게 필요
export async function extractEventFromImage(base64: string, mimeType: string): Promise<OcrResult> {
  const system = `스크린샷에서 행사 정보 추출. JSON 객체만 반환(마크다운 금지).
필드: name,startDate(YYYY-MM-DD or ""),endDate(YYYY-MM-DD or ""),location,url,country(domestic|international|"")`

  const provider = resolveProvider()

  if (provider === 'claude' && CLAUDE_KEY()) {
    const raw = await callClaudeVision(base64, mimeType, system)
    return parseJsonObject<OcrResult>(raw)
  }
  if (provider === 'worker' && WORKER_URL()) {
    const resp = await fetch(`${WORKER_URL()}/ai/vision`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ base64, mimeType, systemPrompt: system }),
    })
    const data = await resp.json()
    return parseJsonObject<OcrResult>(data.text || '{}')
  }

  // GPT-4o Vision (gpt-4o-mini도 vision 지원)
  const dataUrl = `data:${mimeType};base64,${base64}`
  const raw = await callAI([
    { role: 'system', content: system },
    { role: 'user', content: [
      { type: 'image_url', image_url: { url: dataUrl } },
      { type: 'text', text: '행사 정보를 추출하여 JSON을 반환하라.' },
    ]},
  ], { maxTokens: 512 })  // ← OCR은 512로 충분
  return parseJsonObject<OcrResult>(raw)
}

async function callClaudeVision(base64: string, mimeType: string, systemPrompt: string): Promise<string> {
  const model = resolveModel('claude')
  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': CLAUDE_KEY(), 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model, max_tokens: 512, system: systemPrompt,
      messages: [{ role: 'user', content: [
        { type: 'image', source: { type: 'base64', media_type: mimeType, data: base64 } },
        { type: 'text', text: '행사 정보를 추출하여 JSON을 반환하라.' },
      ]}],
    }),
  })
  const data = await resp.json()
  return (data.content as { type: string; text?: string }[]).map((c) => c.text || '').join('')
}

// ③ 기사 요약 — 간결한 프롬프트
export async function fetchNewsSummary(eventName: string, eventUrl: string): Promise<string> {
  return callAI([
    { role: 'system', content: `방송 업계 분석가. 행사 관련 기사를 검색해 한국어 요약 보고서를 작성하라.
형식(## 헤딩):
## 배경
## 주요 내용
## 반응 및 언론 보도
## 시사점
간결하고 전문적으로.` },
    { role: 'user', content: `행사: "${eventName}" / 홈페이지: ${eventUrl || '미제공'}` },
  ], { useWebSearch: true, maxTokens: 1500 })  // ← 3000→1500 절약
}

// ④ 세미나 보고서 — 분량 조절로 토큰 절약
export async function generateSeminarReport(params: {
  eventName: string; homepageDescUrl: string; paperFileName: string
  meetingResultFileName: string; photoCount: number; overallComments: string
  customRequirements: string; titleFontSize: number; subtitleFontSize: number
  bodyFontSize: number; totalPages: number
}): Promise<string> {
  // 페이지 수에 따라 maxTokens 동적 조정 (절약)
  const tokensForPages = Math.min(params.totalPages * 800, 5000)

  return callAI([
    { role: 'system', content: `한국 방송사 보고서 작성자. 세미나 결과 보고서를 한국어로 작성하라(## 헤딩).
## 1. 행사 개요
## 2. 주요 발표 및 토의
## 3. 핵심 사항
## 4. 개선 사항
## 5. 시사점
## 6. 결론
형식: 제목 ${params.titleFontSize}pt / 소제목 ${params.subtitleFontSize}pt / 본문 ${params.bodyFontSize}pt / 목표 ${params.totalPages}p
${params.customRequirements ? `요구사항: ${params.customRequirements}` : ''}` },
    { role: 'user', content: `행사: "${params.eventName}"
URL: ${params.homepageDescUrl || '없음'}
발제문: ${params.paperFileName || '없음'}
회의결과: ${params.meetingResultFileName || '없음'}
사진: ${params.photoCount}장
총평: ${params.overallComments || '없음'}` },
  ], { useWebSearch: true, maxTokens: tokensForPages })
}

// ⑤ 전시회 보고서 — 부스 수에 따라 토큰 조정
export async function generateExhibitionReport(params: {
  eventName: string; homepageDescUrl: string
  booths: { companyName: string; consultationNotes: string; keyPoints: string }[]
  overallComments: string; customRequirements: string
  titleFontSize: number; subtitleFontSize: number; bodyFontSize: number; totalPages: number
}): Promise<string> {
  const boothCount    = params.booths.filter((b) => b.companyName.trim()).length
  const tokensNeeded  = Math.min((boothCount * 400) + (params.totalPages * 600), 5000)

  const boothList = params.booths
    .filter((b) => b.companyName.trim())
    .map((b, i) => `부스${i + 1}: ${b.companyName} / 상담: ${b.consultationNotes || '없음'} / 포인트: ${b.keyPoints || '없음'}`)
    .join('\n') || '없음'

  return callAI([
    { role: 'system', content: `한국 방송사 보고서 작성자. 전시회 참관 결과를 한국어로 작성하라(## 헤딩).
## 1. 전시회 개요
## 2. 주요 참가 업체 (업체별 ### 소항목)
## 3. 핵심 기술 및 트렌드
## 4. 특이사항
## 5. 개선 사항
## 6. 시사점 및 제언
## 7. 결론
형식: 제목 ${params.titleFontSize}pt / 소제목 ${params.subtitleFontSize}pt / 본문 ${params.bodyFontSize}pt / 목표 ${params.totalPages}p
${params.customRequirements ? `요구사항: ${params.customRequirements}` : ''}` },
    { role: 'user', content: `행사: "${params.eventName}"
URL: ${params.homepageDescUrl || '없음'}
부스 정보:
${boothList}
총평: ${params.overallComments || '없음'}` },
  ], { useWebSearch: true, maxTokens: tokensNeeded })
}
