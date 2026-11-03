import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { Group, Student, Exam } from '../types'
import { subjectThemes } from '../theme/subjectThemes'
import { usePersist } from '../lib/usePersist'
import GroupCard from '../components/teacher/GroupCard'
import CreateGroupModal from '../components/teacher/CreateGroupModal'
import ExamBuilder from '../components/teacher/ExamBuilder'
import ExamResults from '../components/teacher/ExamResults'

export default function TeacherDashboard() {
  const { teacher, signOut } = useAuth()
  const [groups, setGroups] = useState<Group[]>([])
  const [selectedGroupId, setSelectedGroupId] = usePersist<string | null>('teacher_selected_group', null)
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null)
  const [students, setStudents] = useState<Student[]>([])
  const [exams, setExams] = useState<Exam[]>([])
  const [showCreateGroup, setShowCreateGroup] = useState(false)
  const [showExamBuilder, setShowExamBuilder] = useState(false)
  const [activeTab, setActiveTabRaw] = usePersist<'groups' | 'exams'>('teacher_active_tab', 'groups')

  // wrap setActiveTab to also persist scroll
  const setActiveTab = (tab: 'groups' | 'exams') => {
    setActiveTabRaw(tab)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const theme = teacher ? subjectThemes[teacher.subject] : subjectThemes['other']
  const isEnglish = teacher?.subject === 'english'

  useEffect(() => { fetchGroups(); fetchExams() }, [teacher])

  // Restore selected group after groups load
  useEffect(() => {
    if (groups.length > 0 && selectedGroupId) {
      const found = groups.find(g => g.id === selectedGroupId)
      if (found) setSelectedGroup(found)
    }
  }, [groups, selectedGroupId])

  useEffect(() => {
    if (selectedGroup) {
      setSelectedGroupId(selectedGroup.id)
      fetchStudents(selectedGroup.id)
    }
  }, [selectedGroup])

  const fetchGroups = async () => {
    if (!teacher) return
    const { data } = await supabase.from('groups').select('*').eq('teacher_id', teacher.id).order('created_at')
    if (data) setGroups(data)
  }

  const fetchStudents = async (groupId: string) => {
    const { data } = await supabase.from('students').select('*').eq('group_id', groupId).order('created_at')
    if (data) setStudents(data)
  }

  const fetchExams = async () => {
    if (!teacher) return
    const { data } = await supabase.from('exams').select('*').eq('teacher_id', teacher.id).order('created_at', { ascending: false })
    if (data) setExams(data)
  }

  useEffect(() => { if (activeTab === 'exams') fetchExams() }, [activeTab])

  if (!teacher) return null

  const stats = [
    { label: isEnglish ? 'Groups' : 'المجموعات', value: groups.length, icon: '👥', color: 'from-blue-500 to-cyan-500' },
    { label: isEnglish ? 'Students' : 'الطلاب', value: students.length, icon: '👨‍🎓', color: 'from-green-500 to-emerald-500' },
    { label: isEnglish ? 'Exams' : 'الاختبارات', value: exams.length, icon: '📝', color: 'from-purple-500 to-pink-500' },
    { label: isEnglish ? 'Active Exams' : 'اختبارات نشطة', value: exams.filter(e => e.status === 'active').length, icon: '🔴', color: 'from-orange-500 to-red-500' },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100" dir={isEnglish ? 'ltr' : 'rtl'}>
      {/* Header */}
      <header className="shadow-lg text-white px-6 py-6 relative overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${theme.color}, ${theme.bgColor})` }}
      >
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{ 
            backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
            backgroundSize: '30px 30px'
          }} />
        </div>
        <div className="relative z-10 flex items-center justify-between max-w-7xl mx-auto gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <motion.span
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 3, repeat: Infinity }}
              className="text-3xl sm:text-5xl"
            >
              {theme.icon}
            </motion.span>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-2xl font-black truncate">{isEnglish ? 'Teacher Dashboard' : 'لوحة تحكم المدرس'}</h1>
              <p className="text-xs sm:text-sm opacity-90 font-semibold truncate">{teacher.name} • {isEnglish ? theme.labelEn : theme.label}</p>
            </div>
          </div>
          <button onClick={signOut} className="bg-white/20 hover:bg-white/30 backdrop-blur-sm px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl font-bold transition-all text-sm shadow-lg flex-shrink-0">
            {isEnglish ? 'Logout' : 'خروج'}
          </button>
        </div>
      </header>

      {/* Stats Dashboard */}
      <div className="px-6 py-8 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              whileHover={{ y: -4 }}
              className="bg-white rounded-2xl shadow-lg p-6 relative overflow-hidden group cursor-default"
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${stat.color} opacity-0 group-hover:opacity-5 transition-opacity`} />
              <div className="relative z-10">
                <div className={`bg-gradient-to-br ${stat.color} w-12 h-12 rounded-xl flex items-center justify-center text-2xl mb-3 shadow-md group-hover:scale-110 transition-transform`}>
                  {stat.icon}
                </div>
                <p className="text-gray-500 text-sm font-semibold mb-1">{stat.label}</p>
                <p className="text-4xl font-black text-gray-800">{stat.value}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b shadow-sm sticky top-0 z-20">
        <div className="max-w-7xl mx-auto flex">
          {(['groups', 'exams'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-10 py-5 font-bold text-sm transition-all border-b-4 ${activeTab === tab ? 'border-current text-current' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
              style={activeTab === tab ? { color: theme.bgColor } : {}}
            >
              {tab === 'groups' ? (isEnglish ? '👥 Groups' : '👥 المجموعات') : (isEnglish ? '📝 Exams' : '📝 الاختبارات')}
            </button>
          ))}
        </div>
      </div>

      <div className="p-6 max-w-7xl mx-auto">{activeTab === 'groups' && (
          <div>
            <div className="flex items-center justify-between mb-6 sm:mb-8 gap-3">
              <div className="min-w-0">
                <h2 className="text-xl sm:text-2xl font-black text-gray-800">{isEnglish ? 'My Groups' : 'مجموعاتي'}</h2>
                <p className="text-gray-500 text-sm mt-1 hidden sm:block">{isEnglish ? 'Manage your student groups' : 'إدارة مجموعات الطلاب'}</p>
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowCreateGroup(true)}
                className="text-white px-4 sm:px-6 py-3 rounded-xl font-bold hover:opacity-90 transition-all flex items-center gap-2 shadow-lg flex-shrink-0"
                style={{ background: theme.bgColor }}
              >
                <span className="text-xl">+</span>
                {isEnglish ? 'New Group' : 'مجموعة جديدة'}
              </motion.button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {groups.map(g => (
                <GroupCard key={g.id} group={g} theme={theme} isEnglish={isEnglish}
                  isSelected={selectedGroup?.id === g.id}
                  onClick={() => setSelectedGroup(g)}
                />
              ))}
              {groups.length === 0 && (
                <div className="col-span-3 bg-white rounded-3xl p-16 text-center border-2 border-dashed border-gray-200">
                  <motion.p
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="text-6xl mb-4 opacity-20"
                  >
                    👥
                  </motion.p>
                  <p className="text-gray-400 text-lg">{isEnglish ? 'No groups yet. Create your first group!' : 'لا توجد مجموعات. أنشئ أول مجموعة!'}</p>
                </div>
              )}
            </div>

            {selectedGroup && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-3xl shadow-xl p-8 border border-gray-100"
              >
                <GroupDetails
                  group={selectedGroup} students={students} theme={theme} isEnglish={isEnglish}
                  onStudentsChange={() => fetchStudents(selectedGroup.id)}
                  onGroupUpdate={fetchGroups}
                />
              </motion.div>
            )}
          </div>
        )}

        {activeTab === 'exams' && (
          <div>
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-black text-gray-800">{isEnglish ? 'My Exams' : 'اختباراتي'}</h2>
                <p className="text-gray-500 text-sm mt-1">{isEnglish ? 'Create and manage exams' : 'إنشاء وإدارة الاختبارات'}</p>
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowExamBuilder(true)}
                className="text-white px-6 py-3.5 rounded-xl font-bold hover:opacity-90 transition-all flex items-center gap-2 shadow-lg"
                style={{ background: theme.bgColor }}
              >
                <span className="text-xl">+</span>
                {isEnglish ? 'New Exam' : 'اختبار جديد'}
              </motion.button>
            </div>
            <ExamsList exams={exams} theme={theme} isEnglish={isEnglish} onRefresh={fetchExams} />
          </div>
        )}
      </div>

      {showCreateGroup && (
        <CreateGroupModal
          teacherId={teacher.id} theme={theme} isEnglish={isEnglish}
          onClose={() => setShowCreateGroup(false)}
          onCreated={() => { fetchGroups(); setShowCreateGroup(false) }}
        />
      )}

      {showExamBuilder && (
        <ExamBuilder
          teacher={teacher} groups={groups} theme={theme} isEnglish={isEnglish}
          onClose={() => setShowExamBuilder(false)}
          onCreated={() => { fetchExams(); setShowExamBuilder(false) }}
        />
      )}
    </div>
  )
}

// ---- Group Details Component ----
function GroupDetails({ group, students, theme, isEnglish, onStudentsChange, onGroupUpdate }: {
  group: Group; students: Student[]; theme: import('../theme/subjectThemes').SubjectTheme
  isEnglish: boolean; onStudentsChange: () => void; onGroupUpdate: () => void
}) {
  const [newName, setNewName] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [message, setMessage] = useState(group.message || '')
  const [adding, setAdding] = useState(false)

  const addStudent = async () => {
    if (!newName.trim() || !newPhone.trim()) return
    setAdding(true)
    const code = generateCode()
    await supabase.from('students').insert({ group_id: group.id, name: newName.trim(), phone: newPhone.trim(), code, is_active: true })
    setNewName(''); setNewPhone('')
    onStudentsChange()
    setAdding(false)
  }

  const removeStudent = async (id: string) => {
    await supabase.from('students').update({ is_active: false }).eq('id', id)
    onStudentsChange()
  }

  const resetExam = async (studentId: string, studentName: string) => {
    // Get all active exams for this group
    const { data: examGroups } = await supabase
      .from('exam_groups')
      .select('exam_id, exams(id, title, status)')
      .eq('group_id', group.id)

    if (!examGroups || examGroups.length === 0) {
      alert(isEnglish ? 'No exams found for this group' : 'لا يوجد اختبارات لهذه المجموعة')
      return
    }

    // Get closed/active exams  
    const activeExams = examGroups
      .flatMap((eg: { exam_id: string; exams: { id: string; title: string; status: string }[] | { id: string; title: string; status: string } | null }) => 
        Array.isArray(eg.exams) ? eg.exams : eg.exams ? [eg.exams] : []
      )

    if (activeExams.length === 0) {
      alert(isEnglish ? 'No exams found' : 'لا توجد اختبارات')
      return
    }

    // If multiple exams, pick the most recent one (or show selection - simplified: delete all submissions)
    const examTitles = activeExams.map(e => e.title).join(', ')
    const confirmed = confirm(
      isEnglish
        ? `Reset exam for "${studentName}"? This will delete their submissions for: ${examTitles}`
        : `إعادة الاختبار للطالب "${studentName}"؟\nسيتم حذف إجاباته من: ${examTitles}`
    )
    if (!confirmed) return

    // Delete all submissions for this student in this group's exams
    for (const exam of activeExams) {
      await supabase
        .from('submissions')
        .delete()
        .eq('student_id', studentId)
        .eq('exam_id', exam.id)
    }

    alert(isEnglish ? `Exam reset for ${studentName} ✓` : `تم إعادة تعيين الاختبار للطالب ${studentName} ✓`)
  }

  const saveMessage = async () => {
    await supabase.from('groups').update({ message }).eq('id', group.id)
    onGroupUpdate()
  }

  return (
    <div>
      <h3 className="text-lg font-black text-gray-800 mb-4">
        {group.name} • {students.filter(s => s.is_active).length} {isEnglish ? 'students' : 'طالب'}
      </h3>

      {/* Add student */}
      <div className="flex gap-3 mb-6 flex-col sm:flex-row">
        <input value={newName} onChange={e => setNewName(e.target.value)} placeholder={isEnglish ? 'Student name' : 'اسم الطالب'}
          className="border-2 border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:border-blue-400 flex-1 min-w-36" />
        <input value={newPhone} onChange={e => setNewPhone(e.target.value)} placeholder={isEnglish ? 'Phone' : 'رقم الهاتف'}
          className="border-2 border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:border-blue-400 flex-1 min-w-36" />
        <button onClick={addStudent} disabled={adding}
          className="text-white px-5 py-2.5 rounded-xl font-bold hover:opacity-90 transition-opacity disabled:opacity-50"
          style={{ background: theme.bgColor }}
        >{adding ? '...' : (isEnglish ? '+ Add' : '+ إضافة')}</button>
      </div>

      {/* Students list */}
      <div className="space-y-2 mb-6 max-h-72 overflow-y-auto">
        {students.filter(s => s.is_active).map(s => (
          <div key={s.id} className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
            <div>
              <p className="font-bold text-gray-800">{s.name}</p>
              <p className="text-sm text-gray-500">{s.phone}</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap justify-end">
              <span className="bg-gray-200 text-gray-700 px-3 py-1 rounded-lg font-mono text-sm font-bold">{s.code}</span>
              <button
                onClick={() => resetExam(s.id, s.name)}
                title={isEnglish ? 'Reset exam' : 'إعادة الاختبار'}
                className="bg-blue-100 text-blue-600 hover:bg-blue-200 transition-colors px-2 py-1 rounded-lg text-xs font-bold min-h-[36px]"
              >🔄 {isEnglish ? 'Reset' : 'إعادة'}</button>
              <button onClick={() => removeStudent(s.id)} className="text-red-400 hover:text-red-600 transition-colors font-bold min-w-[36px] min-h-[36px]">✕</button>
            </div>
          </div>
        ))}
        {students.filter(s => s.is_active).length === 0 && (
          <p className="text-center text-gray-400 py-6">{isEnglish ? 'No students in this group' : 'لا يوجد طلاب في هذه المجموعة'}</p>
        )}
      </div>

      {/* Group message */}
      <div>
        <label className="block text-sm font-bold text-gray-700 mb-2">{isEnglish ? 'Message for students (shown when no exam is active)' : 'رسالة للطلاب (تظهر عند غياب اختبار نشط)'}</label>
        <div className="flex gap-3">
          <textarea value={message} onChange={e => setMessage(e.target.value)} rows={2}
            className="flex-1 border-2 border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:border-blue-400 resize-none"
          />
          <button onClick={saveMessage} className="bg-gray-700 text-white px-4 py-2.5 rounded-xl font-bold hover:bg-gray-800 transition-colors self-start">
            {isEnglish ? 'Save' : 'حفظ'}
          </button>
        </div>
      </div>
    </div>
  )
}

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

function ExamsList({ exams, theme, isEnglish, onRefresh }: {
  exams: Exam[]; theme: import('../theme/subjectThemes').SubjectTheme; isEnglish: boolean; onRefresh: () => void
}) {
  const [resultsExam, setResultsExam] = useState<Exam | null>(null)
  const activateExam = async (id: string) => {
    await supabase.from('exams').update({ status: 'active' }).eq('id', id)
    onRefresh()
  }
  const closeExam = async (id: string) => {
    await supabase.from('exams').update({ status: 'closed' }).eq('id', id)
    onRefresh()
  }

  const statusLabel: Record<string, string> = {
    draft: isEnglish ? 'Draft' : 'مسودة',
    scheduled: isEnglish ? 'Scheduled' : 'مجدول',
    active: isEnglish ? 'Active' : 'نشط',
    closed: isEnglish ? 'Closed' : 'مغلق',
  }
  const statusColor: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-600',
    scheduled: 'bg-blue-100 text-blue-700',
    active: 'bg-green-100 text-green-700',
    closed: 'bg-red-100 text-red-600',
  }

  if (exams.length === 0) return (
    <div className="bg-white rounded-2xl p-12 text-center text-gray-400">
      <p className="text-4xl mb-3">📝</p>
      <p>{isEnglish ? 'No exams yet.' : 'لا توجد اختبارات بعد.'}</p>
    </div>
  )

  return (
    <div className="space-y-3">
      {exams.map(exam => (
        <div key={exam.id} className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm flex items-center justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <p className="font-bold text-gray-800 text-base sm:text-lg">{exam.title}</p>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              <span className={`text-xs font-bold px-3 py-1 rounded-full ${statusColor[exam.status]}`}>{statusLabel[exam.status]}</span>
              {exam.duration_mins && <span className="text-gray-400 text-sm">⏱ {exam.duration_mins} {isEnglish ? 'min' : 'دقيقة'}</span>}
              {exam.scheduled_at && <span className="text-gray-400 text-sm">📅 {new Date(exam.scheduled_at).toLocaleString('ar-EG')}</span>}
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setResultsExam(exam)}
              className="bg-gray-100 text-gray-700 px-4 py-2 rounded-xl font-bold text-sm min-h-[40px]"
            >{isEnglish ? 'Results' : 'النتائج'}</button>
            {exam.status === 'draft' || exam.status === 'scheduled' ? (
              <button onClick={() => activateExam(exam.id)}
                className="text-white px-4 py-2 rounded-xl font-bold text-sm hover:opacity-90 transition-opacity min-h-[40px]"
                style={{ background: theme.bgColor }}
              >{isEnglish ? 'Activate' : 'تفعيل'}</button>
            ) : null}
            {exam.status === 'active' ? (
              <button onClick={() => closeExam(exam.id)}
                className="bg-red-500 text-white px-4 py-2 rounded-xl font-bold text-sm hover:bg-red-600 transition-colors min-h-[40px]"
              >{isEnglish ? 'Close' : 'إغلاق'}</button>
            ) : null}
          </div>
        </div>
      ))}
      {resultsExam && (
        <ExamResults exam={resultsExam} theme={theme} isEnglish={isEnglish} onClose={() => setResultsExam(null)} />
      )}
    </div>
  )
}
