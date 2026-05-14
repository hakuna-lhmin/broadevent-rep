// src/components/shared/FileDropzone.tsx
import { useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, FileCheck } from 'lucide-react'

interface Props {
  onFile: (file: File) => void
  accept?: Record<string, string[]>
  label?: string
  hint?: string
  currentFileName?: string
  compact?: boolean
}

export default function FileDropzone({ onFile, accept, label, hint, currentFileName, compact }: Props) {
  const onDrop = useCallback((files: File[]) => { if (files[0]) onFile(files[0]) }, [onFile])
  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept, multiple: false })

  if (compact) {
    return (
      <div {...getRootProps()}
        className={`flex items-center gap-2 px-3 py-2 border-2 border-dashed rounded-lg cursor-pointer transition-colors text-sm
          ${isDragActive ? 'border-navy-500 bg-navy-50' : 'border-gray-200 hover:border-navy-400 bg-gray-50'}`}>
        <input {...getInputProps()} />
        {currentFileName
          ? <><FileCheck className="w-4 h-4 text-green-500 flex-shrink-0" /><span className="truncate text-gray-700">{currentFileName}</span></>
          : <><Upload className="w-4 h-4 text-gray-400 flex-shrink-0" /><span className="text-gray-500">{isDragActive ? '여기에 놓으세요' : (label || '파일 선택 또는 드롭')}</span></>}
      </div>
    )
  }

  return (
    <div {...getRootProps()}
      className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all
        ${isDragActive ? 'border-navy-500 bg-navy-50 scale-[1.01]' : 'border-gray-200 hover:border-navy-400 hover:bg-gray-50'}`}>
      <input {...getInputProps()} />
      {currentFileName
        ? (
          <div className="flex flex-col items-center gap-2">
            <FileCheck className="w-8 h-8 text-green-500" />
            <p className="text-sm font-medium text-gray-700 truncate max-w-full">{currentFileName}</p>
            <p className="text-xs text-gray-400">클릭하거나 드롭하여 교체</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Upload className={`w-8 h-8 ${isDragActive ? 'text-navy-500' : 'text-gray-300'}`} />
            <p className="text-sm font-medium text-gray-600">{isDragActive ? '여기에 파일을 놓으세요' : (label || '클릭하거나 드래그 앤 드롭')}</p>
            {hint && <p className="text-xs text-gray-400">{hint}</p>}
          </div>
        )}
    </div>
  )
}
