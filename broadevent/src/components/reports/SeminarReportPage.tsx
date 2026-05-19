// src/components/reports/SeminarReportPage.tsx
// ✅ 모든 hooks를 컴포넌트 최상단에 배치 (Rules of Hooks 준수)
import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, FileDown, Loader, Camera } from 'lucide-react'
import { useAppStore } from '@/store'
import { generateSeminarReport } from '@/lib/ai'
import { generateAndDownloadReport } from '@/lib/docxGenerator'
import { uploadFile } from '@/lib/storageHelpers'
import { toast } from '@/components/shared/Toast'
import FileDropzone from '@/components/shared/FileDropzone'
import { VolumeSettingsForm, DEFAULT_VOLUME, EditableField } from './ReportFormShared'
import ReportRevisionPanel from './ReportRevisionPanel'
import type { EventFile } from '@/types'
import type { VolumeSettings } from './ReportFormShared'

export default function SeminarReportPage() {
  const { eventId } = useParams<{ eventId: string }>()
  const navigate    = useNavigate()
  const user        = useAppStore((s) => s.user)
  const event       = useAppStore((s) => s.events.find((e) => e.id === eventId))
  const updateEvent = useAppStore((s) => s.updateEvent)

  // ✅ hooks는 항상 최상단에 — event가 undefined여도 호출해야 함
  const [eventName,  setEventName]  = useState('')
  const [homeUrl,    setHomeUrl]    = useState('')
  const [photos,     setPhotos]     = useState<EventFile[]>([])
  const [comments,   setComments]   = useState('')
  const [volume,     setVolume]     = useState<VolumeSettings>(DEFAULT_VOLUME)
  const [generating, setGenerating] = useState(false)
  const [uploading,  setUploading]  = useState(false)
  const [finalReportContent, setFinalReportContent] = useState('')

  // event가 로드된 후 state 초기화
  useEffect(() => {
    if (!event) return
    setEventName(event.name || '')
    setHomeUrl(event.url || '')
    setPhotos(event.seminarReport?.photos || [])
    setComments(event.seminarReport?.overallComments || '')
    setVolume({ ...DEFAULT_VOLUME, ...(event.seminarReport || {}) })
  }, [event?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // ✅ hooks 이후에 조건부 렌더링
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

  async function handlePhotoUpload(file: File) {
    if (!user || !eventId) return
    setUploading(true)
    try {
      const saved = await uploadFile(user.uid, eventId, 'photo', file)
      setPhotos((p) => [...p, saved])
      toast.success('사진이 업로드되었습니다.')
    } catch (e) {
      toast.error('사진 업로드 실패: ' + (e instanceof Error ? e.message : '오류'))
    } finally { setUploading(false) }
  }

  async function handleWriteReport() {
    if (!eventId || !event) return
    const ev = event   // capture so TS knows it's defined inside async scope
    setGenerating(true)
    try {
      const content = await generateSeminarReport({
        eventName,
        homepageDescUrl:       homeUrl,
        paperFileName:         ev.paperFile?.name || '',
        meetingResultFileName: ev.meetingResultFile?.name || '',
        photoCount:            photos.length,
        overallComments:       comments,
        titleFontSize:         volume.titleFontSize,
        subtitleFontSize:      volume.subtitleFontSize,
        bodyFontSize:          volume.bodyFontSize,
        totalPages:            volume.totalPages,
        customRequirements:    volume.useCustomRequirements ? volume.customRequirements : '',
      })
      await generateAndDownloadReport({
        title:            `${eventName} — 세미나 결과 보고서`,
        content,
        titleFontSize:    volume.titleFontSize,
        subtitleFontSize: volume.subtitleFontSize,
        bodyFontSize:     volume.bodyFontSize,
      })
      setFinalReportContent(content)
      updateEvent(eventId, {
        seminarReport: {
          eventName, homepageDescUrl: homeUrl, photos,
          overallComments:      comments,
          paperFileName:        ev.paperFile?.name || '',
          meetingResultFileName: ev.meetingResultFile?.name || '',
          ...volume,
        },
      })
      toast.success('보고서가 작성되어 다운로드되었습니다.')
    } catch (e) {
      toast.error('보고서 작성 실패: ' + (e instanceof Error ? e.message : '알 수 없는 오류'))
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
            <h1 className="text-sm font-bold text-navy-600">⑭ 세미나 결과 보고서</h1>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">

        {/* 기본 정보 */}
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
          <h2 className="text-sm font-bold text-navy-600">행사 기본 정보 <span className="text-xs text-gray-400 font-normal">(클릭하여 수정)</span></h2>
          <EditableField label="행사명" value={eventName} onChange={setEventName} />
          <EditableField label="행사 홈페이지 / 설명 URL" value={homeUrl} onChange={setHomeUrl} type="url" />
          {event.paperFile?.name && (
            <div className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
              📄 발제문: <span className="font-medium text-gray-700">{event.paperFile.name}</span>
            </div>
          )}
          {event.meetingResultFile?.name && (
            <div className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
              📋 회의 결과: <span className="font-medium text-gray-700">{event.meetingResultFile.name}</span>
            </div>
          )}
        </section>

        {/* 현장 사진 */}
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-sm font-bold text-navy-600 mb-4 flex items-center gap-2">
            <Camera className="w-4 h-4" /> 현장 사진
          </h2>
          <FileDropzone
            onFile={handlePhotoUpload}
            accept={{ 'image/*': [] }}
            label="현장 사진 드롭 또는 클릭하여 선택"
            hint="여러 사진을 순서대로 하나씩 업로드하세요"
          />
          {uploading && <p className="text-xs text-navy-500 mt-2 animate-pulse">업로드 중…</p>}
          {photos.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {photos.map((p, i) => (
                <a key={i} href={p.url} target="_blank" rel="noopener noreferrer"
                  className="text-xs text-navy-500 hover:underline bg-gray-50 rounded-lg px-3 py-1.5">
                  📷 사진 {i + 1}
                </a>
              ))}
            </div>
          )}
        </section>

        {/* 총평 */}
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-sm font-bold text-navy-600 mb-1">총평</h2>
          <p className="text-xs text-gray-400 mb-3">중점사항, 특이사항, 개선사항, 인사이트 등</p>
          <textarea
            value={comments} onChange={(e) => setComments(e.target.value)}
            rows={5} placeholder="행사에 대한 전반적인 평가를 입력하세요…"
            className="w-full text-sm border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-navy-400 resize-none"
          />
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

        <ReportRevisionPanel
          eventName={eventName}
          reportType="seminar"
          reportTitle={`${eventName} — 세미나 결과 보고서`}
          finalReportContent={finalReportContent}
          titleFontSize={volume.titleFontSize}
          subtitleFontSize={volume.subtitleFontSize}
          bodyFontSize={volume.bodyFontSize}
          totalPages={volume.totalPages}
          onRevised={setFinalReportContent}
        />
      </div>
    </div>
  )
}
