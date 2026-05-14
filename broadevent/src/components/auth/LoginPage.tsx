// src/components/auth/LoginPage.tsx
import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useAppStore } from '@/store'
import { Radio, Tv, Globe, Lock, Mail, User, Eye, EyeOff, AlertCircle } from 'lucide-react'

type Mode = 'login' | 'signup' | 'reset'

export default function LoginPage() {
  const user = useAppStore((s) => s.user)
  const { signIn, signUp, resetPassword } = useAuth()
  const [mode, setMode]       = useState<Mode>('login')
  const [email, setEmail]     = useState('')
  const [password, setPassword] = useState('')
  const [name, setName]       = useState('')
  const [showPw, setShowPw]   = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [success, setSuccess] = useState('')

  if (user) return <Navigate to="/" replace />

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(''); setSuccess('')
    setLoading(true)
    try {
      if (mode === 'login') {
        await signIn(email, password)
      } else if (mode === 'signup') {
        if (!name.trim()) { setError('이름을 입력해 주세요.'); setLoading(false); return }
        await signUp(email, password, name)
      } else {
        await resetPassword(email)
        setSuccess('비밀번호 재설정 이메일을 발송했습니다. 받은 편지함을 확인해 주세요.')
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '오류가 발생했습니다.'
      if (msg.includes('invalid-credential') || msg.includes('wrong-password')) {
        setError('이메일 또는 비밀번호가 올바르지 않습니다.')
      } else if (msg.includes('user-not-found')) {
        setError('등록되지 않은 이메일입니다.')
      } else if (msg.includes('email-already-in-use')) {
        setError('이미 사용 중인 이메일입니다.')
      } else if (msg.includes('weak-password')) {
        setError('비밀번호는 6자 이상이어야 합니다.')
      } else {
        setError(msg.replace('Firebase: ', '').replace(/\(auth\/.*\)\.?/, '').trim())
      }
    } finally {
      setLoading(false)
    }
  }

  const modeTitle: Record<Mode, string> = {
    login:  '로그인',
    signup: '신규 가입',
    reset:  '비밀번호 재설정',
  }
  const modeDesc: Record<Mode, string> = {
    login:  '이메일과 비밀번호를 입력하세요',
    signup: '정보를 입력하여 계정을 만드세요',
    reset:  '가입한 이메일로 재설정 링크를 발송합니다',
  }

  return (
    <div className="min-h-screen flex">
      {/* ── 왼쪽 브랜딩 패널 ── */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 bg-navy-600 text-white p-12 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-navy-500 opacity-30" />
          <div className="absolute -bottom-20 -left-20 w-80 h-80 rounded-full bg-navy-700 opacity-40" />
          <svg className="absolute inset-0 w-full h-full opacity-5" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
              <Radio className="w-5 h-5 text-white" />
            </div>
            <span className="text-sm font-semibold tracking-widest uppercase text-white/60">BroadEvent</span>
          </div>
          <h1 className="text-4xl font-bold leading-tight mt-6">
            방송 행사<br />
            <span className="text-blue-300">자동 알리미</span>
          </h1>
          <p className="mt-4 text-white/70 text-lg leading-relaxed">
            AI 기반 방송·언론·미디어 행사 자동 검색·추적·보고서 자동화 플랫폼
          </p>
        </div>

        <div className="relative z-10 space-y-4">
          {[
            { icon: Globe, label: 'AI 기반 국내외 행사 자동 검색' },
            { icon: Tv,    label: '스마트 달력 및 행사 통합 관리' },
            { icon: Radio, label: '세미나·전시회 보고서 자동 작성' },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                <Icon className="w-4 h-4 text-blue-300" />
              </div>
              <span className="text-white/80 text-sm">{label}</span>
            </div>
          ))}
        </div>

        <p className="relative z-10 text-white/40 text-xs">© 2026 방송 행사 자동 알리미 — 내부 전용</p>
      </div>

      {/* ── 오른쪽 폼 패널 ── */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md animate-slide-up">
          {/* 모바일 로고 */}
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <Radio className="w-6 h-6 text-navy-500" />
            <span className="text-lg font-bold text-navy-600">방송 행사 자동 알리미</span>
          </div>

          <h2 className="text-2xl font-bold text-navy-600 mb-1">{modeTitle[mode]}</h2>
          <p className="text-gray-500 text-sm mb-8">{modeDesc[mode]}</p>

          {error && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-red-700 text-sm animate-fade-in">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
          {success && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4 text-green-700 text-sm animate-fade-in">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">이름 (소속)</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text" value={name} onChange={(e) => setName(e.target.value)} required
                    placeholder="홍길동 / 미디어본부"
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-500 focus:border-transparent"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">이메일</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                  placeholder="example@broadcaster.com"
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-500 focus:border-transparent"
                />
              </div>
            </div>

            {mode !== 'reset' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">비밀번호</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type={showPw ? 'text' : 'password'} value={password}
                    onChange={(e) => setPassword(e.target.value)} required minLength={6}
                    placeholder="6자 이상"
                    className="w-full pl-10 pr-10 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-500 focus:border-transparent"
                  />
                  <button type="button" onClick={() => setShowPw((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            <button type="submit" disabled={loading}
              className="w-full py-2.5 bg-navy-500 hover:bg-navy-600 disabled:bg-navy-300 text-white font-semibold rounded-lg text-sm transition-colors">
              {loading ? '처리 중…'
                : mode === 'login'  ? '로그인'
                : mode === 'signup' ? '가입하기'
                : '재설정 메일 발송'}
            </button>
          </form>

          <div className="mt-6 text-center space-y-2 text-sm">
            {mode === 'login' && (
              <>
                <button onClick={() => { setMode('reset'); setError('') }}
                  className="text-navy-500 hover:text-navy-700 block w-full">
                  비밀번호를 잊으셨나요?
                </button>
                <p className="text-gray-500">
                  처음 방문하셨나요?{' '}
                  <button onClick={() => { setMode('signup'); setError('') }}
                    className="text-navy-500 font-semibold hover:underline">
                    신규 가입
                  </button>
                </p>
              </>
            )}
            {(mode === 'signup' || mode === 'reset') && (
              <button onClick={() => { setMode('login'); setError(''); setSuccess('') }}
                className="text-navy-500 hover:underline">
                ← 로그인으로 돌아가기
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
