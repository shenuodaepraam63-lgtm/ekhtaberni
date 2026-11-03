import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ErrorBoundary } from './components/ErrorBoundary'
import LandingPage from './pages/LandingPage'
import TeacherLogin from './pages/TeacherLogin'
import TeacherOnboarding from './pages/TeacherOnboarding'
import TeacherPending from './pages/TeacherPending'
import TeacherDashboard from './pages/TeacherDashboard'
import AdminDashboard from './pages/AdminDashboard'
import StudentEntry from './pages/StudentEntry'
import StudentPortal from './pages/StudentPortal'
import StudentResults from './pages/StudentResults'
import ExamPage from './pages/ExamPage'
import AuthCallback from './pages/AuthCallback'

function AppRoutes() {
  const { teacher, user, loading, isAdmin } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-indigo-900">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-white/50 border-t-white rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/70 text-lg font-semibold">جاري التحميل...</p>
        </div>
      </div>
    )
  }

  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/teacher/login" element={
        isAdmin ? <Navigate to="/admin" /> :
        teacher?.status === 'active' ? <Navigate to="/teacher/dashboard" /> :
        <TeacherLogin />
      } />
      <Route path="/teacher/onboarding" element={
        isAdmin ? <Navigate to="/admin" /> :
        user && !teacher ? <TeacherOnboarding /> : <Navigate to="/" />
      } />
      <Route path="/teacher/pending" element={
        isAdmin ? <Navigate to="/admin" /> :
        teacher?.status === 'pending' ? <TeacherPending /> : <Navigate to="/" />
      } />
      <Route path="/teacher/dashboard" element={
        teacher?.status === 'active' ? <TeacherDashboard /> : <Navigate to="/teacher/login" />
      } />
      <Route path="/admin" element={
        isAdmin ? <AdminDashboard /> : <Navigate to="/teacher/login" />
      } />
      <Route path="/student" element={<StudentEntry />} />
      <Route path="/student/portal" element={<StudentPortal />} />
      <Route path="/student/results" element={<StudentResults />} />
      <Route path="/exam/:examId" element={<ExamPage />} />
    </Routes>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter basename="/ekhtaberni">
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  )
}
