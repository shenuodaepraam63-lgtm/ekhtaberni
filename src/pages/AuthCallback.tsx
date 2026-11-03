import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { supabase } from '../lib/supabase'
import { ADMIN_EMAIL } from '../contexts/AuthContext'

export default function AuthCallback() {
  const navigate = useNavigate()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { navigate('/teacher/login'); return }

      // Admin bypass - go directly to admin dashboard
      if (session.user.email === ADMIN_EMAIL) {
        navigate('/admin')
        return
      }

      supabase.from('teachers').select('*').eq('user_id', session.user.id).single()
        .then(({ data: teacher }) => {
          if (!teacher) navigate('/teacher/onboarding')
          else if (teacher.status === 'pending') navigate('/teacher/pending')
          else if (teacher.status === 'active') navigate('/teacher/dashboard')
          else navigate('/teacher/login')
        })
    })
  }, [navigate])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-indigo-900">
      <div className="text-center text-white">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-16 h-16 border-4 border-white border-t-transparent rounded-full mx-auto mb-6"
        />
        <p className="text-xl font-bold text-white/80">جاري تسجيل الدخول...</p>
      </div>
    </div>
  )
}
