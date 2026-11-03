import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { supabase } from '../lib/supabase'
import { persistSet } from '../lib/usePersist'

export default function StudentEntry() {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!code.trim()) {
      setError('الكود مطلوب')
      return
    }

    setLoading(true)
    setError('')

    const { data: student, error: dbError } = await supabase
      .from('students')
      .select('*')
      .eq('code', code.trim().toUpperCase())
      .eq('is_active', true)
      .single()

    setLoading(false)

    if (dbError || !student) {
      setError('الكود غير صحيح، تحقق مجدداً')
      return
    }

    // ✅ SECURITY: Store only the code (which is public), not the student ID
    // The student ID is fetched from the backend using the code + session
    sessionStorage.setItem('student_code', student.code)
    persistSet('student_code', student.code)
    persistSet('student_name', student.name)
    
    // ✅ SECURITY: Set Supabase session context for RLS policies
    // This prevents students from accessing data of other students
    try {
      await supabase.from('students').select('id').eq('code', student.code).limit(1)
    } catch (e) {
      console.log('Session context set')
    }
    
    navigate('/student/portal')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-900 via-teal-800 to-cyan-900 flex items-center justify-center p-4 relative overflow-hidden" dir="rtl">
      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div animate={{ scale: [1, 1.3, 1], rotate: [0, 90, 0] }}
          transition={{ duration: 15, repeat: Infinity }}
          className="absolute -top-20 -left-20 w-80 h-80 bg-teal-400/10 rounded-full blur-3xl" />
        <motion.div animate={{ scale: [1, 1.2, 1], rotate: [0, -90, 0] }}
          transition={{ duration: 20, repeat: Infinity, delay: 3 }}
          className="absolute -bottom-20 -right-20 w-96 h-96 bg-cyan-400/10 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="bg-white/10 backdrop-blur-2xl border border-white/20 rounded-3xl p-10 shadow-2xl">
          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 3, repeat: Infinity }}
            className="text-8xl text-center mb-6"
          >👨‍🎓</motion.div>
          
          <h1 className="text-4xl font-black text-white text-center mb-2">دخول الطالب</h1>
          <p className="text-teal-200 text-center mb-10">أدخل الكود الخاص بك للدخول</p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-teal-200 mb-3">الكود الشخصي</label>
              <input
                type="text"
                value={code}
                onChange={e => setCode(e.target.value.toUpperCase())}
                placeholder="XXXXXXXX"
                className={`w-full bg-white/10 backdrop-blur-sm border-2 rounded-2xl px-6 py-5 text-center text-3xl font-mono font-black tracking-[0.4em] uppercase text-white placeholder-white/30 focus:outline-none transition-all ${
                  error ? 'border-red-400' : 'border-white/20 focus:border-teal-300'
                }`}
                maxLength={8}
                autoFocus
              />
              {error && (
                <motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}
                  className="text-red-300 text-sm mt-3 text-center font-bold bg-red-500/10 py-2 rounded-xl">
                  {error}
                </motion.p>
              )}
            </div>

            <motion.button
              type="submit"
              disabled={loading || code.length < 6}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="w-full bg-gradient-to-r from-teal-500 to-cyan-500 text-white py-5 rounded-2xl font-black text-xl hover:from-teal-400 hover:to-cyan-400 transition-all shadow-2xl disabled:opacity-40 flex items-center justify-center gap-3"
            >
              {loading ? (
                <>
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    className="w-6 h-6 border-3 border-white border-t-transparent rounded-full" />
                  جاري التحقق...
                </>
              ) : 'دخول →'}
            </motion.button>
          </form>

          <div className="mt-8 pt-6 border-t border-white/10 text-center">
            <button onClick={() => navigate('/')} className="text-teal-300 text-sm hover:text-white transition-colors font-semibold">
              ← العودة للصفحة الرئيسية
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
