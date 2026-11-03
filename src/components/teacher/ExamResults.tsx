import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '../../lib/supabase'
import { Exam, Question, Submission } from '../../types'
import { SubjectTheme } from '../../theme/subjectThemes'
import { scoreColor, scoreLabel, scoreSubmission } from '../../lib/scoring'
import { gradeSubmission } from '../../lib/examApi'

type Row = Submission & { students?: { name: string; code: string } }

export default function ExamResults({
  exam, theme, isEnglish, onClose,
}: {
  exam: Exam
  theme: SubjectTheme
  isEnglish: boolean
  onClose: () => void
}) {
  const T = (ar: string, en: string) => (isEnglish ? en : ar)
  const [questions, setQuestions] = useState<Question[]>([])
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [editId, setEditId] = useState<string | null>(null)
  const [essayPct, setEssayPct] = useState('')
  const [openId, setOpenId] = useState<string | null>(null)

  const load = async () => {
    const [{ data: qs }, { data: subs }] = await Promise.all([
      supabase.from('questions').select('*').eq('exam_id', exam.id).order('order_index'),
      supabase.from('submissions').select('*, students(name, code)').eq('exam_id', exam.id).order('submitted_at', { ascending: false }),
    ])
    setQuestions((qs || []) as Question[])
    setRows((subs || []) as Row[])
    setLoading(false)
  }

  useEffect(() => { load() }, [exam.id])

  const hasEssay = questions.some(q => q.type === 'essay')

  const save = async (row: Row) => {
    const pct = Number(essayPct)
    if (Number.isNaN(pct)) return
    await gradeSubmission(row.id, pct, questions, (row.answers || {}) as Record<string, unknown>)
    setEditId(null)
    load()
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        onClick={e => e.stopPropagation()}
        className="bg-white w-full sm:max-w-4xl sm:rounded-3xl rounded-t-3xl max-h-[92vh] overflow-hidden flex flex-col"
        dir={isEnglish ? 'ltr' : 'rtl'}
      >
        <div className="p-4 sm:p-6 text-white flex items-center justify-between" style={{ background: `linear-gradient(135deg, ${theme.color}, ${theme.bgColor})` }}>
          <div>
            <h2 className="text-xl sm:text-2xl font-black">{T('نتائج الاختبار', 'Exam results')}</h2>
            <p className="text-white/80 text-sm">{exam.title}</p>
          </div>
          <button onClick={onClose} className="bg-white/20 w-10 h-10 rounded-xl font-bold">✕</button>
        </div>

        <div className="p-4 sm:p-6 overflow-y-auto">
          {loading && <p className="text-center text-gray-400 py-10">{T('جاري التحميل...', 'Loading...')}</p>}
          {!loading && rows.length === 0 && (
            <p className="text-center text-gray-400 py-10">{T('لا توجد إجابات بعد', 'No submissions yet')}</p>
          )}
          <div className="space-y-3">
            {rows.map(row => {
              const live = scoreSubmission(questions, (row.answers || {}) as Record<string, unknown>, {
                essayScorePoints: row.essay_score == null ? null : undefined,
                forceZero: row.auto_score === 0 && Object.keys(row.answers || {}).length === 0,
              })
              const total = row.total_score
              const color = scoreColor(total)
              const cheat = Array.isArray(row.cheat_log) && row.cheat_log.length > 0
              return (
                <div key={row.id} className={`border rounded-2xl p-4 ${cheat ? 'border-red-200 bg-red-50/40' : 'border-gray-100'}`}>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-gray-800 truncate">{row.students?.name || '—'}</p>
                      <p className="text-xs text-gray-400 font-mono">{row.students?.code} • {new Date(row.submitted_at).toLocaleString('ar-EG')}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold bg-gray-100 px-2 py-1 rounded-lg">
                        {T('تلقائي', 'Auto')} {row.auto_score ?? live.auto_score}%
                      </span>
                      <span className="text-lg font-black" style={{ color }}>{total == null ? T('قيد التصحيح', 'Pending') : `${total}%`}</span>
                      <span className="text-xs font-bold px-2 py-1 rounded-lg" style={{ background: color + '22', color }}>{scoreLabel(total)}</span>
                      {cheat && <span className="text-xs text-red-600 font-bold">⚠️ {T('غش', 'Cheat')}</span>}
                      {hasEssay && (
                        editId === row.id ? (
                          <div className="flex gap-1">
                            <input value={essayPct} onChange={e => setEssayPct(e.target.value)} type="number" min={0} max={100}
                              className="w-16 border rounded-lg px-2 py-1 text-sm text-center" placeholder="%" />
                            <button onClick={() => save(row)} className="bg-green-600 text-white px-2 rounded-lg text-xs font-bold">{T('حفظ', 'Save')}</button>
                            <button onClick={() => setEditId(null)} className="px-2">×</button>
                          </div>
                        ) : (
                          <button onClick={() => { setEditId(row.id); setEssayPct(String(row.essay_score ?? '')) }}
                            className="text-xs font-bold px-3 py-1.5 rounded-lg text-white" style={{ background: theme.bgColor }}>
                            {T('تصحيح المقال', 'Grade essay')}
                          </button>
                        )
                      )}
                      <button onClick={() => setOpenId(openId === row.id ? null : row.id)} className="text-xs text-gray-500 font-bold">
                        {openId === row.id ? T('إخفاء', 'Hide') : T('التفاصيل', 'Details')}
                      </button>
                    </div>
                  </div>
                  {openId === row.id && (
                    <div className="mt-3 space-y-2 text-sm">
                      {questions.map((q, i) => {
                        const ans = (row.answers as Record<string, unknown> | undefined)?.[q.id]
                        const mark = live.perQuestion[q.id]
                        return (
                          <div key={q.id} className="bg-gray-50 rounded-xl p-3">
                            <p className="font-bold text-gray-700">{i + 1}. {q.content}</p>
                            <p className="text-gray-500 mt-1">{T('إجابة الطالب', 'Answer')}: {ans === undefined ? '—' : String(ans)}</p>
                            {q.type !== 'essay' && (
                              <p className={mark?.correct ? 'text-green-600' : 'text-red-500'}>
                                {mark?.correct ? T('صحيحة', 'Correct') : T('خطأ', 'Wrong')} · {mark?.earned}/{q.points}
                              </p>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </motion.div>
    </div>
  )
}
