// src/components/reports/ReportFormShared.tsx
import { useState } from 'react'

export interface VolumeSettings {
  titleFontSize:       number
  subtitleFontSize:    number
  bodyFontSize:        number
  totalPages:          number
  useCustomRequirements: boolean
  customRequirements:  string
}
export const DEFAULT_VOLUME: VolumeSettings = {
  titleFontSize: 16, subtitleFontSize: 13, bodyFontSize: 11,
  totalPages: 5, useCustomRequirements: false, customRequirements: '',
}

interface VolumeProps { value: VolumeSettings; onChange: (v: VolumeSettings) => void }
export function VolumeSettingsForm({ value, onChange }: VolumeProps) {
  function set(k: keyof VolumeSettings, v: unknown) { onChange({ ...value, [k]: v }) }
  return (
    <div className="space-y-4">
      {/* 작성 요구사항 */}
      <div>
        <label className="flex items-center gap-2 cursor-pointer mb-2">
          <input type="checkbox" checked={value.useCustomRequirements}
            onChange={(e) => set('useCustomRequirements', e.target.checked)}
            className="rounded border-gray-300 text-navy-500 focus:ring-navy-400" />
          <span className="text-sm font-medium text-gray-700">보고서 작성 요구사항</span>
          <span className="text-xs text-gray-400">(목차 순서, 분량 조절 등 특별 요청 사항)</span>
        </label>
        {value.useCustomRequirements && (
          <textarea
            value={value.customRequirements}
            onChange={(e) => set('customRequirements', e.target.value)}
            placeholder="예) 1장은 요약으로 시작, 3장 분량을 2페이지 이상, 전체적으로 표와 도식 활용…"
            rows={3}
            className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-navy-400 resize-none"
          />
        )}
      </div>
      {/* 분량 설정 */}
      <div>
        <p className="text-sm font-semibold text-navy-600 mb-3">보고서 분량 (MS Word 기준)</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {([
            { key: 'titleFontSize',    label: '제목 크기 (pt)' },
            { key: 'subtitleFontSize', label: '소제목 크기 (pt)' },
            { key: 'bodyFontSize',     label: '본문 크기 (pt)' },
            { key: 'totalPages',       label: '총 페이지 수' },
          ] as { key: keyof VolumeSettings; label: string }[]).map(({ key, label }) => (
            <div key={key}>
              <label className="block text-xs text-gray-500 mb-1">{label}</label>
              <input type="number" min={1} max={200}
                value={value[key] as number}
                onChange={(e) => set(key, Number(e.target.value))}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-navy-400" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* 클릭으로 인라인 편집되는 필드 */
interface EditableProps { label: string; value: string; onChange: (v: string) => void; type?: 'text' | 'url' }
export function EditableField({ label, value, onChange, type = 'text' }: EditableProps) {
  const [editing, setEditing] = useState(false)
  if (!value && !editing) return null
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      {editing
        ? <input autoFocus type={type} value={value} onChange={(e) => onChange(e.target.value)}
            onBlur={() => setEditing(false)}
            className="w-full text-sm border border-navy-400 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-navy-400" />
        : <div onClick={() => setEditing(true)}
            className="text-sm text-gray-700 px-3 py-2 border border-transparent hover:border-gray-200 rounded-lg cursor-text min-h-[36px]">
            {value || <span className="text-gray-300">클릭하여 입력</span>}
          </div>}
    </div>
  )
}
