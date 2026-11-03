import { useState } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '../../lib/supabase'
import { Teacher, Group, ExamLayout, QuestionType } from '../../types'
import { SubjectTheme } from '../../theme/subjectThemes'

interface ExamBuilderProps {
  teacher: Teacher
  groups: Group[]
  theme: SubjectTheme
  isEnglish: boolean
  onClose: () => void
  onCreated: () => void
}

interface QuestionDraft {
  id: string
  type: QuestionType
  content: string
  options: string[]
  correct_answer: unknown
  points: number
}

const layouts: { id: ExamLayout; icon: string; nameAr: string; nameEn: string; desc: string }[] = [
  { id: 1, icon: '📋', nameAr: 'كلاسيك', nameEn: 'Classic', desc: 'قائمة عمودية تقليدية' },
  { id: 2, icon: '🃏', nameAr: 'بطاقات', nameEn: 'Cards', desc: 'بطاقة لكل سؤال' },
  { id: 3, icon: '🪜', nameAr: 'خطوة بخطوة', nameEn: 'Step by Step', desc: 'تنقل تدريجي مع لوحة جانبية' },
  { id: 4, icon: '📄', nameAr: 'ورقة تفاعلية', nameEn: 'Paper', desc: 'تصميم ورقة امتحان حقيقية' },
  { id: 5, icon: '⬛', nameAr: 'شبكة', nameEn: 'Grid', desc: 'عرض شبكي للأسئلة' },
  { id: 6, icon: '🎬', nameAr: 'سينمائي', nameEn: 'Cinematic', desc: 'تجربة احترافية بمؤثرات' },
]

const qTypes: { type: QuestionType; icon: string; labelAr: string; labelEn: string }[] = [
  { type: 'mcq', icon: '🔘', labelAr: 'اختيار متعدد', labelEn: 'Multiple Choice' },
  { type: 'true_false', icon: '✓✗', labelAr: 'صح / خطأ', labelEn: 'True / False' },
  { type: 'fill', icon: '✏️', labelAr: 'تعبئة فراغ', labelEn: 'Fill in Blank' },
  { type: 'essay', icon: '📝', labelAr: 'مقالي', labelEn: 'Essay' },
]

function newQuestion(): QuestionDraft {
  return { id: Math.random().toString(36).slice(2), type: 'mcq', content: '', options: ['', '', '', ''], correct_answer: null, points: 5 }
}

