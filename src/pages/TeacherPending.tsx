import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export default function TeacherPending() {
  const { user, refreshTeacher } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!user) return
    // Realtime listener - when admin approves, teacher status changes to active
    const channel = supabase
      .channel('teacher-status')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'teachers',
        filter: `user_id=eq.${user.id}`,
      }, async (payload) => {
        const updated = payload.new as { status: string }
        if (updated.status === 'active') {
          await refreshTeacher()
          navigate('/teacher/dashboard')
        } else if (updated.status === 'rejected') {
          navigate('/teacher/login')
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [user, navigate, refreshTeacher])

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 flex items-center justify-center p-4" dir="rtl">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-3xl shadow-xl p-10 max-w-md w-full text-center"
      >
        <motion.div
          animate={{ rotate: [0, 10, -10, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="text-6xl mb-6"
        >⏳</motion.div>
        <h2 className="text-2xl font-black text-gray-800 mb-4">في انتظار الموافقة</h2>
        <p className="text-gray-600 leading-relaxed mb-6">
          تم إرسال طلبك بنجاح. سيتم مراجعته من قِبل الأدمن وستتلقى إشعاراً فور الموافقة.
        </p>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-amber-700 text-sm font-medium">
            الصفحة ستفتح تلقائياً عند الموافقة على طلبك
          </p>
        </div>
        <div className="mt-4 flex justify-center">
          <div className="flex gap-1">
            {[0, 1, 2].map(i => (
              <motion.div key={i} className="w-2 h-2 bg-amber-400 rounded-full"
                animate={{ scale: [1, 1.5, 1] }}
                transition={{ repeat: Infinity, duration: 1, delay: i * 0.2 }}
              />
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  )
}
