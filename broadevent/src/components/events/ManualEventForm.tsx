// src/components/events/ManualEventForm.tsx
import { useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { PlusCircle, Image, Loader } from 'lucide-react'
import { v4 as uuidv4 } from 'uuid'
import { useAppStore } from '@/store'
import { extractEventFromImage } from '@/lib/ai'
import { fileToBase64 } from '@/lib/storageHelpers'
import { toast } from '@/components/shared/Toast'
import type { OcrResult, Country } from '@/types'   // ✅ Country 공통 타입 import

interface FormState {
  name: string; startDate: string; endDate: string
  location: string; url: string; country: Country
}
const EMPTY: FormState = {
  name: '', startDate: '', endDate: '', location: '', url: '', country: 'domestic',
}

export default function ManualEventForm() {
  const addEvent = useAppStore((s) => s.addEvent)
  const [form,       setForm]      = useState<FormState>({ ...EMPTY })
  const [ocrLoading, setOcrLoading] = useState(false)

  function set<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm((p) => ({ ...p, [k]: v }))
  }

  function handleAdd() {
    if (!form.name.trim() || !form.startDate || !form.endDate) {
      toast.error('행사명, 시작일, 종료일은 필수 항목입니다.')
      return
    }
    addEvent({
      id:        uuidv4(),
      source:    'manual',
      createdAt: new Date().toISOString(),
      name:      form.name.trim(),
      startDate: form.startDate,
      endDate:   form.endDate,
      location:  form.location.trim(),
      url:       form.url.trim(),
      country:   form.country,
    })
    setForm({ ...EMPTY })
    toast.success('행사가 추가되었습니다.')
  }

  async function handleImageOcr(file: File) {
    setOcrLoading(true)
    try {
      const { base64, mimeType } = await fileToBase64(file)
      const result: OcrResult   = await extractEventFromImage(base64, mimeType)
      setForm((p) => ({
        ...p,
        name:      result.name      || p.name,
        startDate: result.startDate || p.startDate,
        endDate:   result.endDate   || p.endDate,
        location:  result.location  || p.location,
        url:       result.url       || p.url,
        country:   (result.country === 'international' ? 'international' : 'domestic') as Country,
      }))
      toast.success('이미지에서 행사 정보를 추출했습니다. 내용을 확인 후 추가하세요.')
    } catch (e) {
      toast.error('OCR 실패: ' + (e instanceof Error ? e.message : '알 수 없는 오류'))
    } finally { setOcrLoading(false) }
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (files) => { if (files[0]) handleImageOcr(files[0]) },
    accept: { 'image/*': [] },
    multiple: false,
  })

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <h3 className="text-sm font-bold text-navy-600 mb-4 flex items-center gap-2">
        <PlusCircle className="w-4 h-4" /> ⑤ 행사 직접 입력
      </h3>

      {/* 입력 폼 */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
        <div className="lg:col-span-2">
          <label className="block text-xs text-gray-500 mb-1">행사명 <span className="text-red-500">*</span></label>
          <input
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleAdd() }}
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-navy-400"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">시작일 <span className="text-red-500">*</span></label>
          <input
            type="date" value={form.startDate}
            onChange={(e) => set('startDate', e.target.value)}
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-navy-400"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">종료일 <span className="text-red-500">*</span></label>
          <input
            type="date" value={form.endDate}
            onChange={(e) => set('endDate', e.target.value)}
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-navy-400"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">장소</label>
          <input
            value={form.location}
            onChange={(e) => set('location', e.target.value)}
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-navy-400"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">국가</label>
          <select
            value={form.country}
            onChange={(e) => set('country', e.target.value as Country)}
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-navy-400"
          >
            <option value="domestic">국내</option>
            <option value="international">해외</option>
          </select>
        </div>
        <div className="lg:col-span-2">
          <label className="block text-xs text-gray-500 mb-1">홈페이지 URL</label>
          <input
            value={form.url}
            onChange={(e) => set('url', e.target.value)}
            type="url" placeholder="https://"
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-navy-400"
          />
        </div>
      </div>

      {/* ⑥ 이미지 OCR */}
      <div className="mb-4">
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-xl p-4 flex items-center gap-3 cursor-pointer transition-all
            ${isDragActive ? 'border-navy-500 bg-navy-50' : 'border-gray-200 hover:border-navy-400 hover:bg-gray-50'}`}
        >
          <input {...getInputProps()} />
          {ocrLoading
            ? <Loader className="w-5 h-5 text-navy-500 animate-spin flex-shrink-0" />
            : <Image className="w-5 h-5 text-gray-400 flex-shrink-0" />}
          <div>
            <p className="text-sm font-medium text-gray-600">
              {ocrLoading ? 'AI로 행사 정보를 추출하는 중…'
                : isDragActive ? '이미지를 여기에 놓으세요…'
                : '⑥ 행사 사이트 캡처 이미지 드롭 또는 클릭하여 선택'}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              행사관련 사이트 캡처한 사진을 입력시 내용이 추가 됩니다.
            </p>
          </div>
        </div>
      </div>

      <button
        onClick={handleAdd}
        className="px-5 py-2 bg-navy-500 hover:bg-navy-600 text-white text-sm font-semibold rounded-xl transition-colors"
      >
        + 추가
      </button>
    </div>
  )
}
