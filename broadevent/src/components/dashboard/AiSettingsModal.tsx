// src/components/dashboard/AiSettingsModal.tsx
import { useState, useEffect } from 'react'
import Modal from '@/components/shared/Modal'
import { toast } from '@/components/shared/Toast'
import type { AiProvider } from '@/lib/ai'

const PROVIDERS: { value: AiProvider; label: string; desc: string }[] = [
  { value: 'codex',  label: 'OpenAI GPT 계열 (기본 권장)',   desc: '웹 검색 포함. gpt-4o-mini(무료) 또는 gpt-4o(유료) 선택 가능.' },
  { value: 'claude', label: 'Anthropic Claude',              desc: '직접 API 호출 — 로컬 개발 환경 전용.' },
  { value: 'worker', label: 'Cloudflare Worker 프록시',      desc: '운영 환경 권장 — API 키가 서버에서만 관리됩니다.' },
]

// 모델 목록 — 비용 표시 포함
const MODEL_PRESETS: Record<AiProvider, { model: string; label: string; cost: string }[]> = {
  codex: [
    { model: 'gpt-4o-mini',  label: 'GPT-4o Mini',  cost: '매우 저렴 ★ 무료한도 적합' },
    { model: 'gpt-4o',       label: 'GPT-4o',        cost: '유료 ($5 크레딧 필요)' },
    { model: 'o3',           label: 'o3',             cost: '프리미엄 (고비용)' },
  ],
  claude: [
    { model: 'claude-haiku-4-5-20251001',   label: 'Claude Haiku',   cost: '저렴 ★ 무료한도 적합' },
    { model: 'claude-sonnet-4-20250514',    label: 'Claude Sonnet',  cost: '중간 (유료)' },
  ],
  worker: [
    { model: 'gpt-4o-mini', label: 'GPT-4o Mini (Worker)', cost: '서버에서 처리' },
    { model: 'gpt-4o',      label: 'GPT-4o (Worker)',       cost: '서버에서 처리' },
  ],
}

interface Props { open: boolean; onClose: () => void }

export default function AiSettingsModal({ open, onClose }: Props) {
  const [provider, setProvider] = useState<AiProvider>('codex')
  const [model,    setModel]    = useState('gpt-4o-mini')

  useEffect(() => {
    if (!open) return
    const p = (localStorage.getItem('ai_provider') as AiProvider | null)
           || (import.meta.env.VITE_AI_PROVIDER as AiProvider | undefined)
           || 'codex'
    const m = localStorage.getItem('ai_model')
           || import.meta.env.VITE_AI_MODEL
           || 'gpt-4o-mini'
    setProvider(p); setModel(m)
  }, [open])

  function handleProviderChange(p: AiProvider) {
    setProvider(p)
    setModel(MODEL_PRESETS[p][0].model)
  }

  function handleSave() {
    localStorage.setItem('ai_provider', provider)
    localStorage.setItem('ai_model',    model)
    toast.success('AI 설정이 저장되었습니다. 페이지를 새로 고칩니다…')
    setTimeout(() => window.location.reload(), 1000)
  }

  return (
    <Modal open={open} onClose={onClose} title="⚙ AI 공급자 설정" width="max-w-md">
      <div className="space-y-5">

        {/* 공급자 선택 */}
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">공급자 선택</p>
          <div className="space-y-2">
            {PROVIDERS.map((p) => (
              <label key={p.value}
                className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all
                  ${provider === p.value ? 'border-navy-500 bg-navy-50' : 'border-gray-100 hover:border-gray-200'}`}>
                <input type="radio" name="ai-provider" value={p.value}
                  checked={provider === p.value}
                  onChange={() => handleProviderChange(p.value)}
                  className="mt-0.5 accent-navy-500" />
                <div>
                  <p className="text-sm font-semibold text-gray-800">{p.label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{p.desc}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* 모델 선택 — 비용 정보 포함 */}
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">모델 선택</p>
          <div className="space-y-1.5 mb-2">
            {MODEL_PRESETS[provider].map((m) => (
              <label key={m.model}
                className={`flex items-center gap-3 px-3 py-2 rounded-xl border cursor-pointer transition-all
                  ${model === m.model ? 'border-navy-500 bg-navy-50' : 'border-gray-100 hover:border-gray-200'}`}>
                <input type="radio" name="ai-model" value={m.model}
                  checked={model === m.model}
                  onChange={() => setModel(m.model)}
                  className="accent-navy-500" />
                <div className="flex-1">
                  <span className="text-sm font-medium text-gray-800">{m.label}</span>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  m.cost.includes('무료') ? 'bg-green-50 text-green-700' :
                  m.cost.includes('저렴') ? 'bg-blue-50 text-blue-700' :
                  'bg-gray-50 text-gray-500'
                }`}>{m.cost}</span>
              </label>
            ))}
          </div>
          <input value={model} onChange={(e) => setModel(e.target.value)}
            placeholder="또는 모델명 직접 입력…"
            className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-navy-400" />
        </div>

        {/* 무료 한도 안내 박스 */}
        <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-xs text-green-800 leading-relaxed">
          <p className="font-semibold mb-1">💡 무료/저비용 운영 팁</p>
          <p>• <strong>gpt-4o-mini</strong>는 gpt-4o 대비 비용이 약 20분의 1로 행사 검색·기사 요약에 충분합니다.</p>
          <p>• 보고서 작성처럼 긴 내용이 필요할 때만 gpt-4o로 일시 전환하세요.</p>
          <p>• OpenAI 무료 크레딧($5)으로 gpt-4o-mini 약 1,000회 이상 검색이 가능합니다.</p>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 leading-relaxed">
          <strong>API 키</strong>는 <code className="bg-amber-100 px-1 rounded">.env</code> 파일에서 설정합니다.
          운영 환경에서는 <strong>Cloudflare Worker 프록시</strong>를 사용하면 API 키가 브라우저에 노출되지 않습니다.
        </div>

        <button onClick={handleSave}
          className="w-full py-2.5 bg-navy-500 hover:bg-navy-600 text-white font-bold rounded-xl text-sm transition-colors">
          저장 및 적용
        </button>
      </div>
    </Modal>
  )
}