export default function ExamBuilder({ teacher, groups, theme, isEnglish, onClose, onCreated }: ExamBuilderProps) {
  const [step, setStep] = useState<'settings' | 'questions'>('settings')
  const [title, setTitle] = useState('')
  const [layoutType, setLayoutType] = useState<ExamLayout>(1)
  const [durationMins, setDurationMins] = useState(60)
  const [selectedGroups, setSelectedGroups] = useState<string[]>([])
  const [scheduledAt, setScheduledAt] = useState('')
  const [questions, setQuestions] = useState<QuestionDraft[]>([newQuestion()])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const T = (ar: string, en: string) => isEnglish ? en : ar

  const toggleGroup = (id: string) =>
    setSelectedGroups(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])

  const updateQ = (id: string, patch: Partial<QuestionDraft>) =>
    setQuestions(prev => prev.map(q => q.id === id ? { ...q, ...patch } : q))

  const updateOption = (qId: string, idx: number, val: string) =>
    setQuestions(prev => prev.map(q => {
      if (q.id !== qId) return q
      const opts = [...q.options]; opts[idx] = val
      return { ...q, options: opts }
    }))

  const removeQ = (id: string) => setQuestions(prev => prev.filter(q => q.id !== id))

  const handleCreate = async () => {
    if (!title.trim()) { setError(T('عنوان الاختبار مطلوب', 'Exam title is required')); return }
    if (selectedGroups.length === 0) { setError(T('اختر مجموعة على الأقل', 'Select at least one group')); return }
    if (questions.some(q => !q.content.trim())) { setError(T('أكمل محتوى جميع الأسئلة', 'Fill all question content')); return }

    setLoading(true); setError('')

    const { data: exam, error: eErr } = await supabase
      .from('exams')
      .insert({ teacher_id: teacher.id, title: title.trim(), layout_type: layoutType, duration_mins: durationMins, scheduled_at: scheduledAt || null, status: 'draft' })
      .select().single()

    if (eErr || !exam) { setError(T('فشل الإنشاء', 'Creation failed')); setLoading(false); return }

    // Insert questions
    const questionRows = questions.map((q, i) => ({
      exam_id: exam.id,
      type: q.type,
      content: q.content,
      options: q.type === 'mcq' ? q.options.filter(Boolean) : null,
      correct_answer: q.correct_answer,
      points: q.points,
      media_url: null,
      order_index: i,
    }))
    await supabase.from('questions').insert(questionRows)

    // Link groups
    await supabase.from('exam_groups').insert(selectedGroups.map(gid => ({ exam_id: exam.id, group_id: gid })))

    setLoading(false)
    onCreated()
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        onClick={e => e.stopPropagation()}
        className="bg-white rounded-3xl w-full max-w-3xl shadow-2xl my-8 overflow-hidden"
        dir={isEnglish ? 'ltr' : 'rtl'}
      >
        {/* Header */}
        <div className="p-6 text-white" style={{ background: `linear-gradient(135deg, ${theme.color}, ${theme.bgColor})` }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{theme.icon}</span>
              <div>
                <h2 className="text-2xl font-black">{T('إنشاء اختبار جديد', 'Create New Exam')}</h2>
                <p className="text-white/70 text-sm">{step === 'settings' ? T('إعدادات الاختبار', 'Exam Settings') : T('إضافة الأسئلة', 'Add Questions')}</p>
              </div>
            </div>
            <button onClick={onClose} className="bg-white/20 hover:bg-white/30 w-10 h-10 rounded-xl flex items-center justify-center font-bold transition-colors">✕</button>
          </div>

          {/* Steps indicator */}
          <div className="flex items-center gap-3 mt-4">
            {[T('الإعدادات', 'Settings'), T('الأسئلة', 'Questions')].map((s, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-black transition-all ${
                  (i === 0 && step === 'settings') || (i === 1 && step === 'questions')
                    ? 'bg-white text-gray-800' : 'bg-white/30 text-white'
                }`}>{i + 1}</div>
                <span className="text-white/80 text-sm font-bold">{s}</span>
                {i === 0 && <span className="text-white/40 mx-1">→</span>}
              </div>
            ))}
          </div>
        </div>

        <div className="p-8">
          {/* ── Step 1: Settings ── */}
          {step === 'settings' && (
            <div className="space-y-6">
              {/* Title */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">{T('عنوان الاختبار', 'Exam Title')} *</label>
                <input value={title} onChange={e => setTitle(e.target.value)}
                  placeholder={T('مثال: امتحان نصف الترم - الباب الأول', 'e.g., Midterm Exam - Chapter 1')}
                  className="w-full border-2 border-gray-200 rounded-2xl px-5 py-4 text-lg font-semibold focus:outline-none transition-colors"
                  onFocus={e => e.target.style.borderColor = theme.bgColor}
                  onBlur={e => e.target.style.borderColor = '#e5e7eb'}
                />
              </div>

              {/* Layout */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-3">{T('نظام العرض', 'Display Layout')}</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {layouts.map(l => (
                    <motion.button key={l.id} type="button" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                      onClick={() => setLayoutType(l.id)}
                      className={`border-2 rounded-2xl p-4 text-right transition-all ${
                        layoutType === l.id ? 'border-current text-white shadow-lg' : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                      style={layoutType === l.id ? { background: theme.bgColor, borderColor: theme.bgColor } : {}}
                    >
                      <div className="text-2xl mb-1">{l.icon}</div>
                      <p className="font-black text-sm">{isEnglish ? l.nameEn : l.nameAr}</p>
                      <p className={`text-xs mt-1 ${layoutType === l.id ? 'text-white/70' : 'text-gray-400'}`}>{l.desc}</p>
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Duration + Schedule */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">{T('المدة (دقائق)', 'Duration (min)')}</label>
                  <input type="number" value={durationMins} onChange={e => setDurationMins(+e.target.value || 0)} min={1}
                    className="w-full border-2 border-gray-200 rounded-2xl px-5 py-4 text-lg font-bold focus:outline-none transition-colors"
                    onFocus={e => e.target.style.borderColor = theme.bgColor}
                    onBlur={e => e.target.style.borderColor = '#e5e7eb'}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">{T('جدولة (اختياري)', 'Schedule (optional)')}</label>
                  <input type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)}
                    className="w-full border-2 border-gray-200 rounded-2xl px-5 py-4 font-semibold focus:outline-none transition-colors"
                    onFocus={e => e.target.style.borderColor = theme.bgColor}
                    onBlur={e => e.target.style.borderColor = '#e5e7eb'}
                  />
                </div>
              </div>

              {/* Groups */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-3">{T('المجموعات', 'Groups')} *</label>
                {groups.length === 0 ? (
                  <div className="border-2 border-dashed border-gray-200 rounded-2xl p-8 text-center text-gray-400">
                    {T('لا توجد مجموعات. أنشئ مجموعة أولاً.', 'No groups. Create a group first.')}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {groups.map(g => {
                      const sel = selectedGroups.includes(g.id)
                      return (
                        <motion.label key={g.id} whileHover={{ scale: 1.02 }}
                          className={`flex items-center gap-3 cursor-pointer p-4 rounded-2xl border-2 transition-all ${
                            sel ? 'border-current' : 'border-gray-200 hover:border-gray-300'
                          }`}
                          style={sel ? { borderColor: theme.bgColor, background: theme.bgColor + '10' } : {}}
                        >
                          <input type="checkbox" checked={sel} onChange={() => toggleGroup(g.id)} className="hidden" />
                          <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-white text-xs font-black ${sel ? '' : 'border-2 border-gray-300'}`}
                            style={sel ? { background: theme.bgColor } : {}}
                          >{sel ? '✓' : ''}</div>
                          <span className="font-bold text-gray-700">{g.name}</span>
                        </motion.label>
                      )
                    })}
                  </div>
                )}
              </div>

              {error && <p className="text-red-500 font-bold text-sm">{error}</p>}

              <div className="flex gap-3 pt-2">
                <button onClick={onClose} className="flex-1 border-2 border-gray-200 text-gray-600 py-4 rounded-2xl font-bold hover:bg-gray-50">
                  {T('إلغاء', 'Cancel')}
                </button>
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  onClick={() => { if (!title.trim() || selectedGroups.length === 0) { setError(T('أكمل الحقول المطلوبة', 'Fill required fields')); return } setError(''); setStep('questions') }}
                  className="flex-1 text-white py-4 rounded-2xl font-black shadow-lg"
                  style={{ background: `linear-gradient(135deg, ${theme.color}, ${theme.bgColor})` }}
                >{T('التالي: الأسئلة →', 'Next: Questions →')}</motion.button>
              </div>
            </div>
          )}

          {/* ── Step 2: Questions ── */}
          {step === 'questions' && (
            <div>
              <div className="space-y-6 max-h-[55vh] overflow-y-auto px-1">
                {questions.map((q, idx) => (
                  <motion.div key={q.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    className="border-2 border-gray-100 rounded-2xl p-6 relative hover:border-gray-200 transition-colors"
                  >
                    {/* Q header */}
                    <div className="flex items-center gap-3 mb-4">
                      <span className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-sm font-black"
                        style={{ background: theme.bgColor }}>{idx + 1}</span>
                      <div className="flex gap-2 flex-wrap">
                        {qTypes.map(qt => (
                          <button key={qt.type} type="button"
                            onClick={() => updateQ(q.id, { type: qt.type, options: qt.type === 'mcq' ? ['', '', '', ''] : [], correct_answer: null })}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                              q.type === qt.type ? 'text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                            style={q.type === qt.type ? { background: theme.bgColor } : {}}
                          >{qt.icon} {isEnglish ? qt.labelEn : qt.labelAr}</button>
                        ))}
                      </div>
                      <div className="flex items-center gap-2 mr-auto">
                        <input type="number" value={q.points} onChange={e => updateQ(q.id, { points: +e.target.value || 1 })}
                          min={1} className="w-16 border-2 border-gray-200 rounded-lg px-2 py-1 text-center font-bold text-sm focus:outline-none"
                          title={T('الدرجة', 'Points')}
                        />
                        <span className="text-xs text-gray-400">{T('درجة', 'pt')}</span>
                        {questions.length > 1 && (
                          <button onClick={() => removeQ(q.id)} className="text-red-400 hover:text-red-600 text-xl leading-none">✕</button>
                        )}
                      </div>
                    </div>

                    {/* Content */}
                    <textarea value={q.content} onChange={e => updateQ(q.id, { content: e.target.value })}
                      rows={2} placeholder={T('اكتب السؤال هنا...', 'Write the question here...')}
                      className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 font-semibold focus:outline-none resize-none mb-4 transition-colors"
                      onFocus={e => e.target.style.borderColor = theme.bgColor}
                      onBlur={e => e.target.style.borderColor = '#e5e7eb'}
                    />

                    {/* MCQ Options */}
                    {q.type === 'mcq' && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {q.options.map((opt, i) => {
                          const letters = ['أ', 'ب', 'ج', 'د']
                          const isCorrect = q.correct_answer === opt && opt.trim()
                          return (
                            <div key={i} className="flex items-center gap-2">
                              <button type="button" onClick={() => opt.trim() && updateQ(q.id, { correct_answer: opt })}
                                className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-black flex-shrink-0 transition-all ${
                                  isCorrect ? 'text-white shadow-md' : 'bg-gray-100 text-gray-500'
                                }`}
                                style={isCorrect ? { background: theme.bgColor } : {}}
                              >{letters[i]}</button>
                              <input value={opt} onChange={e => { updateOption(q.id, i, e.target.value); if (isCorrect) updateQ(q.id, { correct_answer: e.target.value }) }}
                                placeholder={T(`الخيار ${letters[i]}`, `Option ${String.fromCharCode(65 + i)}`)}
                                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm font-medium focus:outline-none"
                              />
                            </div>
                          )
                        })}
                        <p className="col-span-2 text-xs text-gray-400 mt-1">{T('اضغط على الحرف لتحديد الإجابة الصحيحة', 'Click the letter to mark correct answer')}</p>
                      </div>
                    )}

                    {/* True/False */}
                    {q.type === 'true_false' && (
                      <div className="flex gap-3">
                        {[{ v: true, l: T('✓ صح', '✓ True') }, { v: false, l: T('✗ خطأ', '✗ False') }].map(({ v, l }) => (
                          <button key={String(v)} type="button" onClick={() => updateQ(q.id, { correct_answer: v })}
                            className={`flex-1 py-3 rounded-xl font-bold text-lg transition-all ${
                              q.correct_answer === v ? 'text-white shadow-lg' : 'bg-gray-100 text-gray-600'
                            }`}
                            style={q.correct_answer === v ? { background: theme.bgColor } : {}}
                          >{l}</button>
                        ))}
                      </div>
                    )}

                    {/* Fill */}
                    {q.type === 'fill' && (
                      <input value={(q.correct_answer as string) || ''} onChange={e => updateQ(q.id, { correct_answer: e.target.value })}
                        placeholder={T('الإجابة الصحيحة...', 'Correct answer...')}
                        className="w-full border-2 border-green-200 rounded-xl px-4 py-3 text-sm font-semibold focus:outline-none bg-green-50"
                      />
                    )}

                    {q.type === 'essay' && (
                      <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-3 text-amber-700 text-sm font-semibold">
                        {T('سؤال مقالي - يصحح المدرس يدوياً', 'Essay - graded manually by teacher')}
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>

              {/* Add question */}
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                onClick={() => setQuestions(prev => [...prev, newQuestion()])}
                className="w-full mt-4 border-2 border-dashed border-gray-300 rounded-2xl py-4 font-bold text-gray-500 hover:border-current hover:text-current transition-all"
                style={{ '--tw-text-opacity': 1 } as React.CSSProperties}
              >+ {T('إضافة سؤال', 'Add Question')}</motion.button>

              {error && <p className="text-red-500 font-bold text-sm mt-3">{error}</p>}

              <div className="flex gap-3 mt-6">
                <button onClick={() => setStep('settings')} className="flex-1 border-2 border-gray-200 text-gray-600 py-4 rounded-2xl font-bold hover:bg-gray-50">
                  ← {T('رجوع', 'Back')}
                </button>
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  onClick={handleCreate} disabled={loading}
                  className="flex-1 text-white py-4 rounded-2xl font-black shadow-lg disabled:opacity-50"
                  style={{ background: `linear-gradient(135deg, ${theme.color}, ${theme.bgColor})` }}
                >
                  {loading
                    ? T('جاري الإنشاء...', 'Creating...')
                    : T(`✅ إنشاء الاختبار (${questions.length} أسئلة)`, `✅ Create Exam (${questions.length} questions)`)
                  }
                </motion.button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  )
}
