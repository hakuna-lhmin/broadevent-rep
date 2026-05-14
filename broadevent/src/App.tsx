// src/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useAppStore } from '@/store'
import LoginPage            from '@/components/auth/LoginPage'
import Dashboard            from '@/components/dashboard/Dashboard'
import SeminarReportPage    from '@/components/reports/SeminarReportPage'
import ExhibitionReportPage from '@/components/reports/ExhibitionReportPage'
import LoadingSpinner       from '@/components/shared/LoadingSpinner'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const authReady = useAppStore((s) => s.authReady)
  const user      = useAppStore((s) => s.user)
  if (!authReady) return <LoadingSpinner fullscreen label="인증 확인 중…" />
  if (!user)      return <Navigate to="/login" replace />
  return <>{children}</>
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const authReady = useAppStore((s) => s.authReady)
  const user      = useAppStore((s) => s.user)
  if (!authReady) return <LoadingSpinner fullscreen label="인증 확인 중…" />
  if (user)       return <Navigate to="/" replace />
  return <>{children}</>
}

export default function App() {
  useAuth()  // onAuthStateChanged 리스너 등록

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
        <Route path="/"      element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/report/seminar/:eventId"
          element={<ProtectedRoute><SeminarReportPage /></ProtectedRoute>} />
        <Route path="/report/exhibition/:eventId"
          element={<ProtectedRoute><ExhibitionReportPage /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
