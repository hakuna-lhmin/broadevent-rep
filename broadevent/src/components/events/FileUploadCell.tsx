// src/components/events/FileUploadCell.tsx
import { useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, FileCheck, Loader, AlertCircle } from 'lucide-react'
import { uploadFile, STORAGE_ENABLED, type UploadCategory } from '@/lib/storageHelpers'
import { toast } from '@/components/shared/Toast'
import type { EventFile } from '@/types'

interface Props {
  uid: string
  eventId: string
  category: UploadCategory
  current?: EventFile
  onSaved: (file: EventFile) => void
}

export default function FileUploadCell({ uid, eventId, category, current, onSaved }: Props) {
  const [pending, setPending] = useState<File | null>(null)
  const [saving,  setSaving]  = useState(false)

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (files) => { if (files[0]) setPending(files[0]) },
    multiple: false,
  })

  // Storage 비활성화 상태 안내
  if (!STORAGE_ENABLED) {
    return (
      <div className="flex items-center gap-1 text-[10px] text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1.5">
        <AlertCircle className="w-3 h-3 flex-shrink-0" />
        <span>파일 업로드 비활성화</span>
      </div>
    )
  }

  async function handleSave() {
    if (!pending) return
    setSaving(true)
    try {
      const saved = await uploadFile(uid, eventId, category, pending)
      onSaved(saved)
      setPending(null)
      toast.success('파일이 저장되었습니다.')
    } catch (e) {
      toast.error('업로드 실패: ' + (e instanceof Error ? e.message : '오류'))
    } finally { setSaving(false) }
  }

  const displayName = pending?.name || current?.name

  return (
    <div className="flex flex-col gap-1 min-w-[110px]">
      <div
        {...getRootProps()}
        className={`flex items-center gap-1.5 px-2 py-1.5 border border-dashed rounded-lg cursor-pointer text-xs transition-colors
          ${isDragActive ? 'border-navy-500 bg-navy-50' : 'border-gray-200 hover:border-navy-400'}`}
      >
        <input {...getInputProps()} />
        {displayName
          ? <><FileCheck className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
              <span className="truncate max-w-[90px] text-gray-700">{displayName}</span></>
          : <><Upload className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
              <span className="text-gray-400">파일 선택</span></>
        }
      </div>
      {pending && !saving && (
        <button onClick={handleSave}
          className="text-xs bg-navy-500 text-white rounded-lg px-2 py-1 hover:bg-navy-600 transition-colors">
          저장
        </button>
      )}
      {saving && (
        <div className="flex justify-center py-0.5">
          <Loader className="w-3.5 h-3.5 animate-spin text-navy-500" />
        </div>
      )}
      {current && !pending && (
        <a href={current.url} target="_blank" rel="noopener noreferrer"
          className="text-xs text-navy-500 hover:underline truncate block max-w-[110px]">
          파일 보기
        </a>
      )}
    </div>
  )
}
