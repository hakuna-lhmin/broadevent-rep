// src/components/events/EventTable.tsx
import { useState } from 'react'
import { Trash2, ExternalLink, FileText, Newspaper, FileEdit } from 'lucide-react'
import { useAppStore } from '@/store'
import { deleteEventDoc, saveEvent } from '@/lib/firestore'
import { toast } from '@/components/shared/Toast'
import FileUploadCell from './FileUploadCell'
import NewsSummaryModal from './NewsSummaryModal'
import ReportTypeModal from '@/components/reports/ReportTypeModal'
import type { BroadEvent, EventFile } from '@/types'

interface Props { uid: string; onEventHighlight?: (id: string) => void }

export default function EventTable({ uid, onEventHighlight }: Props) {
  const { events, updateEvent, removeEvent } = useAppStore()
  const [newsSummaryId, setNewsSummaryId] = useState<string | null>(null)
  const [reportModalId, setReportModalId] = useState<string | null>(null)

  async function handleDelete(ev: BroadEvent) {
    if (!confirm(`"${ev.name}" 행사를 삭제하시겠습니까?`)) return
    removeEvent(ev.id)
    await deleteEventDoc(uid, ev.id)
    toast.info('행사가 삭제되었습니다.')
  }

  function handleFileSaved(ev: BroadEvent, field: 'paperFile' | 'meetingResultFile' | 'reportFile', file: EventFile) {
    const patch = { [field]: file }
    updateEvent(ev.id, patch)
    saveEvent(uid, { ...ev, ...patch })
  }

  function trunc(s: string, n = 18) { return s && s.length > n ? s.slice(0, n) + '…' : (s || '') }

  if (!events.length) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
        <FileText className="w-10 h-10 text-gray-200 mx-auto mb-3" />
        <p className="text-gray-400 text-sm">행사 정보가 없습니다. 위에서 검색하거나 직접 입력해 주세요.</p>
      </div>
    )
  }

  const TH = 'px-3 py-3 text-left font-semibold whitespace-nowrap text-xs'

  return (
    <>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-navy-600 text-white">
                <th className={TH + ' text-center w-8'}>No.</th>
                <th className={TH}>행사명</th>
                <th className={TH}>기간</th>
                <th className={TH}>장소</th>
                <th className={TH}>홈페이지</th>
                <th className={TH}>국가</th>
                <th className={TH}>⑦ 발제문</th>
                <th className={TH}>⑧ 회의 결과</th>
                <th className={TH}>⑨ 보고서</th>
                <th className={TH + ' text-center'}>삭제</th>
              </tr>
            </thead>
            <tbody>
              {events.map((ev, idx) => (
                <tr key={ev.id}
                  className="border-t border-gray-50 hover:bg-navy-50 transition-colors cursor-pointer"
                  onClick={() => onEventHighlight?.(ev.id)}>

                  <td className="px-3 py-2.5 text-center text-gray-400">{idx + 1}</td>

                  {/* 행사명 */}
                  <td className="px-3 py-2.5 font-medium text-navy-700 max-w-[180px]">
                    <span title={ev.name}>{trunc(ev.name, 24)}</span>
                  </td>

                  {/* 기간 */}
                  <td className="px-3 py-2.5 whitespace-nowrap text-gray-600">
                    {ev.startDate} ~ {ev.endDate}
                  </td>

                  {/* 장소 */}
                  <td className="px-3 py-2.5 text-gray-600 max-w-[120px]">
                    <span title={ev.location}>{trunc(ev.location)}</span>
                  </td>

                  {/* 홈페이지 */}
                  <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                    {ev.url
                      ? <a href={ev.url} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1 text-navy-500 hover:underline">
                          <ExternalLink className="w-3 h-3" /> 링크
                        </a>
                      : <span className="text-gray-300">—</span>}
                  </td>

                  {/* 국가 */}
                  <td className="px-3 py-2.5">
                    {ev.country === 'international'
                      ? <span className="bg-broadcast-blue text-white text-[10px] font-bold px-1.5 py-0.5 rounded">해외</span>
                      : <span className="bg-broadcast-red  text-white text-[10px] font-bold px-1.5 py-0.5 rounded">국내</span>}
                  </td>

                  {/* ⑦ 발제문 */}
                  <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                    <FileUploadCell uid={uid} eventId={ev.id} category="paper"
                      current={ev.paperFile}
                      onSaved={(f) => handleFileSaved(ev, 'paperFile', f)} />
                  </td>

                  {/* ⑧ 회의 결과 */}
                  <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                    <div className="flex flex-col gap-1">
                      <FileUploadCell uid={uid} eventId={ev.id} category="meeting"
                        current={ev.meetingResultFile}
                        onSaved={(f) => handleFileSaved(ev, 'meetingResultFile', f)} />
                      <button onClick={() => setNewsSummaryId(ev.id)}
                        className="flex items-center gap-1 text-[10px] bg-gray-50 hover:bg-blue-50 text-gray-600 hover:text-blue-700 border border-gray-200 rounded-lg px-2 py-1 transition-colors">
                        <Newspaper className="w-3 h-3" /> ⑪ 기사 결과
                      </button>
                    </div>
                  </td>

                  {/* ⑨ 보고서 */}
                  <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                    <div className="flex flex-col gap-1">
                      <FileUploadCell uid={uid} eventId={ev.id} category="report"
                        current={ev.reportFile}
                        onSaved={(f) => handleFileSaved(ev, 'reportFile', f)} />
                      <button onClick={() => setReportModalId(ev.id)}
                        className="flex items-center gap-1 text-[10px] bg-navy-50 hover:bg-navy-100 text-navy-600 border border-navy-200 rounded-lg px-2 py-1 transition-colors">
                        <FileEdit className="w-3 h-3" /> ⑬ 작성
                      </button>
                    </div>
                  </td>

                  {/* 삭제 */}
                  <td className="px-3 py-2.5 text-center" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => handleDelete(ev)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {newsSummaryId && (
        <NewsSummaryModal eventId={newsSummaryId} open={!!newsSummaryId} onClose={() => setNewsSummaryId(null)} />
      )}
      {reportModalId && (
        <ReportTypeModal eventId={reportModalId} open={!!reportModalId} onClose={() => setReportModalId(null)} />
      )}
    </>
  )
}
