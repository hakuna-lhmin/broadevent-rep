// src/components/events/NewsSummaryModal.tsx
// 수정: 무한루프 방지(deps에 event.id만 사용), 모달 열릴 때 text 초기화
import { useState, useEffect, useRef } from 'react'
import Modal from '@/components/shared/Modal'
import LoadingSpinner from '@/components/shared/LoadingSpinner'
import { fetchNewsSummary } from '@/lib/ai'
import { useAppStore } from '@/store'

interface Props { eventId: string; open: boolean; onClose: () => void }

const SECTION_KO: Record<string, string> = {
  'Background':                '배경',
  'Key Content & Sessions':    '주요 내용 및 세션',
  'Reactions & Press Coverage':'반응 및 언론 보도',
  'Implications & Takeaways':  '시사점 및 인사이트',
}

export default function NewsSummaryModal({ eventId, open, onClose }: Props) {
  const event       = useAppStore((s) => s.events.find((e) => e.id === eventId))
  const updateEvent = useAppStore((s) => s.updateEvent)
  const [loading, setLoading] = useState(false)
  const [text,    setText]    = useState('')
  // 현재 실행 중인 fetch 취소용
  const abortRef = useRef<boolean>(false)

  useEffect(() => {
    // 모달이 닫히면 상태 초기화
    if (!open) {
      setText('')
      setLoading(false)
      abortRef.current = true
      return
    }
    if (!event) return

    // 이미 캐시된 요약 있으면 바로 표시
    if (event.newsSummary) {
      setText(event.newsSummary)
      return
    }

    abortRef.current = false
    setLoading(true)
    setText('')

    const name = event.name
    const url  = event.url

    fetchNewsSummary(name, url)
      .then((t) => {
        if (abortRef.current) return   // 모달 닫힌 후 응답 무시
        setText(t)
        updateEvent(eventId, { newsSummary: t })
      })
      .catch((e) => {
        if (abortRef.current) return
        setText(`오류가 발생했습니다: ${e instanceof Error ? e.message : '알 수 없는 오류'}`)
      })
      .finally(() => {
        if (!abortRef.current) setLoading(false)
      })
  // ✅ event.id + event.newsSummary 만 deps — 객체 전체 금지
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, eventId, event?.id, event?.newsSummary])

  function renderLine(line: string, i: number) {
    if (line.startsWith('## ')) {
      const ko = SECTION_KO[line.slice(3).trim()] || line.slice(3).trim()
      return <h2 key={i} className="text-navy-600 font-bold text-sm mt-5 mb-2 pb-1 border-b border-gray-100">{ko}</h2>
    }
    if (line.startsWith('# '))
      return <h1 key={i} className="text-navy-700 font-bold text-base mt-4 mb-1">{line.slice(2)}</h1>
    if (line.startsWith('- ') || line.startsWith('• '))
      return <p key={i} className="text-sm text-gray-700 pl-4 flex gap-2"><span className="text-navy-400 flex-shrink-0">•</span>{line.slice(2)}</p>
    if (line.trim() === '')
      return <div key={i} className="h-2" />
    return <p key={i} className="text-sm text-gray-700 leading-relaxed">{line}</p>
  }

  return (
    <Modal open={open} onClose={onClose} title={`⑪ 기사 결과 — ${event?.name ?? ''}`} width="max-w-2xl">
      {loading
        ? <div className="flex justify-center py-12">
            <LoadingSpinner label="관련 기사를 수집하는 중…" />
          </div>
        : text
          ? <div className="max-h-[70vh] overflow-y-auto space-y-0.5 pr-1">
              {text.split('\n').map(renderLine)}
            </div>
          : <p className="text-sm text-gray-400 text-center py-8">표시할 내용이 없습니다.</p>
      }
    </Modal>
  )
}
