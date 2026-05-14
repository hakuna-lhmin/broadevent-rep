// src/components/reports/ExhibitionReportPage.tsx
// ✅ 모든 hooks를 컴포넌트 최상단에 배치 (Rules of Hooks 준수)
import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, FileDown, Loader, Plus, Camera, Trash2 } from 'lucide-react'
import { v4 as uuidv4 } from 'uuid'
import { useAppStore } from '@/store'
import { generateExhibitionReport } from '@/lib/ai'
import { generateAndDownloadReport } from '@/lib/docxGenerator'
import { uploadFile } from '@/lib/storageHelpers'
import { toast } from '@/components/shared/Toast'
import FileDropzone from '@/components/shared/FileDropzone'
import { VolumeSettingsForm, DEFAULT_VOLUME, EditableField } from './ReportFormShared'
import type { BoothEntry, EventFile } from '@/types'
import type { VolumeSettings } from './ReportFormShared'

function newBooth(): BoothEntry {
  return { id: uuidv4(), photos: [], companyName: '', consultationNotes: '', keyPoints: '' }
}

export default function ExhibitionReportPage() {
  const { eventId } = useParams<{ eventId: string }>()
  const navigate    = useNavigate()
  const user        = useAppStore((s) => s.user)
  const event       = useAppStore((s) => s.events.find((e) => e.id === eventId))
  const updateEvent = useAppStore((s) => s.updateEvent)

  // ✅ hooks는 항상 최상단에
  const [eventName,   setEventName]   = useState('')
  const [homeUrl,     setHomeUrl]     = useState('')
  const [booths,      setBooths]      = useState<BoothEntry[]>([newBooth()])
  const [comments,    setComments]    = useState('')
  const [volume,      setVolume]      = useState<VolumeSettings>(DEFAULT_VOLUME)
  const [generating,  setGenerating]  = useState(false)
  const [uploadingId, setUploadingId] = useState<string | null>(null)

  // event 로드 후 state 초기화
  useEffect(() => {
    if (!event) return
    setEventName(event.name || '')
    setHomeUrl(event.url || '')
    setBooths(event.exhibitionReport?.booths?.length ? event.exhibitionReport.booths : [newBooth()])
    setComments(event.exhibitionReport?.overallComments || '')
    setVolume({ ...DEFAULT_VOLUME, ...(event.exhibitionReport || {}) })
  }, [event?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // ✅ hooks 이후 조건부 렌더링
  if (!event) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400 mb-3">행사를 찾을 수 없습니다.</p>
          <button onClick={() => navigate('/')}
            className="px-4 py-2 bg-navy-500 text-white rounded-xl text-sm font-semibold hover:bg-navy-600 transition-colors">
            홈으로 돌아가기
          </button>
        </div>
      </div>
    )
  }

  function updateBooth(id: string, patch: Partial<BoothEntry>) {
    setBooths((bs) => bs.map((b) => (b.id === id ? { ...b, ...patch } : b)))
  }

  async function handleBoothPhoto(boothId: string, file: File) {
    if (!user || !eventId) return
    setUploadingId(boothId)
    try {
      const saved: EventFile = await uploadFile(user.uid, eventId, 'booth', file)
      setBooths((bs) => bs.map((b) => b.id === boothId ? { ...b, photos: [...b.photos, saved] } : b))
      toast.success('사진이 저장되었습니다.')
    } catch (e) {
      toast.error('업로드 실패: ' + (e instanceof Error ? e.message : '오류'))
    } finally { setUploadingId(null) }
  }

  async function handleWriteReport() {
    if (!eventId) return
    setGenerating(true)
    try {
      const content = await generateExhibitionReport({
        eventName,
        homepageDescUrl: homeUrl,
        booths: booths.map((b) => ({
          companyName:       b.companyName,
          consultationNotes: b.consultationNotes,
          keyPoints:         b.keyPoints,
        })),
        overallComments:  comments,
        titleFontSize:    volume.titleFontSize,
        subtitleFontSize: volume.subtitleFontSize,
        bodyFontSize:     volume.bodyFontSize,
        totalPages:       volume.totalPages,
        customRequirements: volume.useCustomRequirements ? volume.customRequirements : '',
      })
      await generateAndDownloadReport({
        title:            `${eventName} — 전시회 결과 보고서`,
        content,
        titleFontSize:    volume.titleFontSize,
        subtitleFontSize: volume.subtitleFontSize,
        bodyFontSize:     volume.bodyFontSize,
      })
      updateEvent(eventId, {
        exhibitionReport: {
          eventName, homepageDescUrl: homeUrl,
          booths, overallComments: comments, ...volume,
        },
      })
      toast.success('보고서가 작성되어 다운로드되었습니다.')
    } catch (e) {
      toast.error('작성 실패: ' + (e instanceof Error ? e.message : '알 수 없는 오류'))
    } finally { setGenerating(false) }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 상단 헤더 */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10 shadow-sm">
        <div className="max-w-4xl mx-auto px-6 py-3 flex items-center gap-4">
          <button onClick={() => navigate('/')} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <ArrowLeft className="w-4 h-4 text-gray-500" />
          </button>
          <div>
            <p className="text-xs text-gray-400">보고서 작성</p>
            <h1 className="text-sm font-bold text-navy-600">⑮ 전시회 결과 보고서</h1>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">

        {/* 기본 정보 */}
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
          <h2 className="text-sm font-bold text-navy-600">행사 기본 정보 <span className="text-xs text-gray-400 font-normal">(클릭하여 수정)</span></h2>
          <EditableField label="행사명" value={eventName} onChange={setEventName} />
          <EditableField label="행사 홈페이지 / 설명 URL" value={homeUrl} onChange={setHomeUrl} type="url" />
        </section>

        {/* 부스/업체 입력 */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-navy-600">부스 / 업체 입력</h2>
            <button onClick={() => setBooths((b) => [...b, newBooth()])}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-navy-500 hover:bg-navy-600 text-white text-xs font-semibold rounded-xl transition-colors">
              <Plus className="w-3.5 h-3.5" /> 부스 추가
            </button>
          </div>

          {booths.map((booth, idx) => (
            <div key={booth.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wide">부스 {idx + 1}</h3>
                {booths.length > 1 && (
                  <button onClick={() => setBooths((bs) => bs.filter((b) => b.id !== booth.id))}
                    className="p-1 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="mb-4">
                <p className="text-xs text-gray-500 mb-2 flex items-center gap-1">
                  <Camera className="w-3.5 h-3.5" /> 부스 사진
                </p>
                <FileDropzone
                  onFile={(f) => handleBoothPhoto(booth.id, f)}
                  accept={{ 'image/*': [] }}
                  label="사진 드롭 또는 클릭하여 선택"
                  compact
                />
                {uploadingId === booth.id && <p className="text-xs text-navy-500 mt-1 animate-pulse">업로드 중…</p>}
                {booth.photos.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {booth.photos.map((p, i) => (
                      <a key={i} href={p.url} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-navy-500 hover:underline bg-gray-50 rounded px-2 py-1">
                        📷 {i + 1}
                      </a>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">업체명</label>
                  <input
                    value={booth.companyName}
                    onChange={(e) => updateBooth(booth.id, { companyName: e.target.value })}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-navy-400"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">상담 내용</label>
                  <textarea
                    rows={3}
                    value={booth.consultationNotes}
                    onChange={(e) => updateBooth(booth.id, { consultationNotes: e.target.value })}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-navy-400 resize-none"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">중요 사항</label>
                  <textarea
                    rows={3}
                    value={booth.keyPoints}
                    onChange={(e) => updateBooth(booth.id, { keyPoints: e.target.value })}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-navy-400 resize-none"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* 총평 */}
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-sm font-bold text-navy-600 mb-1">총평</h2>
          <p className="text-xs text-gray-400 mb-3">중점사항, 특이사항, 개선사항, 인사이트 등</p>
          <textarea value={comments} onChange={(e) => setComments(e.target.value)}
            rows={5} placeholder="전시회 전반에 대한 종합 평가를 입력하세요…"
            className="w-full text-sm border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-navy-400 resize-none" />
        </section>

        {/* 보고서 분량 설정 */}
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-sm font-bold text-navy-600 mb-4">보고서 설정</h2>
          <VolumeSettingsForm value={volume} onChange={setVolume} />
        </section>

        {/* 보고서 작성 버튼 */}
        <button onClick={handleWriteReport} disabled={generating}
          className="w-full py-4 bg-navy-500 hover:bg-navy-600 disabled:bg-navy-300 text-white font-bold rounded-2xl text-sm transition-colors flex items-center justify-center gap-2 shadow-lg shadow-navy-200">
          {generating
            ? <><Loader className="w-4 h-4 animate-spin" /> AI로 보고서를 작성하는 중…</>
            : <><FileDown className="w-4 h-4" /> 보고서 작성 및 .docx 다운로드</>}
        </button>
      </div>
    </div>
  )
}
