import { useState } from 'react'
import { CheckSquare, FileDown, Loader, RefreshCw } from 'lucide-react'
import { reviseReport } from '@/lib/ai'
import { generateAndDownloadReport } from '@/lib/docxGenerator'
import { readReportFile } from '@/lib/reportFileReader'
import { toast } from '@/components/shared/Toast'
import FileDropzone from '@/components/shared/FileDropzone'

interface Props {
  eventName: string
  reportType: 'seminar' | 'exhibition'
  reportTitle: string
  finalReportContent: string
  finalReportFileName: string
  titleFontSize: number
  subtitleFontSize: number
  bodyFontSize: number
  totalPages: number
  onRevised: (content: string, fileName: string) => void
}

export default function ReportRevisionPanel({
  eventName,
  reportType,
  reportTitle,
  finalReportContent,
  finalReportFileName,
  titleFontSize,
  subtitleFontSize,
  bodyFontSize,
  totalPages,
  onRevised,
}: Props) {
  const [useFinalReport, setUseFinalReport] = useState(true)
  const [uploadedFileName, setUploadedFileName] = useState('')
  const [uploadedContent, setUploadedContent] = useState('')
  const [requirements, setRequirements] = useState('')
  const [readingFile, setReadingFile] = useState(false)
  const [rewriting, setRewriting] = useState(false)

  async function handleReportFile(file: File) {
    setReadingFile(true)
    try {
      const content = await readReportFile(file)
      setUploadedFileName(file.name)
      setUploadedContent(content)
      setUseFinalReport(false)
      toast.success('보고서 파일을 읽었습니다.')
    } catch (e) {
      toast.error('파일 읽기 실패: ' + (e instanceof Error ? e.message : '오류'))
    } finally {
      setReadingFile(false)
    }
  }

  async function handleRewriteReport() {
    const sourceContent = useFinalReport ? finalReportContent : uploadedContent
    if (!sourceContent.trim()) {
      toast.error(useFinalReport
        ? '먼저 보고서를 작성해 최종 보고서 내용을 생성하세요.'
        : '업로드된 보고서 내용을 찾을 수 없습니다.')
      return
    }

    setRewriting(true)
    try {
      const revised = await reviseReport({
        eventName,
        reportType,
        originalContent: sourceContent,
        modificationRequirements: requirements,
        titleFontSize,
        subtitleFontSize,
        bodyFontSize,
        totalPages,
      })
      const fileName = await generateAndDownloadReport({
        title: `${reportTitle} 수정본`,
        content: revised,
        titleFontSize,
        subtitleFontSize,
        bodyFontSize,
      })
      onRevised(revised, fileName)
      toast.success('보고서를 재작성하여 다운로드했습니다.')
    } catch (e) {
      toast.error('보고서 재작성 실패: ' + (e instanceof Error ? e.message : '알 수 없는 오류'))
    } finally {
      setRewriting(false)
    }
  }

  return (
    <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
      <div className="flex items-center gap-2">
        <RefreshCw className="w-4 h-4 text-navy-500" />
        <h2 className="text-sm font-bold text-navy-600">보고서 재작성</h2>
      </div>

      <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
        <input
          type="checkbox"
          checked={useFinalReport}
          onChange={(e) => setUseFinalReport(e.target.checked)}
          className="w-4 h-4 rounded border-gray-300 text-navy-600 focus:ring-navy-400"
        />
        <CheckSquare className="w-4 h-4 text-gray-400" />
        작성된 최종 보고서
        {finalReportFileName && (
          <span className="min-w-0 break-all text-xs font-normal text-gray-500">
            {finalReportFileName}
          </span>
        )}
      </label>

      <div>
        <p className="text-xs font-medium text-gray-500 mb-2">보고서 파일 업로드</p>
        <FileDropzone
          onFile={handleReportFile}
          accept={{
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
            'text/plain': ['.txt', '.md'],
            'text/html': ['.html'],
          }}
          label="파일 찾기 또는 드래그 앤 드롭"
          hint="작성된 최종 보고서 체크를 해제하면 업로드한 파일 내용을 사용합니다"
          currentFileName={uploadedFileName}
        />
        {readingFile && <p className="text-xs text-navy-500 mt-2 animate-pulse">파일을 읽는 중…</p>}
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-500 mb-2">수정 요구 사항</label>
        <textarea
          value={requirements}
          onChange={(e) => setRequirements(e.target.value)}
          rows={5}
          placeholder="예: 결론을 더 강하게 작성하고, 주요 시사점을 방송 산업 관점으로 보강해 주세요."
          className="w-full text-sm border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-navy-400 resize-none"
        />
      </div>

      <button
        onClick={handleRewriteReport}
        disabled={rewriting || readingFile}
        className="w-full py-4 bg-navy-500 hover:bg-navy-600 disabled:bg-navy-300 text-white font-bold rounded-2xl text-sm transition-colors flex items-center justify-center gap-2 shadow-lg shadow-navy-200"
      >
        {rewriting
          ? <><Loader className="w-4 h-4 animate-spin" /> AI로 보고서를 재작성하는 중…</>
          : <><FileDown className="w-4 h-4" /> 보고서 재작성 및 .docx 다운로드</>}
      </button>
    </section>
  )
}
