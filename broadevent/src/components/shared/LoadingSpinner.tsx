// src/components/shared/LoadingSpinner.tsx
interface Props { fullscreen?: boolean; size?: 'sm' | 'md' | 'lg'; label?: string }
export default function LoadingSpinner({ fullscreen, size = 'md', label }: Props) {
  const sz = size === 'sm' ? 'w-5 h-5' : size === 'lg' ? 'w-12 h-12' : 'w-8 h-8'
  const spinner = (
    <div className="flex flex-col items-center gap-3">
      <div className={`${sz} border-2 border-navy-100 border-t-navy-500 rounded-full animate-spin`} />
      {label && <p className="text-sm text-navy-500 font-medium">{label}</p>}
    </div>
  )
  if (fullscreen) return (
    <div className="loading-overlay">
      <div className="bg-white rounded-2xl p-8 shadow-xl">{spinner}</div>
    </div>
  )
  return spinner
}
