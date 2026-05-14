// src/lib/ai.ts
// ─────────────────────────────────────────────────────────────────────────────
// AI Provider Abstraction Layer
// Provider 우선순위: localStorage -> VITE_AI_PROVIDER -> 기본값 \'codex\'
// ─────────────────────────────────────────────────────────────────────────────
import OpenAI from \'openai\'
import type { AiSearchResult, InterestFilter, OcrResult } from \'@/types\'

export type AiProvider = \'codex\' | \'claude\' | \'worker\'

const MODEL_DEFAULTS: Record<AiProvider, string> = {
  codex:  \'gpt-4o\',
  claude: \'claude-sonnet-4-20250514\',
  worker: \'gpt-4o\',
}

function resolveProvider(): AiProvider {
  return (
    (localStorage.getItem(\'ai_provider\') as AiProvider | null) ||
    (import.meta.env.VITE_AI_PROVIDER as AiProvider | undefined) ||
    \'codex\'
  )
}
function resolveModel(p: AiProvider): string {
  return (
    localStorage.getItem(\'ai_model\') ||
    import.meta.env.VITE_AI_MODEL ||
    MODEL_DEFAULTS[p]
  )
}

const OPENAI_KEY = () => import.meta.env.VITE_OPENAI_API_KEY || \'\'
const CLAUDE_KEY = () => import.meta.env.VITE_CLAUDE_API_KEY || \'\'
const WORKER_URL = () => import.meta.env.VITE_WORKER_URL || \'\'

let _openai: OpenAI | null = null
function getOpenAI(): OpenAI {
  if (!_openai) {
    _openai = new OpenAI({ apiKey: OPENAI_KEY(), dangerouslyAllowBrowser: true })
  }
  return _openai
}

// ── 메시지 타입 ────────────────────────────────────────────────────────────
interface TextPart  { type: \'text\';      text: string }
interface ImagePart { type: \'image_url\'; image_url: { url: string } }
type ContentPart = TextPart | ImagePart

export interface AiMessage {
  role: \'system\' | \'user\' | \'assistant\'
  content: string | ContentPart[]
}

// ── 공급자별 호출 ──────────────────────────────────────────────────────────
async function callAI(
  messages: AiMessage[],
  opts: { useWebSearch?: boolean; maxTokens?: number } = {},
): Promise<string> {
  const provider = resolveProvider()
  const model    = resolveModel(provider)
  const { useWebSearch = false, maxTokens = 4096 } = opts

  if (provider === \'worker\' && WORKER_URL()) return callWorker(messages, useWebSearch, maxTokens, model)
  if (provider === \'claude\' && CLAUDE_KEY()) return callClaude(messages, useWebSearch, maxTokens, model)
  return callCodex(messages, useWebSearch, maxTokens, model)
}

// ── OpenAI GPT-4o ──────────────────────────────────────────────────────────
async function callCodex(
  messages: AiMessage[],
  useWebSearch: boolean,
  maxTokens: number,
  model: string,
): Promise<string> {
  const client = getOpenAI()

  if (useWebSearch) {
    // Responses API (web_search_preview 지원)
    const systemMsg  = messages.find((m) => m.role === \'system\')
    const userText   = messages
      .filter((m) => m.role !== \'system\')
      .map((m) => typeof m.content === \'string\' ? m.content : (m.content as ContentPart[]).map((p) => (\'text\' in p ? p.text : \'\')).join(\'\\n\'))
      .join(\'\\n\')

    // openai v4 Responses API — any 캐스팅으로 타입 문제 우회
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const responsesApi = (client as any).responses
    if (!responsesApi) {
      // Responses API 없을 경우 일반 Chat으로 폴백 (웹검색 없이)
      console.warn(\'Responses API not available, falling back to chat completions (no web search)\')
      return callCodexChat(client, messages, maxTokens, model)
    }

    const resp = await responsesApi.create({
      model,
      tools: [{ type: \'web_search_preview\' }],
      ...(systemMsg ? { instructions: typeof systemMsg.content === \'string\' ? systemMsg.content : \'\' } : {}),
      input: userText,
      max_output_tokens: maxTokens,
    })
    return resp.output_text || \'\'
  }

  return callCodexChat(client, messages, maxTokens, model)
}

async function callCodexChat(
  client: OpenAI,
  messages: AiMessage[],
  maxTokens: number,
  model: string,
): Promise<string> {
  const chatMsgs = messages.map((m) => ({
    role:    m.role as \'system\' | \'user\' | \'assistant\',
    content: m.content as string,
  }))
  const completion = await client.chat.completions.create({
    model, max_tokens: maxTokens, messages: chatMsgs,
  })
  return completion.choices[0]?.message?.content || \'\'
}

// ── Anthropic Claude ────────────────────────────────────────────────────────
async function callClaude(
  messages: AiMessage[],
  useWebSearch: boolean,
  maxTokens: number,
  model: string,
): Promise<string> {
  const system = messages.find((m) => m.role === \'system\')
  const rest   = messages.filter((m) => m.role !== \'system\')
  const body: Record<string, unknown> = {
    model, max_tokens: maxTokens,
    messages: rest.map((m) => ({ role: m.role, content: m.content })),
  }
  if (system) body.system = system.content
  if (useWebSearch) body.tools = [{ type: \'web_search_20250305\', name: \'web_search\' }]

  const resp = await fetch(\'https://api.anthropic.com/v1/messages\', {
    method: \'POST\',
    headers: {
      \'Content-Type\': \'application/json\',
      \'x-api-key\': CLAUDE_KEY(),
      \'anthropic-version\': \'2023-06-01\',
      \'anthropic-beta\': \'web-search-2025-03-05\',
    },
    body: JSON.stringify(body),
  })
  if (!resp.ok) throw new Error(`Claude ${resp.status}: ${await resp.text()}`)
  const data = await resp.json()
  return (data.content as { type: string; text?: string }[])
    .filter((c) => c.type === \'text\' && c.text).map((c) => c.text!).join(\'\\n\')
}

// ── Cloudflare Worker ───────────────────────────────────────────────────────
async function callWorker(
  messages: AiMessage[], useWebSearch: boolean, maxTokens: number, model: string,
): Promise<string> {
  const resp = await fetch(`${WORKER_URL()}/ai`, {
    method: \'POST\',
    headers: { \'Content-Type\': \'application/json\' },
    body: JSON.stringify({ messages, useWebSearch, maxTokens, model }),
  })
  if (!resp.ok) throw new Error(`Worker ${resp.status}: ${await resp.text()}`)
  const data = await resp.json()
  return data.text || \'\'
}

// ── JSON 파싱 헬퍼 ──────────────────────────────────────────────────────────
export function parseJsonArray<T>(raw: string): T[] {
  try {
    const clean = raw.replace(/```json\\s*/g, \'\').replace(/```/g, \'\').trim()
    const match = clean.match(/\[[\s\S]*\]/)
    if (!match) return []
    return JSON.parse(match[0]) as T[]
  } catch { return [] }
}
export function parseJsonObject<T>(raw: string): T {
  const clean = raw.replace(/```json\\s*/g, \'\').replace(/```/g, \'\').trim()
  const match = clean.match(/\{[\s\S]*\}/)
  if (!match) throw new Error(\'AI 응답에서 JSON을 찾을 수 없습니다\')
  return JSON.parse(match[0]) as T
}

function buildPeriod(f: InterestFilter): string {
  const today = new Date().toISOString().split(\'T\')[0]
  if (f.period === \'custom\' && f.customStart && f.customEnd) return `${f.customStart} ~ ${f.customEnd}`
  const end = new Date()
  if (f.period === \'3m\') end.setMonth(end.getMonth() + 3)
  else if (f.period === \'6m\') end.setMonth(end.getMonth() + 6)
  else end.setFullYear(end.getFullYear() + 1)
  return `${today} ~ ${end.toISOString().split(\'T\')[0]}`
}

// ═══════════════════════════════════════════════════════════════════════════
// 공개 API
// ═══════════════════════════════════════════════════════════════════════════

// ① 3단계 계층 행사 검색
export async function searchEvents(filter: InterestFilter): Promise<AiSearchResult[]> {
  const period = buildPeriod(filter)
  const row3   = [...filter.eventTypes, filter.eventTypeCustom].filter(Boolean).join(\' OR \')
  const row2   = [...filter.orgs, filter.orgCustom].filter(Boolean).join(\' OR \')
  const row1   = filter.regions.includes(\'all\')
    ? \'지역 제한 없음\'
    : filter.regions.map((r) => r === \'domestic\' ? \'한국(국내)\' : \'해외\').join(\' OR \')

  const system = `당신은 방송 업계 행사 조사 전문가입니다.
아래 3단계 계층 검색을 수행하세요 (각 단계는 이전 결과를 좁힘):
  1단계 — 행사 유형 (OR): ${row3}
  2단계 — 주관 기관/분야 (OR): ${row2}
  3단계 — 지역 (OR): ${row1}
검색 기간: ${period}
${filter.keyword ? `추가 키워드: \"${filter.keyword}\"` : \'\'}

반드시 유효한 JSON 배열만 반환하세요 (마크다운 코드블록 금지).
각 항목의 필드:
  name (string), startDate (YYYY-MM-DD), endDate (YYYY-MM-DD),
  location (string), url (string), country (\"domestic\"|\"international\"), summary (string, 80자 이내)
최대 50건.`

  const raw = await callAI(
    [
      { role: \'system\', content: system },
      { role: \'user\',   content: \'행사 검색을 실행하고 JSON 배열을 반환하세요.\' },
    ],
    { useWebSearch: true },
  )
  return parseJsonArray<AiSearchResult>(raw)
}

// ② 이미지 OCR
export async function extractEventFromImage(base64: string, mimeType: string): Promise<OcrResult> {
  const system = `당신은 행사 웹사이트 스크린샷에서 행사 정보를 추출하는 OCR 도우미입니다.
반드시 유효한 JSON 객체만 반환하세요 (마크다운 코드블록 금지).
필수 필드 (모두 string):
  name, startDate (YYYY-MM-DD 또는 \"\"), endDate (YYYY-MM-DD 또는 \"\"),
  location, url, country (\"domestic\" | \"international\" | \"\")`

  const provider = resolveProvider()

  if (provider === \'claude\' && CLAUDE_KEY()) {
    const raw = await callClaudeVision(base64, mimeType, system)
    return parseJsonObject<OcrResult>(raw)
  }
  if (provider === \'worker\' && WORKER_URL()) {
    const resp = await fetch(`${WORKER_URL()}/ai/vision`, {
      method: \'POST\',
      headers: { \'Content-Type\': \'application/json\' },
      body: JSON.stringify({ base64, mimeType, systemPrompt: system }),
    })
    const data = await resp.json()
    return parseJsonObject<OcrResult>(data.text || \'{}\')
  }

  // GPT-4o Vision
  const dataUrl = `data:${mimeType};base64,${base64}`
  const raw = await callAI([
    { role: \'system\', content: system },
    { role: \'user\', content: [
      { type: \'image_url\', image_url: { url: dataUrl } },
      { type: \'text\', text: \'이 스크린샷에서 행사 정보를 추출하여 JSON을 반환하세요.\' },
    ]},
  ])
  return parseJsonObject<OcrResult>(raw)
}

async function callClaudeVision(base64: string, mimeType: string, systemPrompt: string): Promise<string> {
  const model = resolveModel(\'claude\')
  const resp = await fetch(\'https://api.anthropic.com/v1/messages\', {
    method: \'POST\',
    headers: { \'Content-Type\': \'application/json\', \'x-api-key\': CLAUDE_KEY(), \'anthropic-version\': \'2023-06-01\' },
    body: JSON.stringify({
      model, max_tokens: 1024, system: systemPrompt,
      messages: [{ role: \'user\', content: [
        { type: \'image\', source: { type: \'base64\', media_type: mimeType, data: base64 } },
        { type: \'text\', text: \'이 스크린샷에서 행사 정보를 추출하여 JSON을 반환하세요.\' },
      ]}],
    }),
  })
  const data = await resp.json()
  return (data.content as { type: string; text?: string }[]).map((c) => c.text || \'\').join(\'\')
}

// ③ 기사 결과 요약
export async function fetchNewsSummary(eventName: string, eventUrl: string): Promise<string> {
  return callAI([
    { role: \'system\', content: `당신은 방송 업계 분석가입니다. 행사 홈페이지와 관련 뉴스 기사를 검색하여 아래 형식의 한국어 요약 보고서를 작성하세요:\n## 배경\n## 주요 내용 및 세션\n## 반응 및 언론 보도\n## 시사점 및 인사이트\n간결하고 전문적으로 작성하세요.` },
    { role: \'user\', content: `행사명: \"${eventName}\"\\n홈페이지: ${eventUrl || \'(미제공)\'}` },
  ], { useWebSearch: true, maxTokens: 3000 })
}

// ④ 세미나 보고서 생성
export async function generateSeminarReport(params: {
  eventName: string; homepageDescUrl: string; paperFileName: string
  meetingResultFileName: string; photoCount: number; overallComments: string
  customRequirements: string; titleFontSize: number; subtitleFontSize: number
  bodyFontSize: number; totalPages: number
}): Promise<string> {
  return callAI([
    { role: \'system\', content: `당신은 한국 방송사 전문 보고서 작성자입니다.
아래 형식의 세미나 참석 결과 보고서를 한국어로 작성하세요 (## 헤딩 사용):
## 1. 행사 개요
## 2. 주요 발표 및 토의 내용
## 3. 핵심 사항 및 특이사항
## 4. 개선 사항
## 5. 시사점 및 전략적 인사이트
## 6. 결론 및 건의사항

MS Word 형식 기준:
  제목: ${params.titleFontSize}pt | 소제목: ${params.subtitleFontSize}pt | 본문: ${params.bodyFontSize}pt
  목표 페이지 수: ${params.totalPages}페이지
${params.customRequirements ? `\\n특별 요구사항:\\n${params.customRequirements}` : \'\'}

완성된 보고서 전문을 작성하세요.` },
    { role: \'user\', content: `행사명: \"${params.eventName}\"
홈페이지 URL: ${params.homepageDescUrl || \'(없음)\'}\n발제문: ${params.paperFileName || \'(없음)\'}\n회의 결과 파일: ${params.meetingResultFileName || \'(없음)\'}\n현장 사진: ${params.photoCount}장
참석자 총평:\n${params.overallComments || \'(없음)\'}` },
  ], { useWebSearch: true, maxTokens: 6000 })
}

// ⑤ 전시회 보고서 생성
export async function generateExhibitionReport(params: {
  eventName: string; homepageDescUrl: string
  booths: { companyName: string; consultationNotes: string; keyPoints: string }[]
  overallComments: string; customRequirements: string
  titleFontSize: number; subtitleFontSize: number; bodyFontSize: number; totalPages: number
}): Promise<string> {
  const boothList = params.booths.filter((b) => b.companyName.trim())
    .map((b, i) => `부스 ${i + 1}: ${b.companyName}\\n  상담 내용: ${b.consultationNotes || \'없음\'}\\n  주요 사항: ${b.keyPoints || \'없음\'}`)
    .join(\'\\n\\n\') || \'(부스 정보 없음)\'

  return callAI([
    { role: \'system\', content: `당신은 한국 방송사 전문 보고서 작성자입니다.
아래 형식의 전시회 참관 결과 보고서를 한국어로 작성하세요 (## 헤딩 사용):
## 1. 전시회 개요
## 2. 주요 참가 업체 현황 (업체별 ### 소항목)
## 3. 핵심 기술 및 트렌드
## 4. 특이사항 및 발견점
## 5. 개선 사항
## 6. 시사점 및 전략적 제언
## 7. 결론

MS Word 형식 기준:
  제목: ${params.titleFontSize}pt | 소제목: ${params.subtitleFontSize}pt | 본문: ${params.bodyFontSize}pt
  목표 페이지 수: ${params.totalPages}페이지
${params.customRequirements ? `\\n특별 요구사항:\\n${params.customRequirements}` : \'\'}

완성된 보고서 전문을 작성하세요.` },
    { role: \'user\', content: `행사명: \"${params.eventName}\"
홈페이지: ${params.homepageDescUrl || \'(없음)\'}\n부스 정보:\n${boothList}

총평:\n${params.overallComments || \'(없음)\'}` },
  ], { useWebSearch: true, maxTokens: 6000 })
}
