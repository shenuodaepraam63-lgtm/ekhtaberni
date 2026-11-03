import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { usePersist } from '../lib/usePersist'
import { Teacher, Subject } from '../types'
import { subjectThemes } from '../theme/subjectThemes'

const SUBJECT_OPTIONS: { value: Subject; label: string; icon: string }[] = [
  { value: 'physics', label: 'فيزياء', icon: '⚛️' },
  { value: 'chemistry', label: 'كيمياء', icon: '🧪' },
  { value: 'biology', label: 'أحياء', icon: '🧬' },
  { value: 'math', label: 'رياضيات', icon: '📐' },
  { value: 'philosophy', label: 'فلسفة', icon: '🏛️' },
  { value: 'science', label: 'علوم', icon: '🔬' },
  { value: 'social', label: 'دراسات اجتماعية', icon: '👥' },
  { value: 'history', label: 'تاريخ', icon: '📜' },
  { value: 'geography', label: 'جغرافيا', icon: '🌍' },
  { value: 'psychology', label: 'علم نفس', icon: '🧠' },
  { value: 'english', label: 'إنجليزي', icon: '🇬🇧' },
  { value: 'arabic', label: 'لغة عربية', icon: '📖' },
  { value: 'other', label: 'أخرى', icon: '📚' },
]

type NavTab = 'overview' | 'pending' | 'teachers' | 'exams' | 'students' | 'submissions' | 'announcements'

interface FullStats {
  totalTeachers: number; activeTeachers: number; pendingTeachers: number; rejectedTeachers: number
  totalStudents: number; activeStudents: number; totalExams: number; activeExams: number
  totalSubmissions: number; totalGroups: number
}

interface TeacherWithStats extends Teacher { groupCount?: number }

const NAV_ITEMS: { key: NavTab; icon: string; label: string }[] = [
  { key: 'overview', icon: '📊', label: 'نظرة عامة' },
  { key: 'pending', icon: '⏳', label: 'طلبات الانضمام' },
  { key: 'teachers', icon: '🎓', label: 'المدرسون' },
  { key: 'exams', icon: '📝', label: 'الاختبارات' },
  { key: 'students', icon: '👨‍🎓', label: 'الطلاب' },
  { key: 'submissions', icon: '📬', label: 'الإجابات' },
  { key: 'announcements', icon: '📢', label: 'الإعلانات' },
]

