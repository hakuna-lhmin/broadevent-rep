// src/components/dashboard/InterestFilterPanel.tsx
import { useAppStore } from '@/store'
import type { InterestFilter, Region, SearchPeriod } from '@/types'

const ROW2_OPTIONS = [
  '방송', '언론', '미디어', '방송광고',
  '방송통신위원회', '과학기술정보방송통신위원회',
  '한국방송학회', '한국언론학회', '한국언론정보학회',
  '한국소통학회', '한국언론법학회',
]
const ROW3_OPTIONS = ['세미나', '토론회', '포럼', '컨퍼런스', '전시회', '박람회']
const PERIODS: { value: SearchPeriod; label: string }[] = [
  { value: '3m', label: '3개월' },
  { value: '6m', label: '6개월' },
  { value: '1y', label: '1년' },
  { value: 'custom', label: '직접 입력' },
]
const REGION_LABELS: Record<Region, string> = {
  domestic: '국내', international: '해외', all: '모두',
}

interface Props { onSearch: () => void; searching: boolean }

export default function InterestFilterPanel({ onSearch, searching }: Props) {
  const { filter, setFilter } = useAppStore((s) => ({ filter: s.filter, setFilter: s.setFilter }))

  function toggleRegion(r: Region) {
    if (r === 'all') { setFilter({ regions: ['all'] }); return }
    const next = filter.regions.includes(r)
      ? filter.regions.filter((x) => x !== r)
      : [...filter.regions.filter((x) => x !== 'all'), r]
    setFilter({ regions: next.length ? next : [r] })
  }
  function toggleOrg(o: string) {
    const next = filter.orgs.includes(o)
      ? filter.orgs.filter((x) => x !== o)
      : [...filter.orgs, o]
    setFilter({ orgs: next })
  }
  function toggleType(t: string) {
    const next = filter.eventTypes.includes(t)
      ? filter.eventTypes.filter((x) => x !== t)
      : [...filter.eventTypes, t]
    setFilter({ eventTypes: next })
  }

  const activeTypes = [...filter.eventTypes, filter.eventTypeCustom].filter(Boolean)

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">

      {/* 기간 선택 */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">검색 기간</span>
        <div className="flex gap-1.5 flex-wrap">
          {PERIODS.map(({ value, label }) => (
            <button key={value} onClick={() => setFilter({ period: value })}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors
                ${filter.period === value
                  ? 'bg-navy-500 text-white border-navy-500'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-navy-400'}`}>
              {label}
            </button>
          ))}
        </div>
        {filter.period === 'custom' && (
          <div className="flex items-center gap-2">
            <input type="date" value={filter.customStart || ''}
              onChange={(e) => setFilter({ customStart: e.target.value })}
              className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-navy-400" />
            <span className="text-gray-400 text-xs">~</span>
            <input type="date" value={filter.customEnd || ''}
              onChange={(e) => setFilter({ customEnd: e.target.value })}
              className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-navy-400" />
          </div>
        )}
      </div>

      <div className="h-px bg-gray-100" />

      {/* ①행 지역 */}
      <div>
        <p className="text-xs font-semibold text-gray-500 mb-2">① 지역 구분</p>
        <div className="flex flex-wrap gap-2">
          {(['domestic', 'international', 'all'] as Region[]).map((r) => (
            <button key={r} onClick={() => toggleRegion(r)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors
                ${filter.regions.includes(r)
                  ? 'bg-broadcast-red text-white border-broadcast-red'
                  : 'text-gray-600 border-gray-200 hover:border-red-300'}`}>
              {REGION_LABELS[r]}
            </button>
          ))}
        </div>
      </div>

      {/* ②행 주관 기관/분야 */}
      <div>
        <p className="text-xs font-semibold text-gray-500 mb-2">② 주관 기관 / 분야</p>
        <div className="flex flex-wrap gap-1.5 items-center">
          {ROW2_OPTIONS.map((o) => (
            <button key={o} onClick={() => toggleOrg(o)}
              className={`px-2.5 py-1 rounded-full text-xs border transition-colors
                ${filter.orgs.includes(o)
                  ? 'bg-navy-500 text-white border-navy-500'
                  : 'text-gray-600 border-gray-200 hover:border-navy-400'}`}>
              {o}
            </button>
          ))}
          <input
            value={filter.orgCustom}
            onChange={(e) => setFilter({ orgCustom: e.target.value })}
            placeholder="기타 (Enter로 추가)"
            className="text-xs border border-gray-200 rounded-full px-2.5 py-1 w-32 focus:outline-none focus:ring-2 focus:ring-navy-400"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && filter.orgCustom.trim()) {
                toggleOrg(filter.orgCustom.trim()); setFilter({ orgCustom: '' })
              }
            }}
          />
        </div>
      </div>

      {/* ③행 행사 유형 */}
      <div>
        <p className="text-xs font-semibold text-gray-500 mb-2">
          ③ 행사 유형 <span className="text-red-500">*</span>
          <span className="text-gray-400 font-normal ml-1">(하나 이상 필수)</span>
        </p>
        <div className="flex flex-wrap gap-1.5 items-center">
          {ROW3_OPTIONS.map((t) => (
            <button key={t} onClick={() => toggleType(t)}
              className={`px-2.5 py-1 rounded-full text-xs border transition-colors
                ${filter.eventTypes.includes(t)
                  ? 'bg-broadcast-blue text-white border-broadcast-blue'
                  : 'text-gray-600 border-gray-200 hover:border-blue-400'}`}>
              {t}
            </button>
          ))}
          <input
            value={filter.eventTypeCustom}
            onChange={(e) => setFilter({ eventTypeCustom: e.target.value })}
            placeholder="기타 (Enter로 추가)"
            className="text-xs border border-gray-200 rounded-full px-2.5 py-1 w-32 focus:outline-none focus:ring-2 focus:ring-navy-400"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && filter.eventTypeCustom.trim()) {
                toggleType(filter.eventTypeCustom.trim()); setFilter({ eventTypeCustom: '' })
              }
            }}
          />
        </div>
      </div>

      {/* 키워드 직접 입력 + 검색 버튼 */}
      <div className="flex gap-2 pt-1">
        <input
          value={filter.keyword}
          onChange={(e) => setFilter({ keyword: e.target.value })}
          placeholder="② 추가 키워드 직접 입력 (선택)"
          className="flex-1 text-sm border border-gray-200 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-navy-400"
          onKeyDown={(e) => { if (e.key === 'Enter' && activeTypes.length) onSearch() }}
        />
        <button
          onClick={() => {
            if (!activeTypes.length) { alert('행사 유형(③행)을 하나 이상 선택해 주세요.'); return }
            onSearch()
          }}
          disabled={searching}
          className="px-6 py-2 bg-navy-500 hover:bg-navy-600 disabled:bg-navy-300 text-white text-sm font-semibold rounded-xl transition-colors flex items-center gap-2 whitespace-nowrap"
        >
          {searching
            ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> 검색 중…</>
            : '🔍 검색'}
        </button>
      </div>
    </div>
  )
}
