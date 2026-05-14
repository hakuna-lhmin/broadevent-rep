// src/components/reports/ReportTypeModal.tsx
import { useNavigate } from 'react-router-dom'
import Modal from '@/components/shared/Modal'
import { BookOpen, LayoutGrid } from 'lucide-react'

interface Props { eventId: string; open: boolean; onClose: () => void }

export default function ReportTypeModal({ eventId, open, onClose }: Props) {
  const navigate = useNavigate()
  function choose(type: 'seminar' | 'exhibition') {
    onClose()
    navigate(`/report/${type}/${eventId}`)
  }
  return (
    <Modal open={open} onClose={onClose} title="⑰ 보고서 유형 선택" width="max-w-sm">
      <p className="text-sm text-gray-500 mb-4">이 행사의 보고서 형식을 선택하세요:</p>
      <div className="grid grid-cols-2 gap-3">
        <button onClick={() => choose('seminar')}
          className="flex flex-col items-center gap-3 p-5 border-2 border-gray-200 rounded-xl hover:border-navy-500 hover:bg-navy-50 transition-all group">
          <div className="w-12 h-12 rounded-xl bg-navy-50 group-hover:bg-navy-100 flex items-center justify-center transition-colors">
            <BookOpen className="w-6 h-6 text-navy-500" />
          </div>
          <div className="text-center">
            <p className="text-sm font-bold text-navy-600">⑭ 세미나</p>
            <p className="text-xs text-gray-400 mt-0.5">토론회·포럼·컨퍼런스</p>
          </div>
        </button>
        <button onClick={() => choose('exhibition')}
          className="flex flex-col items-center gap-3 p-5 border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all group">
          <div className="w-12 h-12 rounded-xl bg-blue-50 group-hover:bg-blue-100 flex items-center justify-center transition-colors">
            <LayoutGrid className="w-6 h-6 text-blue-500" />
          </div>
          <div className="text-center">
            <p className="text-sm font-bold text-blue-600">⑮ 전시회</p>
            <p className="text-xs text-gray-400 mt-0.5">박람회·전시회</p>
          </div>
        </button>
      </div>
    </Modal>
  )
}