export default function AdminDashboard() {
  const { user, signOut, isAdmin } = useAuth()
  const navigate = useNavigate()
  const [activeTab, setActiveTabRaw] = usePersist<NavTab>('admin_active_tab', 'overview')
  const setActiveTab = (tab: NavTab) => { setActiveTabRaw(tab); window.scrollTo({ top: 0 }) }
  const [stats, setStats] = useState<FullStats>({
    totalTeachers: 0, activeTeachers: 0, pendingTeachers: 0, rejectedTeachers: 0,
    totalStudents: 0, activeStudents: 0, totalExams: 0, activeExams: 0,
    totalSubmissions: 0, totalGroups: 0,
  })
  const [teachers, setTeachers] = useState<TeacherWithStats[]>([])
  const [pending, setPending] = useState<Teacher[]>([])
  const [selectedSubjects, setSelectedSubjects] = useState<Record<string, Subject>>({})
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [mobileSidebar, setMobileSidebar] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const fetchAll = useCallback(async () => {
    const [teachersRes, studentsRes, examsRes, subsRes, groupsRes] = await Promise.all([
      supabase.from('teachers').select('*').order('created_at', { ascending: false }),
      supabase.from('students').select('id, is_active'),
      supabase.from('exams').select('id, status'),
      supabase.from('submissions').select('id'),
      supabase.from('groups').select('id, teacher_id'),
    ])
    const allTeachers = (teachersRes.data || []) as Teacher[]
    const allStudents = studentsRes.data || []
    const allExams = examsRes.data || []
    const allGroups = groupsRes.data || []
    const pendingList = allTeachers.filter(t => t.status === 'pending')
    setPending(pendingList)
    setTeachers(allTeachers.map(t => ({
      ...t,
      groupCount: allGroups.filter((g: { teacher_id: string }) => g.teacher_id === t.id).length,
    })))
    setStats({
      totalTeachers: allTeachers.length,
      activeTeachers: allTeachers.filter(t => t.status === 'active').length,
      pendingTeachers: pendingList.length,
      rejectedTeachers: allTeachers.filter(t => t.status === 'rejected').length,
      totalStudents: allStudents.length,
      activeStudents: allStudents.filter((s: { is_active: boolean }) => s.is_active).length,
      totalExams: allExams.length,
      activeExams: allExams.filter((e: { status: string }) => e.status === 'active').length,
      totalSubmissions: (subsRes.data || []).length,
      totalGroups: allGroups.length,
    })
  }, [])

  useEffect(() => {
    if (!isAdmin) { navigate('/teacher/login'); return }
    fetchAll()
    const ch = supabase.channel('admin-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'teachers' }, fetchAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'exams' }, fetchAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'students' }, fetchAll)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [isAdmin, fetchAll])

  const approve = async (t: Teacher) => {
    setLoadingId(t.id)
    const { error } = await supabase.from('teachers').update({ status: 'active', subject: selectedSubjects[t.id] || 'other' }).eq('id', t.id)
    error ? showToast('فشل: ' + error.message, 'error') : showToast(`تمت الموافقة على ${t.name} ✓`)
    setLoadingId(null)
  }
  const reject = async (t: Teacher) => {
    setLoadingId(t.id)
    const { error } = await supabase.from('teachers').update({ status: 'rejected' }).eq('id', t.id)
    error ? showToast('فشل الرفض', 'error') : showToast(`تم رفض ${t.name}`)
    setLoadingId(null)
  }
  const changeSubject = async (id: string, subject: Subject) => {
    await supabase.from('teachers').update({ subject }).eq('id', id)
    showToast('تم تغيير التخصص ✓')
    fetchAll()
  }
  const toggleStatus = async (t: Teacher) => {
    setLoadingId(t.id)
    const ns = t.status === 'active' ? 'rejected' : 'active'
    await supabase.from('teachers').update({ status: ns }).eq('id', t.id)
    showToast(ns === 'active' ? `تم تفعيل ${t.name}` : `تم تعليق ${t.name}`)
    setLoadingId(null)
  }
  const deleteTeacher = async (t: Teacher) => {
    if (!confirm(`حذف "${t.name}" نهائياً؟`)) return
    setLoadingId(t.id)
    await supabase.from('teachers').delete().eq('id', t.id)
    showToast(`تم حذف ${t.name}`)
    setLoadingId(null)
  }

  const filtered = (list: Teacher[]) => {
    const q = searchQuery.toLowerCase().trim()
    if (!q) return list
    return list.filter(t => t.name.toLowerCase().includes(q) || t.phone.includes(q))
  }

  const navTo = (tab: NavTab) => { setActiveTab(tab); setMobileSidebar(false) }

  const Sidebar = ({ mobile = false }: { mobile?: boolean }) => (
    <div className={`${mobile ? 'w-72' : 'hidden lg:flex'} flex-col bg-gray-950 border-l border-gray-800 h-full`}>
      <div className="p-5 border-b border-gray-800 flex items-center gap-3">
        <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl flex items-center justify-center text-xl flex-shrink-0">🛡️</div>
        <div>
          <p className="text-white font-black text-sm">اختبرني</p>
          <p className="text-gray-400 text-xs">لوحة المسؤول</p>
        </div>
      </div>
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map(item => (
          <button key={item.key} onClick={() => navTo(item.key)}
            className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl font-bold text-sm transition-all ${
              activeTab === item.key ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
            }`}
          >
            <span className="text-xl flex-shrink-0">{item.icon}</span>
            <span className="flex-1 text-right">{item.label}</span>
            {item.key === 'pending' && stats.pendingTeachers > 0 && (
              <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">{stats.pendingTeachers}</span>
            )}
          </button>
        ))}
      </nav>
      <div className="p-3 border-t border-gray-800">
        <div className="bg-gray-800 rounded-xl p-3 mb-2">
          <p className="text-white text-xs font-bold truncate">{user?.email}</p>
          <p className="text-purple-400 text-xs mt-1">مسؤول النظام</p>
        </div>
        <button onClick={() => { signOut(); navigate('/') }}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-gray-400 hover:bg-red-900/30 hover:text-red-400 font-bold text-sm transition-all">
          <span className="text-xl">🚪</span><span>خروج</span>
        </button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-950 flex" dir="rtl">
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -50, x: '-50%' }} animate={{ opacity: 1, y: 20, x: '-50%' }} exit={{ opacity: 0, y: -50, x: '-50%' }}
            className={`fixed top-0 left-1/2 z-[9999] px-6 py-3 rounded-2xl font-bold shadow-2xl text-white ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}
          >{toast.msg}</motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {mobileSidebar && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={() => setMobileSidebar(false)} />
            <motion.div initial={{ x: 300 }} animate={{ x: 0 }} exit={{ x: 300 }}
              className="fixed top-0 right-0 bottom-0 z-50 lg:hidden">
              <Sidebar mobile />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <div className="hidden lg:flex flex-col w-64 bg-gray-950 border-l border-gray-800 h-screen sticky top-0">
        <Sidebar />
      </div>

      {/* Main */}
      <div className="flex-1 min-w-0 overflow-y-auto">
        {/* Topbar */}
        <div className="bg-gray-900 border-b border-gray-800 px-4 lg:px-8 py-4 flex items-center gap-3 sticky top-0 z-20">
          <button onClick={() => setMobileSidebar(true)} className="lg:hidden text-gray-400 hover:text-white text-2xl">☰</button>
          <h1 className="text-white font-black text-lg flex-1">
            {NAV_ITEMS.find(n => n.key === activeTab)?.icon}{' '}
            {NAV_ITEMS.find(n => n.key === activeTab)?.label}
          </h1>
          <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="🔍 بحث..."
            className="bg-gray-800 border border-gray-700 text-white placeholder-gray-500 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-purple-500 w-32 sm:w-48 lg:w-56"
          />
          <button onClick={fetchAll} className="bg-gray-800 text-gray-400 hover:text-white p-2 rounded-xl transition-colors" title="تحديث">🔄</button>
        </div>

        <div className="p-4 lg:p-8">
          <AnimatePresence mode="wait">
            {activeTab === 'overview' && (
              <motion.div key="ov" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <OverviewTab stats={stats} pending={pending} onGoToPending={() => navTo('pending')} />
              </motion.div>
            )}
            {activeTab === 'pending' && (
              <motion.div key="pe" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <PendingTab pending={filtered(pending) as Teacher[]} selectedSubjects={selectedSubjects}
                  setSelectedSubjects={setSelectedSubjects} loadingId={loadingId} onApprove={approve} onReject={reject} />
              </motion.div>
            )}
            {activeTab === 'teachers' && (
              <motion.div key="te" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <TeachersTab teachers={filtered(teachers) as TeacherWithStats[]} loadingId={loadingId}
                  onChangeSubject={changeSubject} onToggle={toggleStatus} onDelete={deleteTeacher} />
              </motion.div>
            )}
            {activeTab === 'exams' && (
              <motion.div key="ex" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <ExamsTab search={searchQuery} showToast={showToast} />
              </motion.div>
            )}
            {activeTab === 'students' && (
              <motion.div key="st" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <StudentsTab search={searchQuery} showToast={showToast} />
              </motion.div>
            )}
            {activeTab === 'submissions' && (
              <motion.div key="su" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <SubmissionsTab search={searchQuery} showToast={showToast} />
              </motion.div>
            )}
            {activeTab === 'announcements' && (
              <motion.div key="an" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <AnnouncementsTab showToast={showToast} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}

// ─── Overview ─────────────────────────────────────────────────────────────────
function OverviewTab({ stats, pending, onGoToPending }: { stats: FullStats; pending: Teacher[]; onGoToPending: () => void }) {
  const cards = [
    { label: 'إجمالي المدرسين', value: stats.totalTeachers, icon: '🎓', color: 'from-blue-600 to-cyan-600', sub: `${stats.activeTeachers} نشط` },
    { label: 'طلبات معلقة', value: stats.pendingTeachers, icon: '⏳', color: 'from-amber-500 to-orange-500', sub: 'بانتظار الموافقة', alert: stats.pendingTeachers > 0 },
    { label: 'إجمالي الطلاب', value: stats.totalStudents, icon: '👨‍🎓', color: 'from-green-600 to-emerald-600', sub: `${stats.activeStudents} نشط` },
    { label: 'الاختبارات', value: stats.totalExams, icon: '📝', color: 'from-purple-600 to-pink-600', sub: `${stats.activeExams} نشط الآن` },
    { label: 'المجموعات', value: stats.totalGroups, icon: '👥', color: 'from-indigo-600 to-violet-600', sub: 'مجموعة دراسية' },
    { label: 'الإجابات المقدمة', value: stats.totalSubmissions, icon: '📬', color: 'from-teal-600 to-cyan-600', sub: 'إجابة محفوظة' },
  ]
  return (
    <div>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {cards.map((s, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
            className={`bg-gray-900 border rounded-2xl p-4 lg:p-6 relative overflow-hidden ${s.alert ? 'border-amber-500/50' : 'border-gray-800'}`}
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${s.color} opacity-5`} />
            <div className="relative z-10">
              <div className={`w-10 h-10 lg:w-14 lg:h-14 rounded-xl lg:rounded-2xl bg-gradient-to-br ${s.color} flex items-center justify-center text-xl lg:text-2xl mb-3 shadow-lg`}>{s.icon}</div>
              <p className="text-3xl lg:text-4xl font-black text-white mb-1">{s.value}</p>
              <p className="text-gray-300 font-bold text-sm lg:text-base">{s.label}</p>
              <p className="text-gray-500 text-xs mt-1">{s.sub}</p>
            </div>
          </motion.div>
        ))}
      </div>
      {pending.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-5 mb-6 flex flex-col sm:flex-row items-start sm:items-center gap-4 justify-between">
          <div className="flex items-center gap-3">
            <motion.span animate={{ rotate: [0,20,-20,0] }} transition={{ duration: 2, repeat: Infinity }} className="text-3xl">🔔</motion.span>
            <div>
              <p className="text-amber-400 font-black">{pending.length} طلب انضمام بانتظار مراجعتك</p>
              <p className="text-amber-300/60 text-sm">مدرسون جدد يريدون الانضمام</p>
            </div>
          </div>
          <button onClick={onGoToPending} className="bg-amber-500 text-white px-5 py-2.5 rounded-xl font-black hover:bg-amber-600 transition-colors whitespace-nowrap">
            مراجعة الطلبات ←
          </button>
        </motion.div>
      )}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
        <h3 className="text-white font-black mb-4">🕐 آخر الطلبات المعلقة</h3>
        {pending.length === 0 && <p className="text-gray-500 text-center py-6">لا توجد طلبات جديدة</p>}
        {pending.slice(0, 5).map(t => (
          <div key={t.id} className="flex items-center gap-3 py-3 border-b border-gray-800 last:border-0">
            <div className="w-9 h-9 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl flex items-center justify-center text-white font-black flex-shrink-0">{t.name[0]}</div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-bold truncate">{t.name}</p>
              <p className="text-gray-400 text-xs">{t.phone}</p>
            </div>
            <span className="bg-amber-500/20 text-amber-400 text-xs px-2 py-1 rounded-full font-bold flex-shrink-0">معلق</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Pending ──────────────────────────────────────────────────────────────────
function PendingTab({ pending, selectedSubjects, setSelectedSubjects, loadingId, onApprove, onReject }: {
  pending: Teacher[]; selectedSubjects: Record<string, Subject>
  setSelectedSubjects: React.Dispatch<React.SetStateAction<Record<string, Subject>>>
  loadingId: string | null; onApprove: (t: Teacher) => void; onReject: (t: Teacher) => void
}) {
  if (!pending.length) return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-12 text-center">
      <div className="text-6xl mb-3 opacity-20">📭</div>
      <p className="text-gray-400 text-lg">لا توجد طلبات جديدة</p>
    </div>
  )
  return (
    <div className="space-y-4">
      {pending.map((t, i) => (
        <motion.div key={t.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
          className="bg-gray-900 border border-amber-500/30 rounded-2xl p-5 hover:border-amber-500/60 transition-colors"
        >
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex items-center gap-3 flex-1">
              <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl flex items-center justify-center text-white text-xl font-black flex-shrink-0">{t.name[0]}</div>
              <div>
                <p className="text-white font-black text-lg">{t.name}</p>
                <p className="text-gray-400 text-sm">📱 {t.phone}</p>
                <p className="text-gray-500 text-xs">{new Date(t.created_at).toLocaleString('ar-EG')}</p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
              <select value={selectedSubjects[t.id] || 'other'}
                onChange={e => setSelectedSubjects(p => ({ ...p, [t.id]: e.target.value as Subject }))}
                className="bg-gray-800 border border-gray-700 text-white rounded-xl px-3 py-2 text-sm font-bold focus:outline-none focus:border-purple-500"
              >
                {SUBJECT_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.icon} {s.label}</option>)}
              </select>
              <div className="flex gap-2">
                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                  onClick={() => onApprove(t)} disabled={loadingId === t.id}
                  className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-5 py-2.5 rounded-xl font-black disabled:opacity-40 flex items-center gap-2 text-sm"
                >
                  {loadingId === t.id ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : '✓'} موافقة
                </motion.button>
                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                  onClick={() => onReject(t)} disabled={loadingId === t.id}
                  className="bg-gradient-to-r from-red-600 to-rose-600 text-white px-5 py-2.5 rounded-xl font-black disabled:opacity-40 text-sm"
                >✗ رفض</motion.button>
              </div>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  )
}

// ─── Teachers ─────────────────────────────────────────────────────────────────
function TeachersTab({ teachers, loadingId, onChangeSubject, onToggle, onDelete }: {
  teachers: TeacherWithStats[]; loadingId: string | null
  onChangeSubject: (id: string, s: Subject) => void
  onToggle: (t: Teacher) => void; onDelete: (t: Teacher) => void
}) {
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'pending' | 'rejected'>('all')
  const filtered = statusFilter === 'all' ? teachers : teachers.filter(t => t.status === statusFilter)

  return (
    <div>
      <div className="flex gap-2 mb-6 flex-wrap">
        {(['all', 'active', 'pending', 'rejected'] as const).map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${statusFilter === s ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}
          >
            {s === 'all' ? 'الكل' : s === 'active' ? '✅ نشط' : s === 'pending' ? '⏳ معلق' : '❌ مرفوض'}
            <span className="mr-2 bg-gray-700 px-1.5 py-0.5 rounded-full text-xs">
              {s === 'all' ? teachers.length : teachers.filter(t => t.status === s).length}
            </span>
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-12 text-center">
          <p className="text-gray-500">لا يوجد مدرسون</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((t, i) => {
          const theme = subjectThemes[t.subject as Subject] || subjectThemes.other
          return (
            <motion.div key={t.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.04 }}
              className="bg-gray-900 border border-gray-800 rounded-2xl p-5 hover:border-gray-600 transition-all group"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0" style={{ background: theme.bgColor }}>{theme.icon}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-black truncate">{t.name}</p>
                  <p className="text-gray-400 text-xs">{t.phone}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-bold flex-shrink-0 ${
                  t.status === 'active' ? 'bg-green-500/20 text-green-400' :
                  t.status === 'pending' ? 'bg-amber-500/20 text-amber-400' : 'bg-red-500/20 text-red-400'
                }`}>{t.status === 'active' ? '✅ نشط' : t.status === 'pending' ? '⏳ معلق' : '❌ مرفوض'}</span>
              </div>

              <div className="flex items-center gap-3 mb-4 text-xs text-gray-400">
                <span>👥 {t.groupCount || 0} مجموعة</span>
              </div>

              {/* Change subject */}
              <select value={t.subject}
                onChange={e => onChangeSubject(t.id, e.target.value as Subject)}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-xs font-bold focus:outline-none focus:border-purple-500 mb-3"
              >
                {SUBJECT_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.icon} {s.label}</option>)}
              </select>

              <div className="flex gap-2">
                <button onClick={() => onToggle(t)} disabled={loadingId === t.id}
                  className={`flex-1 py-2 rounded-lg font-bold text-xs transition-all ${
                    t.status === 'active' ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30' : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                  }`}
                >{loadingId === t.id ? '...' : t.status === 'active' ? 'تعليق' : 'تفعيل'}</button>
                <button onClick={() => onDelete(t)} disabled={loadingId === t.id}
                  className="flex-1 py-2 rounded-lg font-bold text-xs bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all opacity-0 group-hover:opacity-100"
                >حذف</button>
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Exams ────────────────────────────────────────────────────────────────────
function ExamsTab({ search, showToast }: { search: string; showToast: (m: string, t?: 'success' | 'error') => void }) {
  const [exams, setExams] = useState<{ id: string; title: string; status: string; duration_mins: number; created_at: string; layout_type: number; teachers?: { name: string; subject: string } }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('exams').select('*, teachers(name, subject)').order('created_at', { ascending: false })
      .then(({ data }) => { setExams(data || []); setLoading(false) })
  }, [])

  const toggleExam = async (id: string, status: string) => {
    const ns = status === 'active' ? 'closed' : 'active'
    await supabase.from('exams').update({ status: ns }).eq('id', id)
    setExams(prev => prev.map(e => e.id === id ? { ...e, status: ns } : e))
    showToast(ns === 'active' ? 'تم تفعيل الاختبار' : 'تم إغلاق الاختبار')
  }

  const deleteExam = async (id: string) => {
    if (!confirm('حذف الاختبار نهائياً؟')) return
    await supabase.from('exams').delete().eq('id', id)
    setExams(prev => prev.filter(e => e.id !== id))
    showToast('تم حذف الاختبار')
  }

  const filtered = exams.filter(e =>
    !search || e.title.toLowerCase().includes(search.toLowerCase()) || e.teachers?.name?.toLowerCase().includes(search.toLowerCase())
  )

  const statusColor: Record<string, string> = {
    draft: 'bg-gray-500/20 text-gray-400', scheduled: 'bg-blue-500/20 text-blue-400',
    active: 'bg-green-500/20 text-green-400', closed: 'bg-red-500/20 text-red-400',
  }
  const statusLabel: Record<string, string> = { draft: 'مسودة', scheduled: 'مجدول', active: '🟢 نشط', closed: '🔴 مغلق' }
  const layoutName: Record<number, string> = { 1: 'كلاسيك', 2: 'بطاقات', 3: 'خطوة بخطوة', 4: 'ورقة', 5: 'شبكة', 6: 'سينمائي' }

  if (loading) return <div className="text-center text-gray-400 py-12">جاري التحميل...</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-gray-400 text-sm">{filtered.length} اختبار</p>
      </div>
      {filtered.length === 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-12 text-center">
          <div className="text-5xl mb-3 opacity-20">📝</div>
          <p className="text-gray-400">لا توجد اختبارات</p>
        </div>
      )}
      <div className="space-y-3">
        {filtered.map((e, i) => (
          <motion.div key={e.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }}
            className="bg-gray-900 border border-gray-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center gap-4 hover:border-gray-600 transition-colors"
          >
            <div className="flex-1 min-w-0">
              <p className="text-white font-black truncate">{e.title}</p>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${statusColor[e.status]}`}>{statusLabel[e.status]}</span>
                <span className="text-gray-500 text-xs">📐 {layoutName[e.layout_type]}</span>
                {e.duration_mins && <span className="text-gray-500 text-xs">⏱ {e.duration_mins} دقيقة</span>}
                {e.teachers && <span className="text-gray-500 text-xs">👤 {e.teachers.name}</span>}
              </div>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <button onClick={() => toggleExam(e.id, e.status)}
                className={`px-4 py-2 rounded-xl font-bold text-xs transition-all ${
                  e.status === 'active' ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                }`}
              >{e.status === 'active' ? 'إغلاق' : 'تفعيل'}</button>
              <button onClick={() => deleteExam(e.id)} className="px-4 py-2 rounded-xl font-bold text-xs bg-gray-800 text-gray-400 hover:bg-red-900/30 hover:text-red-400 transition-all">
                حذف
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

// ─── Students ─────────────────────────────────────────────────────────────────
function StudentsTab({ search, showToast }: { search: string; showToast: (m: string, t?: 'success' | 'error') => void }) {
  const [students, setStudents] = useState<{ id: string; name: string; phone: string; code: string; is_active: boolean; created_at: string; groups?: { name: string } }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('students').select('*, groups(name)').order('created_at', { ascending: false })
      .then(({ data }) => { setStudents(data || []); setLoading(false) })
  }, [])

  const toggleStudent = async (id: string, active: boolean) => {
    await supabase.from('students').update({ is_active: !active }).eq('id', id)
    setStudents(prev => prev.map(s => s.id === id ? { ...s, is_active: !active } : s))
    showToast(!active ? 'تم تفعيل الطالب' : 'تم تعليق الطالب')
  }

  const filtered = students.filter(s =>
    !search || s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.phone.includes(search) || s.code.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) return <div className="text-center text-gray-400 py-12">جاري التحميل...</div>

  return (
    <div>
      <p className="text-gray-400 text-sm mb-4">{filtered.length} طالب</p>
      {filtered.length === 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-12 text-center">
          <div className="text-5xl mb-3 opacity-20">👨‍🎓</div>
          <p className="text-gray-400">لا يوجد طلاب</p>
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((s, i) => (
          <motion.div key={s.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.03 }}
            className="bg-gray-900 border border-gray-800 rounded-2xl p-4 hover:border-gray-600 transition-colors"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-black flex-shrink-0 ${s.is_active ? 'bg-gradient-to-br from-teal-600 to-cyan-600' : 'bg-gray-700'}`}>
                {s.name[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-bold truncate">{s.name}</p>
                <p className="text-gray-400 text-xs">{s.phone}</p>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full font-bold ${s.is_active ? 'bg-green-500/20 text-green-400' : 'bg-gray-700 text-gray-500'}`}>
                {s.is_active ? 'نشط' : 'معلق'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <span className="bg-gray-800 text-gray-300 px-2 py-1 rounded-lg font-mono text-xs">{s.code}</span>
                {s.groups && <p className="text-gray-500 text-xs mt-1">👥 {s.groups.name}</p>}
              </div>
              <button onClick={() => toggleStudent(s.id, s.is_active)}
                className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all ${
                  s.is_active ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30' : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                }`}
              >{s.is_active ? 'تعليق' : 'تفعيل'}</button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

// ─── Submissions ──────────────────────────────────────────────────────────────
function SubmissionsTab({ search, showToast }: { search: string; showToast: (m: string, t?: 'success' | 'error') => void }) {
  const [subs, setSubs] = useState<{ id: string; auto_score: number | null; essay_score: number | null; total_score: number | null; cheat_log: unknown[]; submitted_at: string; attempt_num: number; students?: { name: string; code: string }; exams?: { title: string } }[]>([])
  const [loading, setLoading] = useState(true)
  const [editId, setEditId] = useState<string | null>(null)
  const [essayScore, setEssayScore] = useState('')

  useEffect(() => {
    fetchSubs()
  }, [])

  const fetchSubs = async () => {
    const { data } = await supabase.from('submissions')
      .select('*, students(name, code), exams(title)')
      .order('submitted_at', { ascending: false })
      .limit(200)
    setSubs(data || [])
    setLoading(false)
  }

  const saveScore = async (id: string, examId?: string) => {
    const score = parseFloat(essayScore)
    if (isNaN(score)) return
    await supabase.from('submissions').update({ essay_score: score, total_score: score }).eq('id', id)
    showToast('تم حفظ الدرجة ✓')
    setEditId(null)
    fetchSubs()
  }

  const filtered = subs.filter(s =>
    !search || s.students?.name?.toLowerCase().includes(search.toLowerCase()) ||
    s.exams?.title?.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) return <div className="text-center text-gray-400 py-12">جاري التحميل...</div>

  return (
    <div>
      <p className="text-gray-400 text-sm mb-4">{filtered.length} إجابة</p>
      <div className="space-y-3">
        {filtered.map((s, i) => {
          const hasCheat = Array.isArray(s.cheat_log) && s.cheat_log.length > 0
          return (
            <motion.div key={s.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
              className={`bg-gray-900 border rounded-2xl p-4 transition-colors ${hasCheat ? 'border-red-500/30' : 'border-gray-800'}`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-white font-black">{s.students?.name || '—'}</p>
                    <span className="text-gray-500 text-xs font-mono">{s.students?.code}</span>
                    {hasCheat && <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full font-bold">⚠️ غش</span>}
                  </div>
                  <p className="text-gray-400 text-sm mt-0.5">{s.exams?.title}</p>
                  <p className="text-gray-500 text-xs">{new Date(s.submitted_at).toLocaleString('ar-EG')} • محاولة {s.attempt_num}</p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  {s.total_score !== null ? (
                    <span className={`text-2xl font-black ${(s.total_score || 0) >= 50 ? 'text-green-400' : 'text-red-400'}`}>
                      {s.total_score}%
                    </span>
                  ) : (
                    <span className="text-amber-400 text-sm font-bold">قيد التصحيح</span>
                  )}
                  {editId === s.id ? (
                    <div className="flex gap-2">
                      <input value={essayScore} onChange={e => setEssayScore(e.target.value)} type="number" min={0} max={100}
                        placeholder="%" className="w-16 bg-gray-800 border border-purple-500 text-white rounded-lg px-2 py-1 text-sm focus:outline-none text-center"
                      />
                      <button onClick={() => saveScore(s.id)} className="bg-green-600 text-white px-3 py-1 rounded-lg text-sm font-bold">حفظ</button>
                      <button onClick={() => setEditId(null)} className="bg-gray-700 text-gray-300 px-3 py-1 rounded-lg text-sm">×</button>
                    </div>
                  ) : (
                    <button onClick={() => { setEditId(s.id); setEssayScore(String(s.total_score || '')) }}
                      className="bg-purple-600/20 text-purple-400 px-3 py-1.5 rounded-lg font-bold text-xs hover:bg-purple-600/30 transition-colors">
                      ✏️ تصحيح
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Announcements ────────────────────────────────────────────────────────────
function AnnouncementsTab({ showToast }: { showToast: (m: string, t?: 'success' | 'error') => void }) {
  const [announcements, setAnnouncements] = useState<{ id: string; title: string; body: string; created_at: string; target: string }[]>([])
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [target, setTarget] = useState<'all' | 'teachers' | 'students'>('all')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [tableExists, setTableExists] = useState(true)

  useEffect(() => {
    supabase.from('announcements').select('*').order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error && (error.code === 'PGRST205' || error.message?.includes('does not exist'))) {
          setTableExists(false)
        } else {
          setAnnouncements(data || [])
        }
        setLoading(false)
      })
  }, [])

  const send = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !body.trim()) return
    setSaving(true)
    const { data, error } = await supabase.from('announcements').insert({ title: title.trim(), body: body.trim(), target }).select().single()
    if (error) {
      // If table doesn't exist yet, just show locally
      const fake = { id: Date.now().toString(), title: title.trim(), body: body.trim(), target, created_at: new Date().toISOString() }
      setAnnouncements(prev => [fake, ...prev])
      showToast('تم إرسال الإعلان ✓ (ملاحظة: جدول announcements غير موجود في قاعدة البيانات)')
    } else {
      setAnnouncements(prev => [data, ...prev])
      showToast('تم إرسال الإعلان ✓')
    }
    setTitle(''); setBody('')
    setSaving(false)
  }

  const deleteAnn = async (id: string) => {
    await supabase.from('announcements').delete().eq('id', id)
    setAnnouncements(prev => prev.filter(a => a.id !== id))
    showToast('تم حذف الإعلان')
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Table missing warning */}
      {!tableExists && (
        <div className="lg:col-span-2 bg-amber-500/10 border border-amber-500/30 rounded-2xl p-5">
          <p className="text-amber-400 font-bold mb-2">⚠️ جدول الإعلانات غير موجود في قاعدة البيانات</p>
          <p className="text-amber-300/70 text-sm mb-3">شغّل الـ SQL التالي في Supabase SQL Editor:</p>
          <pre className="bg-gray-900 text-green-400 p-4 rounded-xl text-xs overflow-x-auto">{`CREATE TABLE announcements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  target TEXT DEFAULT 'all',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read" ON announcements FOR SELECT USING (true);
CREATE POLICY "admin_all" ON announcements FOR ALL USING (true);`}</pre>
        </div>
      )}
      {/* Form */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
        <h3 className="text-white font-black text-lg mb-5">📢 إعلان جديد</h3>
        <form onSubmit={send} className="space-y-4">
          <div>
            <label className="text-gray-400 text-sm font-bold mb-2 block">العنوان</label>
            <input value={title} onChange={e => setTitle(e.target.value)}
              placeholder="عنوان الإعلان"
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-purple-500"
            />
          </div>
          <div>
            <label className="text-gray-400 text-sm font-bold mb-2 block">المحتوى</label>
            <textarea value={body} onChange={e => setBody(e.target.value)} rows={4}
              placeholder="نص الإعلان..."
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-purple-500 resize-none"
            />
          </div>
          <div>
            <label className="text-gray-400 text-sm font-bold mb-2 block">إرسال إلى</label>
            <div className="flex gap-2">
              {(['all', 'teachers', 'students'] as const).map(t => (
                <button key={t} type="button" onClick={() => setTarget(t)}
                  className={`flex-1 py-2 rounded-xl font-bold text-sm transition-all ${target === t ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}
                >{t === 'all' ? 'الكل' : t === 'teachers' ? 'المدرسون' : 'الطلاب'}</button>
              ))}
            </div>
          </div>
          <motion.button type="submit" disabled={saving || !title.trim() || !body.trim()}
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3.5 rounded-xl font-black disabled:opacity-40"
          >{saving ? '⏳ جاري الإرسال...' : '📢 إرسال الإعلان'}</motion.button>
        </form>
      </div>

      {/* List */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
        <h3 className="text-white font-black text-lg mb-5">الإعلانات السابقة ({announcements.length})</h3>
        {loading && <p className="text-gray-500 text-center py-6">جاري التحميل...</p>}
        {!loading && announcements.length === 0 && <p className="text-gray-500 text-center py-6">لا توجد إعلانات سابقة</p>}
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {announcements.map(a => (
            <div key={a.id} className="bg-gray-800 rounded-xl p-4 flex gap-3 group">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-white font-bold text-sm truncate">{a.title}</p>
                  <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded-full flex-shrink-0">
                    {a.target === 'all' ? 'الكل' : a.target === 'teachers' ? 'مدرسون' : 'طلاب'}
                  </span>
                </div>
                <p className="text-gray-400 text-xs line-clamp-2">{a.body}</p>
                <p className="text-gray-600 text-xs mt-1">{new Date(a.created_at).toLocaleString('ar-EG')}</p>
              </div>
              <button onClick={() => deleteAnn(a.id)} className="text-gray-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0">✕</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
