// src/components/dashboard/Dashboard.tsx
import { useRef, useState } from 'react'
import { Radio, Save, FolderOpen, LogOut, Settings } from 'lucide-react'
import { useAppStore } from '@/store'
import { useAuth } from '@/hooks/useAuth'
import { saveAll, loadAll } from '@/lib/firestore'
import { searchEvents } from '@/lib/ai'
import ToastContainer, { toast } from '@/components/shared/Toast'
import InterestFilterPanel from './InterestFilterPanel'
import ManualEventForm from '@/components/events/ManualEventForm'
import EventCalendar from '@/components/calendar/EventCalendar'
import EventTable from '@/components/events/EventTable'
import AiSettingsModal from './AiSettingsModal'
import LoadingSpinner from '@/components/shared/LoadingSpinner'
import { v4 as uuidv4 } from 'uuid'
import type { BroadEvent } from '@/types'

export default function Dashboard() {
  // ✅ 개별 selector — 불필요한 리렌더 방지 + 참조 안정성
  const user        = useAppStore((s) => s.user)
  const filter      = useAppStore((s) => s.filter)
  const events      = useAppStore((s) => s.events)
  const isSearching = useAppStore((s) => s.isSearching)
  const isSaving    = useAppStore((s) => s.isSaving)
  const setEvents   = useAppStore((s) => s.setEvents)
  const setFilter   = useAppStore((s) => s.setFilter)
  const setSearching = useAppStore((s) => s.setSearching)
  const setSaving    = useAppStore((s) => s.setSaving)

  const { signOut } = useAuth()
  const [aiOpen, setAiOpen] = useState(false)
  const tableRef = useRef<HTMLDivElement>(null)

  // ── AI 검색 ──────────────────────────────────────────────────────────────
  async function handleSearch() {
    const activeTypes = [...filter.eventTypes, filter.eventTypeCustom].filter(Boolean)
    if (!activeTypes.length) {
      toast.error('행사 유형(③행)을 하나 이상 선택해 주세요.')
      return
    }
    setSearching(true)
    try {
      const results = await searchEvents(filter)
      const newEvents: BroadEvent[] = results.map((r) => ({
        id:        uuidv4(),
        name:      r.name      || '(제목 없음)',
        startDate: r.startDate || '',
        endDate:   r.endDate   || '',
        location:  r.location  || '',
        url:       r.url       || '',
        country:   (r.country === 'international' ? 'international' : 'domestic') as 'domestic' | 'international',
        source:    'ai_search' as const,
        createdAt: new Date().toISOString(),
      }))
      setEvents(newEvents)
      toast.success(`행사 ${newEvents.length}건을 검색했습니다.`)
    } catch (e) {
      toast.error('검색 실패: ' + (e instanceof Error ? e.message : '알 수 없는 오류'))
    } finally {
      setSearching(false)
    }
  }

  // ── 저장 ──────────────────────────────────────────────────────────────────
  async function handleSave() {
    if (!user) return
    setSaving(true)
    try {
      await saveAll(user.uid, filter, events)
      toast.success('저장 완료.')
    } catch (e) {
      toast.error('저장 실패: ' + (e instanceof Error ? e.message : '오류'))
    } finally { setSaving(false) }
  }

  // ── 불러오기 ───────────────────────────────────────────────────────────────
  async function handleLoad() {
    if (!user) return
    setSaving(true)
    try {
      const { interests, events: loaded } = await loadAll(user.uid)
      if (interests) setFilter(interests)
      setEvents(loaded)
      toast.success(`불러오기 완료 — 행사 ${loaded.length}건.`)
    } catch (e) {
      toast.error('불러오기 실패: ' + (e instanceof Error ? e.message : '오류'))
    } finally { setSaving(false) }
  }

  if (!user) return <LoadingSpinner fullscreen label="로딩 중…" />

  return (
    <div className="min-h-screen bg-[#f0f4fb]">

      {/* ── 상단 네비게이션 ─────────────────────────────────────────────── */}
      <header className="bg-navy-600 text-white sticky top-0 z-30 shadow-lg">
        <div className="max-w-[1440px] mx-auto px-4 h-14 flex items-center gap-3">
          {/* 로고 */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0">
              <Radio className="w-4 h-4 text-white" />
            </div>
            <div className="hidden sm:block leading-tight">
              <p className="text-[10px] text-white/50 font-medium tracking-widest uppercase">BroadEvent</p>
              <p className="text-sm font-bold -mt-0.5">방송 행사 자동 알리미</p>
            </div>
          </div>

          <div className="flex-1" />

          {/* 상단 버튼들 */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleSave} disabled={isSaving}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-40 text-xs font-semibold transition-colors"
            >
              {isSaving
                ? <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <Save className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">저장</span>
            </button>

            <button
              onClick={handleLoad} disabled={isSaving}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-40 text-xs font-semibold transition-colors"
            >
              <FolderOpen className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">불러오기</span>
            </button>

            <button
              onClick={() => setAiOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold transition-colors"
              title="AI 공급자 설정"
            >
              <Settings className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">AI 설정</span>
            </button>

            <div className="w-px h-5 bg-white/20 mx-1" />

            <span className="text-xs text-white/50 hidden md:block max-w-[160px] truncate">
              {user.name || user.email}
            </span>

            <button
              onClick={signOut}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-red-500/70 text-xs font-semibold transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">로그아웃</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── 본문 ─────────────────────────────────────────────────────────── */}
      <main className="max-w-[1440px] mx-auto px-4 py-6 space-y-5">

        <Section num="①②" label="관심 분야 / 검색 필터">
          <InterestFilterPanel onSearch={handleSearch} searching={isSearching} />
        </Section>

        <Section num="⑤⑥" label="행사 직접 입력 / 이미지 OCR">
          <ManualEventForm />
        </Section>

        <Section num="③" label="월별 달력">
          <EventCalendar
            onEventClick={() => tableRef.current?.scrollIntoView({ behavior: 'smooth' })}
          />
        </Section>

        <Section num="④" label={`행사별 내역${events.length ? ` (${events.length}건)` : ''}`}>
          <div ref={tableRef}>
            <EventTable
              uid={user.uid}
              onEventHighlight={() => tableRef.current?.scrollIntoView({ behavior: 'smooth' })}
            />
          </div>
        </Section>

      </main>

      {/* AI 검색 오버레이 */}
      {isSearching && (
        <div className="loading-overlay">
          <div className="bg-white rounded-2xl px-10 py-8 shadow-2xl flex flex-col items-center gap-5">
            <div className="w-14 h-14 border-4 border-navy-100 border-t-navy-500 rounded-full animate-spin" />
            <div className="text-center">
              <p className="text-base font-bold text-navy-600">AI 행사 검색 중</p>
              <p className="text-xs text-gray-400 mt-1">3단계 계층 검색을 실행하고 있습니다…</p>
              <p className="text-xs text-gray-300 mt-0.5">최대 30초 소요될 수 있습니다</p>
            </div>
          </div>
        </div>
      )}

      <AiSettingsModal open={aiOpen} onClose={() => setAiOpen(false)} />
      <ToastContainer />
    </div>
  )
}

function Section({ num, label, children }: { num: string; label: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="flex items-center gap-2 mb-2">
        <span className="inline-flex items-center justify-center min-w-[28px] h-7 px-1.5 rounded-lg bg-navy-500 text-white text-xs font-bold">
          {num}
        </span>
        <h2 className="text-sm font-bold text-navy-700">{label}</h2>
      </div>
      {children}
    </section>
  )
}
