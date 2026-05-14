// src/components/shared/Toast.tsx
import { useState, useCallback, useEffect } from 'react'
import { CheckCircle, XCircle, AlertCircle, X } from 'lucide-react'
type ToastType = 'success' | 'error' | 'info'
interface ToastItem { id: number; type: ToastType; message: string }
let _add: ((type: ToastType, message: string) => void) | null = null
export const toast = {
  success: (msg: string) => _add?.('success', msg),
  error:   (msg: string) => _add?.('error', msg),
  info:    (msg: string) => _add?.('info', msg),
}
export default function ToastContainer() {
  const [items, setItems] = useState<ToastItem[]>([])
  const remove = useCallback((id: number) => setItems((p) => p.filter((t) => t.id !== id)), [])
  useEffect(() => {
    _add = (type, message) => {
      const id = Date.now()
      setItems((p) => [...p, { id, type, message }])
      setTimeout(() => remove(id), 4000)
    }
    return () => { _add = null }
  }, [remove])
  const icons  = { success: CheckCircle, error: XCircle, info: AlertCircle }
  const colors = {
    success: 'bg-green-50 border-green-200 text-green-800',
    error:   'bg-red-50   border-red-200   text-red-800',
    info:    'bg-blue-50  border-blue-200  text-blue-800',
  }
  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2 pointer-events-none">
      {items.map((t) => {
        const Icon = icons[t.type]
        return (
          <div key={t.id} className={`flex items-start gap-3 px-4 py-3 rounded-xl border shadow-lg max-w-sm pointer-events-auto animate-slide-up ${colors[t.type]}`}>
            <Icon className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <p className="text-sm flex-1">{t.message}</p>
            <button onClick={() => remove(t.id)} className="opacity-60 hover:opacity-100">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
