import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { supabase } from '../lib/supabase'
import { persistGet } from '../lib/usePersist'
import { Submission } from '../types'

type SubWithExam = Submission & { exams?: { title: string } }

export default function StudentResults() {
  const navigate = useNavigate()
  const [submissions, setSubmissions] = useState<SubWithExam[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const studentId = sessionStorage.getItem('student_id') || persistGet('student_id')
    if (!studentId) { navigate('/student'); return }
    sessionStorage.setItem('student_id', studentId)
    fetchSubmissions(studentId)
  }, [navigate])

  const fetchSubmissions = async (studentId: string) => {
    const { data } = await supabase
      .from('submissions')
      .select('*, exams(title)')
      .eq('student_id', studentId)
      .order('submitted_at', { ascending: false })
    setSubmissions((data || []) as SubWithExam[])
    setLoading(false)
  }

  const getScoreColor = (score: number | null) => {
    if (score === null) return '#f59e0b'
    if (score >= 85) return '#16a34a'
    if (score >= 60) return '#2563eb'
    if (score >= 40) return '#d97706'
    return '#dc2626'
  }

  const getScoreLabel = (score: number | null) => {
    if (score === null) return 'قيد التصحيح'
    if (score >= 85) return 'ممتاز'
    if (score >= 75) return 'جيد جداً'
    if (score >= 60) return 'جيد'
    if (score >= 40) return 'مقبول'
    return 'ضعيف'
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 to-cyan-50">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-16 h-16 border-4 border-teal-500 border-t-transparent rounded-full"
        />
      </div>
    )
  }

  const avg = submissions.filter(s => s.total_score !== null).length > 0
    ? Math.round(submissions.filter(s => s.total_score !== null).reduce((a, s) => a + (s.total_score || 0), 0) / submissions.filter(s => s.total_score !== null).length)
    : null

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-50 pb-10" dir="rtl">
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-600 to-cyan-600 text-white px-6 py-8">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black mb-1">📊 نتائجي</h1>
            <p className="text-teal-100">{submissions.length} اختبار مكتمل</p>
          </div>
          <button onClick={() => navigate('/student/portal')}
            className="bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white px-5 py-3 rounded-xl font-bold transition-all">
            ← رجوع
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 pt-8">
        {/* Summary Cards */}
        {submissions.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            {[
              { label: 'إجمالي الاختبارات', value: submissions.length, icon: '📝', color: 'from-blue-500 to-indigo-500' },
              { label: 'المتوسط العام', value: avg !== null ? `${avg}%` : '—', icon: '📈', color: 'from-teal-500 to-cyan-500' },
              { label: 'اختبارات بامتياز', value: submissions.filter(s => (s.total_score || 0) >= 85).length, icon: '🏆', color: 'from-yellow-500 to-orange-500' },
            ].map((stat, i) => (
              <motion.div key={i}
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                whileHover={{ y: -4 }}
                className="bg-white rounded-2xl shadow-lg p-6 relative overflow-hidden"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${stat.color} opacity-5`} />
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center text-2xl mb-3 shadow-md`}>
                  {stat.icon}
                </div>
                <p className="text-gray-500 text-sm font-semibold">{stat.label}</p>
                <p className="text-3xl font-black text-gray-800">{stat.value}</p>
              </motion.div>
            ))}
          </div>
        )}

        {submissions.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="bg-white rounded-3xl shadow-lg p-16 text-center">
            <div className="text-7xl mb-4 opacity-20">📭</div>
            <p className="text-gray-400 text-xl">لا توجد نتائج حتى الآن</p>
            <p className="text-gray-300 mt-2">ستظهر نتائجك هنا بعد إتمام الاختبارات</p>
          </motion.div>
        ) : (
          <div className="space-y-4">
            {submissions.map((sub, idx) => {
              const score = sub.total_score
              const color = getScoreColor(score)
              const label = getScoreLabel(score)
              const hasCheat = sub.cheat_log && sub.cheat_log.length > 0

              return (
                <motion.div key={sub.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.06 }}
                  whileHover={{ x: 4 }}
                  className="bg-white rounded-2xl shadow-md p-6 border border-gray-100 hover:shadow-lg transition-all"
                >
                  <div className="flex items-center gap-5">
                    {/* Score Circle */}
                    <div className="relative w-20 h-20 flex-shrink-0">
                      <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
                        <circle cx="40" cy="40" r="30" stroke="#f3f4f6" strokeWidth="8" fill="none" />
                        {score !== null && (
                          <circle cx="40" cy="40" r="30" stroke={color} strokeWidth="8" fill="none"
                            strokeDasharray={`${(score / 100) * 188.5} 188.5`}
                            strokeLinecap="round"
                            style={{ transition: 'stroke-dasharray 1s ease' }}
                          />
                        )}
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-sm font-black" style={{ color }}>
                          {score !== null ? `${score}%` : '?'}
                        </span>
                      </div>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-black text-gray-800 text-xl mb-1 truncate">
                        {sub.exams?.title || 'اختبار'}
                      </h3>
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="text-gray-400 text-sm">
                          {new Date(sub.submitted_at).toLocaleString('ar-EG')}
                        </span>
                        <span className="text-xs font-bold px-2 py-1 rounded-lg"
                          style={{ background: color + '20', color }}>
                          {label}
                        </span>
                        <span className="text-xs text-gray-400">محاولة {sub.attempt_num}</span>
                        {hasCheat && (
                          <span className="text-xs text-red-500 font-bold bg-red-50 px-2 py-1 rounded-lg">
                            ⚠️ تحذير غش
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Status Badge */}
                    {score === null && (
                      <div className="bg-amber-100 text-amber-700 px-4 py-2 rounded-xl font-bold text-sm flex-shrink-0">
                        ⏳ قيد التصحيح
                      </div>
                    )}
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
