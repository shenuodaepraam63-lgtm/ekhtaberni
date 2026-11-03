import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { supabase } from '../lib/supabase'
import { persistGet, persistRemove } from '../lib/usePersist'
import { Student, Group, Exam } from '../types'

export default function StudentPortal() {
  const navigate = useNavigate()
  const location = useLocation()
  const notice = (location.state || {}) as { alreadySubmitted?: boolean; justSubmitted?: boolean; totalScore?: number | null; pendingEssay?: boolean }
  const [student, setStudent] = useState<Student | null>(null)
  const [group, setGroup] = useState<Group | null>(null)
  const [activeExam, setActiveExam] = useState<Exam | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Try sessionStorage first, then localStorage
    const studentId = sessionStorage.getItem('student_id') || persistGet('student_id')
    if (!studentId) {
      navigate('/student')
      return
    }
    // Sync to sessionStorage if came from localStorage
    sessionStorage.setItem('student_id', studentId)
    fetchData(studentId)
  }, [navigate])

  const fetchData = async (studentId: string) => {
    const { data: studentData } = await supabase
      .from('students')
      .select('*, groups(*)')
      .eq('id', studentId)
      .single()

    if (!studentData) {
      navigate('/student')
      return
    }

    setStudent(studentData)
    setGroup(studentData.groups as unknown as Group)

    // Check for active exam
    const { data: exams } = await supabase
      .from('exams')
      .select('*, exam_groups!inner(group_id)')
      .eq('exam_groups.group_id', studentData.group_id)
      .eq('status', 'active')
      .single()

    setActiveExam(exams || null)
    setLoading(false)
  }

  const handleLogout = () => {
    sessionStorage.clear()
    persistRemove('student_id')
    persistRemove('student_code')
    persistRemove('student_name')
    navigate('/student')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 font-semibold">جاري التحميل...</p>
        </div>
      </div>
    )
  }

  if (!student || !group) return null

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 p-4 sm:p-6 pb-10" dir="rtl">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{ rotate: 360, scale: [1, 1.1, 1] }}
          transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
          className="absolute top-20 right-20 w-64 h-64 bg-teal-200/20 rounded-full blur-3xl"
        />
        <motion.div
          animate={{ rotate: -360, scale: [1, 1.2, 1] }}
          transition={{ duration: 35, repeat: Infinity, ease: "linear" }}
          className="absolute bottom-20 left-20 w-80 h-80 bg-cyan-200/20 rounded-full blur-3xl"
        />
      </div>

      <div className="max-w-4xl mx-auto relative z-10">
        {/* Header Card */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-white/90 to-white/70 backdrop-blur-xl rounded-3xl shadow-xl border border-white/50 p-5 sm:p-8 mb-6 sm:mb-8"
        >
          {(notice.justSubmitted || notice.alreadySubmitted) && (
            <div className={`mb-5 rounded-2xl p-4 font-bold text-sm ${notice.alreadySubmitted ? 'bg-amber-50 text-amber-800' : 'bg-emerald-50 text-emerald-800'}`}>
              {notice.alreadySubmitted
                ? 'تم تسليم هذا الاختبار مسبقاً. لا يمكن الدخول إليه مرة أخرى.'
                : notice.pendingEssay
                  ? 'تم إرسال إجاباتك. الجزء المقالي قيد تصحيح المدرس.'
                  : `تم إرسال الاختبار بنجاح${notice.totalScore != null ? ` — درجتك ${notice.totalScore}%` : ''}.`}
            </div>
          )}
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-5">
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                className="bg-gradient-to-br from-teal-500 to-cyan-500 w-20 h-20 rounded-2xl flex items-center justify-center text-3xl shadow-lg"
              >
                👨‍🎓
              </motion.div>
              <div>
                <h1 className="text-3xl font-black text-gray-800 mb-1">مرحباً، {student.name}</h1>
                <p className="text-teal-600 font-bold">{group.name}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="bg-teal-100 text-teal-700 px-3 py-1 rounded-lg font-mono text-sm font-bold">
                    {student.code}
                  </span>
                  <span className="text-xs text-gray-400">كود الدخول</span>
                </div>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="bg-gradient-to-r from-gray-100 to-gray-50 text-gray-700 px-6 py-3 rounded-xl font-bold hover:from-gray-200 hover:to-gray-100 transition-all shadow-sm hover:shadow-md"
            >
              خروج
            </button>
          </div>
        </motion.div>

        {/* Active Exam or Message */}
        {activeExam ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gradient-to-br from-white/90 to-white/70 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/50 p-12 text-center mb-8 overflow-hidden relative"
          >
            {/* Animated Background Pattern */}
            <div className="absolute inset-0 opacity-5">
              <div className="absolute inset-0" style={{ 
                backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)',
                backgroundSize: '30px 30px'
              }} />
            </div>

            <motion.div
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="text-8xl mb-6 relative z-10"
            >
              📝
            </motion.div>
            
            <div className="relative z-10">
              <span className="inline-block bg-gradient-to-r from-teal-500 to-cyan-500 text-white px-4 py-1 rounded-full text-xs font-bold mb-4">
                🔴 اختبار نشط
              </span>
              <h2 className="text-4xl font-black text-gray-800 mb-3">{activeExam.title}</h2>
              <div className="flex items-center justify-center gap-6 text-gray-600 mb-8">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">⏱</span>
                  <span className="font-bold">{activeExam.duration_mins} دقيقة</span>
                </div>
              </div>
              
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate(`/exam/${activeExam.id}`)}
                className="bg-gradient-to-r from-teal-600 to-cyan-600 text-white px-12 py-5 rounded-2xl font-black text-xl hover:from-teal-700 hover:to-cyan-700 transition-all shadow-xl hover:shadow-2xl flex items-center gap-3 mx-auto"
              >
                <span>ابدأ الاختبار الآن</span>
                <span className="text-2xl">→</span>
              </motion.button>

              <p className="text-gray-500 text-sm mt-6">
                تأكد من اتصالك بالإنترنت قبل البدء
              </p>
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-white/90 to-white/70 backdrop-blur-xl rounded-3xl shadow-xl border border-white/50 p-10 mb-8"
          >
            <div className="flex items-center gap-4 mb-6">
              <div className="bg-gradient-to-br from-purple-500 to-pink-500 w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shadow-lg">
                💬
              </div>
              <h2 className="text-2xl font-black text-gray-800">رسالة من المدرس</h2>
            </div>
            
            {group.message ? (
              <div className="bg-gradient-to-br from-teal-50 to-cyan-50 border-2 border-teal-200 rounded-2xl p-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-teal-300/20 rounded-full -translate-y-1/2 translate-x-1/2" />
                <p className="text-gray-700 leading-relaxed whitespace-pre-wrap text-lg relative z-10">{group.message}</p>
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-6xl mb-4 opacity-20">📭</div>
                <p className="text-gray-400 text-lg">لا توجد رسائل حالياً</p>
              </div>
            )}
          </motion.div>
        )}

        {/* Quick Actions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <motion.button
            whileHover={{ scale: 1.02, y: -4 }}
            onClick={() => navigate('/student/results')}
            className="bg-gradient-to-br from-white/90 to-white/70 backdrop-blur-xl rounded-2xl shadow-lg border border-white/50 p-8 text-right hover:shadow-xl transition-all group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="bg-gradient-to-br from-blue-500 to-indigo-500 w-14 h-14 rounded-xl flex items-center justify-center text-2xl shadow-md group-hover:scale-110 transition-transform">
                  📊
                </div>
                <div>
                  <p className="font-black text-gray-800 text-xl mb-1">نتائجي</p>
                  <p className="text-sm text-gray-500">عرض جميع النتائج السابقة</p>
                </div>
              </div>
              <span className="text-gray-400 group-hover:text-teal-600 transition-colors text-2xl group-hover:translate-x-2 transition-transform">
                ←
              </span>
            </div>
          </motion.button>

          <motion.div
            whileHover={{ scale: 1.02, y: -4 }}
            className="bg-gradient-to-br from-white/90 to-white/70 backdrop-blur-xl rounded-2xl shadow-lg border border-white/50 p-8"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="bg-gradient-to-br from-green-500 to-emerald-500 w-14 h-14 rounded-xl flex items-center justify-center text-2xl shadow-md">
                ✅
              </div>
              <div>
                <p className="font-black text-gray-800 text-xl">الحالة</p>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">حساب نشط</span>
              <span className="bg-green-100 text-green-700 px-3 py-1 rounded-lg font-bold text-sm">
                ✓ مفعّل
              </span>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
