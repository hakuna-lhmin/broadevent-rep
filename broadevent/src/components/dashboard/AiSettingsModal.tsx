// src/components/dashboard/AiSettingsModal.tsx
import { useState, useEffect } from 'react'
import Modal from '@/components/shared/Modal'
import { toast } from '@/components/shared/Toast'
import type { AiProvider } from '@/lib/ai'

const PROVIDERS: { value: AiProvider; label: string; desc: string }[] = [
  { value: 'codex',  label: 'OpenAI GPT-4o (기본 권장)',   desc: '웹 검색 기능 포함. 실시간 행사 정보 검색에 최적화.' },
  { value: 'claude', label: 'Anthropic Claude',            desc: '직접 API 호출 — 개발 환경 전용.' },
  { value: 'worker', label: 'Cloudflare Worker 프록시',    desc: '운영 환경 권장 — API 키가 서버에서만 관리됩니다.' },
]
const MODEL_PRESETS: Record<AiProvider, string[]> = {
  codex:  ['gpt-4o', 'gpt-4o-mini', 'o3'],
  claude: ['claude-sonnet-4-20250514', 'claude-haiku-4-5-20251001'],
  worker: ['gpt-4o', 'claude-sonnet-4-20250514'],
}

interface Props { open: boolean; onClose: () => void }

export default function AiSettingsModal({ open, onClose }: Props) {
  const [provider, setProvider] = useState<AiProvider>('codex')
  const [model,    setModel]    = useState('gpt-4o')

  useEffect(() => {
    if (!open) return
    const p = (localStorage.getItem('ai_provider') as AiProvider | null)
           || (import.meta.env.VITE_AI_PROVIDER as AiProvider | undefined)
           || 'codex'
    const m = localStorage.getItem('ai_model')
           || import.meta.env.VITE_AI_MODEL
           || MODEL_PRESETS[p][0]
    setProvider(p); setModel(m)
  }, [open])

  function handleProviderChange(p: AiProvider) {
    setProvider(p); setModel(MODEL_PRESETS[p][0])
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

        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">공급자 선택</p>
          <div className="space-y-2">
            {PROVIDERS.map((p) => (
              <label key={p.value}
                className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all
                  ${provider === p.value ? 'border-navy-500 bg-navy-50' : 'border-gray-100 hover:border-gray-200 bg-white'}`}>
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

        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">모델 선택</p>
          <div className="flex flex-wrap gap-2 mb-2">
            {MODEL_PRESETS[provider].map((m) => (
              <button key={m} onClick={() => setModel(m)}
                className={`px-3 py-1 text-xs rounded-full border transition-colors
                  ${model === m ? 'bg-navy-500 text-white border-navy-500' : 'text-gray-600 border-gray-200 hover:border-navy-400'}`}>
                {m}
              </button>
            ))}
          </div>
          <input value={model} onChange={(e) => setModel(e.target.value)}
            placeholder="또는 모델명 직접 입력…"
            className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-navy-400" />
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 leading-relaxed">
          <strong>API 키</strong>는 <code className="bg-amber-100 px-1 rounded">.env</code> 파일에서 설정합니다
          (<code>VITE_OPENAI_API_KEY</code> / <code>VITE_CLAUDE_API_KEY</code>).<br />
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
