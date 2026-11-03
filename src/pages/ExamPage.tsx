import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabase'
import { Exam, Question, CheatEvent } from '../types'
import { isMobileViewport } from '../lib/device'
import { submitExamAttempt } from '../lib/examApi'
import { clearExamSession, getOrCreateDeadline, loadExamDraft, saveExamDraft } from '../lib/examSession'
import SessionManager from '../lib/sessionManager'

// ─── Anti-Cheat: ignores keyboard/blur noise on phones, grace + cooldown ─────
function useAntiCheat(enabled: boolean, onCheat: (event: CheatEvent) => void) {
  const started = useRef(Date.now())
  const last = useRef(0)

  useEffect(() => {
    if (!enabled) return
    started.current = Date.now()
    const mobile = isMobileViewport()

    const report = (type: CheatEvent['type']) => {
      const now = Date.now()
      if (now - started.current < 5000) return
      if (now - last.current < 10000) return
      last.current = now
      onCheat({ type, timestamp: new Date().toISOString() })
    }

    const onVisibility = () => {
      if (document.hidden) report('tab_switch')
    }
    const onBlur = () => {
      if (!mobile && !document.hidden) report('window_blur')
    }

    document.addEventListener('visibilitychange', onVisibility)
    if (!mobile) window.addEventListener('blur', onBlur)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('blur', onBlur)
    }
  }, [enabled, onCheat])
}

function ExamTimer({ deadline, onExpire }: { deadline: number; onExpire: () => void }) {
  const [seconds, setSeconds] = useState(() => Math.max(0, Math.ceil((deadline - Date.now()) / 1000)))
  const done = useRef(false)

  useEffect(() => {
    const tick = () => {
      const left = Math.max(0, Math.ceil((deadline - Date.now()) / 1000))
      setSeconds(left)
      if (left <= 0 && !done.current) {
        done.current = true
        onExpire()
      }
    }
    tick()
    const interval = window.setInterval(tick, 250)
    return () => window.clearInterval(interval)
  }, [deadline, onExpire])

  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  const urgent = seconds <= 120

  return (
    <motion.div
      animate={urgent ? { scale: [1, 1.05, 1] } : {}}
      transition={{ duration: 1, repeat: Infinity }}
      className={`flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl font-mono font-black text-base sm:text-xl ${
        urgent ? 'bg-red-100 text-red-600' : 'bg-white/20 text-white'
      }`}
    >
      ⏱ {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
    </motion.div>
  )
}

// ─── Question Renderer ────────────────────────────────────────────────────────
function QuestionView({ q, idx, answer, onChange, accentColor }: {
  q: Question; idx: number; answer: unknown; onChange: (val: unknown) => void; accentColor: string
}) {
  return (
    <div>
      <p className="font-black text-gray-800 text-base sm:text-lg mb-4 sm:mb-5 leading-relaxed">
        <span className="inline-flex items-center justify-center w-9 h-9 rounded-full text-white text-sm font-black ml-3"
          style={{ background: accentColor }}
        >{idx + 1}</span>
        {q.content}
      </p>
      {q.media_url && (
        <img src={q.media_url} alt="" className="rounded-xl mb-4 max-h-60 object-contain" />
      )}

      {q.type === 'mcq' && q.options && (
        <div className="grid grid-cols-1 gap-3">
          {(q.options as string[]).map((opt, i) => {
            const letters = ['أ', 'ب', 'ج', 'د', 'ه', 'و']
            const selected = answer === opt
            return (
              <motion.label
                key={i}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                className={`flex items-center gap-4 cursor-pointer p-4 rounded-2xl border-2 transition-all ${
                  selected ? 'border-current bg-current/10' : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
                style={selected ? { borderColor: accentColor, backgroundColor: accentColor + '15' } : {}}
              >
                <input type="radio" name={`q-${q.id}`} value={opt}
                  checked={selected} onChange={() => onChange(opt)} className="hidden" />
                <span className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm flex-shrink-0 ${
                  selected ? 'text-white' : 'bg-gray-100 text-gray-600'
                }`} style={selected ? { background: accentColor } : {}}>
                  {letters[i] || i + 1}
                </span>
                <span className={`font-semibold ${selected ? 'text-gray-800' : 'text-gray-700'}`}>{opt}</span>
                {selected && <span className="mr-auto text-2xl">✓</span>}
              </motion.label>
            )
          })}
        </div>
      )}

      {q.type === 'true_false' && (
        <div className="flex gap-4">
          {[{ val: true, label: '✓ صح', color: 'from-green-500 to-emerald-500' },
            { val: false, label: '✗ خطأ', color: 'from-red-500 to-rose-500' }].map(({ val, label, color }) => (
            <motion.button key={String(val)} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={() => onChange(val)}
              className={`flex-1 py-5 rounded-2xl font-black text-xl transition-all ${
                answer === val
                  ? `bg-gradient-to-r ${color} text-white shadow-xl`
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >{label}</motion.button>
          ))}
        </div>
      )}

      {q.type === 'fill' && (
        <input
          type="text"
          value={(answer as string) || ''}
          onChange={e => onChange(e.target.value)}
          placeholder="اكتب الإجابة هنا..."
          className="w-full border-2 border-gray-200 rounded-xl px-5 py-4 text-lg font-semibold focus:outline-none transition-colors"
          style={{ '--tw-ring-color': accentColor } as React.CSSProperties}
          onFocus={e => e.target.style.borderColor = accentColor}
          onBlur={e => e.target.style.borderColor = '#e5e7eb'}
        />
      )}

      {q.type === 'essay' && (
        <textarea
          value={(answer as string) || ''}
          onChange={e => onChange(e.target.value)}
          rows={6}
          placeholder="اكتب إجابتك التفصيلية هنا..."
          className="w-full border-2 border-gray-200 rounded-2xl px-5 py-4 text-lg focus:outline-none resize-none transition-colors"
          onFocus={e => e.target.style.borderColor = accentColor}
          onBlur={e => e.target.style.borderColor = '#e5e7eb'}
        />
      )}
    </div>
  )
}

// ─── Layout 1: Classic ────────────────────────────────────────────────────────
function ClassicLayout({ exam, questions, answers, setAnswer, accentColor, onSubmit, submitting }: LayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50 pb-28 sm:pb-20" dir="rtl">
      <div className="max-w-4xl mx-auto px-3 sm:px-4 py-5 sm:py-8 space-y-4 sm:space-y-6">
        {questions.map((q, idx) => (
          <motion.div key={q.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="bg-white rounded-2xl sm:rounded-3xl shadow-sm border border-gray-100 p-4 sm:p-8"
          >
            <QuestionView q={q} idx={idx} answer={answers[q.id]} onChange={v => setAnswer(q.id, v)} accentColor={accentColor} />
          </motion.div>
        ))}
        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
          onClick={onSubmit} disabled={submitting}
          className="w-full py-5 rounded-2xl font-black text-xl text-white shadow-2xl transition-all disabled:opacity-50"
          style={{ background: `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)` }}
        >
          {submitting ? '⏳ جاري الإرسال...' : '✅ إرسال الإجابات'}
        </motion.button>
      </div>
    </div>
  )
}

// ─── Layout 2: Cards ─────────────────────────────────────────────────────────
function CardsLayout({ exam, questions, answers, setAnswer, accentColor, onSubmit, submitting }: LayoutProps) {
  const [current, setCurrent] = useState(0)
  const q = questions[current]
  const answered = Object.keys(answers).length

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-900 to-gray-800 text-white" dir="rtl">
      {/* Progress */}
      <div className="p-6">
        <div className="flex items-center justify-between mb-3 text-sm font-bold text-gray-300">
          <span>سؤال {current + 1} من {questions.length}</span>
          <span>{answered} / {questions.length} تمت الإجابة</span>
        </div>
        <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ background: accentColor }}
            animate={{ width: `${((current + 1) / questions.length) * 100}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>
      </div>

      {/* Card */}
      <div className="flex-1 flex items-center justify-center px-6">
        <AnimatePresence mode="wait">
          <motion.div key={current}
            initial={{ opacity: 0, x: 100, rotateY: -15 }}
            animate={{ opacity: 1, x: 0, rotateY: 0 }}
            exit={{ opacity: 0, x: -100, rotateY: 15 }}
            transition={{ duration: 0.4, type: 'spring', stiffness: 300 }}
            className="w-full max-w-2xl bg-white text-gray-800 rounded-3xl shadow-2xl p-5 sm:p-10"
          >
            <QuestionView q={q} idx={current} answer={answers[q.id]} onChange={v => setAnswer(q.id, v)} accentColor={accentColor} />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <div className="p-4 sm:p-6 flex items-center justify-between gap-2 sm:gap-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
          onClick={() => setCurrent(p => Math.max(0, p - 1))} disabled={current === 0}
          className="px-4 sm:px-8 py-3 sm:py-4 rounded-2xl font-black bg-white/10 disabled:opacity-30 hover:bg-white/20 transition-all text-sm sm:text-base"
        >← السابق</motion.button>

        {/* Dots */}
        <div className="flex gap-2 flex-wrap justify-center">
          {questions.map((_, i) => (
            <button key={i} onClick={() => setCurrent(i)}
              className={`w-3 h-3 rounded-full transition-all ${i === current ? 'scale-125' : answers[questions[i].id] !== undefined ? 'opacity-70' : 'bg-gray-600'}`}
              style={i === current || answers[questions[i].id] !== undefined ? { background: accentColor } : {}}
            />
          ))}
        </div>

        {current === questions.length - 1 ? (
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            onClick={onSubmit} disabled={submitting}
            className="px-4 sm:px-8 py-3 sm:py-4 rounded-2xl font-black text-white shadow-xl text-sm sm:text-base"
            style={{ background: accentColor }}
          >{submitting ? '⏳' : '✅ إرسال'}</motion.button>
        ) : (
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            onClick={() => setCurrent(p => Math.min(questions.length - 1, p + 1))}
            className="px-4 sm:px-8 py-3 sm:py-4 rounded-2xl font-black text-white text-sm sm:text-base"
            style={{ background: accentColor }}
          >التالي →</motion.button>
        )}
      </div>
    </div>
  )
}

// ─── Layout 3: Step-by-Step ───────────────────────────────────────────────────
function StepLayout({ exam, questions, answers, setAnswer, accentColor, onSubmit, submitting }: LayoutProps) {
  const [current, setCurrent] = useState(0)

  return (
    <div className="min-h-screen bg-white" dir="rtl">
      {/* Side progress */}
      <div className="fixed top-0 right-0 bottom-0 w-72 bg-gray-50 border-l border-gray-200 p-6 overflow-y-auto hidden lg:block">
        <p className="font-black text-gray-800 text-lg mb-4">الأسئلة</p>
        <div className="space-y-2">
          {questions.map((q, i) => {
            const done = answers[q.id] !== undefined
            const active = i === current
            return (
              <button key={q.id} onClick={() => setCurrent(i)}
                className={`w-full text-right px-4 py-3 rounded-xl font-bold text-sm transition-all ${
                  active ? 'text-white shadow-md' : done ? 'bg-green-50 text-green-700 hover:bg-green-100' : 'bg-white text-gray-600 hover:bg-gray-100'
                }`}
                style={active ? { background: accentColor } : {}}
              >
                <span className={`inline-flex w-6 h-6 rounded-full items-center justify-center text-xs font-black ml-2 ${
                  active ? 'bg-white/30' : done ? 'bg-green-200 text-green-800' : 'bg-gray-200 text-gray-600'
                }`}>{i + 1}</span>
                {q.content.substring(0, 30)}...
              </button>
            )
          })}
        </div>
      </div>

      {/* Main content */}
      <div className="lg:ml-72 min-h-screen flex flex-col">
        <div className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 py-8 sm:py-12">
          <AnimatePresence mode="wait">
            <motion.div key={current}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -30 }}
              className="bg-white rounded-3xl border-2 border-gray-100 p-5 sm:p-10 shadow-lg"
            >
              <QuestionView q={questions[current]} idx={current} answer={answers[questions[current].id]}
                onChange={v => setAnswer(questions[current].id, v)} accentColor={accentColor} />
            </motion.div>
          </AnimatePresence>

          <div className="flex gap-4 mt-8">
            {current > 0 && (
              <button onClick={() => setCurrent(p => p - 1)}
                className="flex-1 py-4 rounded-2xl font-black border-2 border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors">
                ← السابق
              </button>
            )}
            {current < questions.length - 1 ? (
              <motion.button whileHover={{ scale: 1.02 }} onClick={() => setCurrent(p => p + 1)}
                className="flex-1 py-4 rounded-2xl font-black text-white shadow-xl"
                style={{ background: accentColor }}
              >التالي →</motion.button>
            ) : (
              <motion.button whileHover={{ scale: 1.02 }} onClick={onSubmit} disabled={submitting}
                className="flex-1 py-4 rounded-2xl font-black text-white shadow-xl"
                style={{ background: accentColor }}
              >{submitting ? '⏳ جاري الإرسال...' : '✅ إرسال الإجابات'}</motion.button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Layout 4: Paper (Interactive Exam Sheet) ─────────────────────────────────
function PaperLayout({ exam, questions, answers, setAnswer, accentColor, onSubmit, submitting }: LayoutProps) {
  return (
    <div className="min-h-screen bg-amber-50 py-10 px-4" dir="rtl">
      <div className="max-w-3xl mx-auto">
        {/* Paper Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border-4 border-gray-800 rounded-lg p-8 mb-2 relative shadow-2xl"
          style={{ fontFamily: "'Cairo', sans-serif" }}
        >
          <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-gray-800 to-gray-600" />
          <div className="text-center mb-6">
            <div className="text-4xl mb-2" style={{ color: accentColor }}>اختبرني</div>
            <h1 className="text-3xl font-black text-gray-800 border-b-4 border-gray-800 pb-3 mb-4">{exam.title}</h1>
            <div className="flex justify-between text-sm text-gray-600 font-bold">
              <span>المدة: {exam.duration_mins} دقيقة</span>
              <span>عدد الأسئلة: {questions.length}</span>
              <span>الدرجة الكلية: {questions.reduce((s, q) => s + q.points, 0)}</span>
            </div>
          </div>
        </motion.div>

        {/* Paper Lines Background */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-white border-4 border-gray-800 rounded-b-lg border-t-0 shadow-2xl"
          style={{ backgroundImage: 'repeating-linear-gradient(transparent, transparent 31px, #e5e7eb 31px, #e5e7eb 32px)', backgroundSize: '100% 32px', backgroundPositionY: '8px' }}
        >
          <div className="p-8 space-y-8">
            {questions.map((q, idx) => (
              <div key={q.id} className="relative">
                <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-gray-200 hover:border-current transition-colors"
                  style={{ '--hover-border': accentColor } as React.CSSProperties}>
                  <QuestionView q={q} idx={idx} answer={answers[q.id]} onChange={v => setAnswer(q.id, v)} accentColor={accentColor} />
                  <div className="flex justify-between mt-3 text-xs text-gray-400">
                    <span>الدرجة: {q.points}</span>
                    <span className={answers[q.id] !== undefined ? 'text-green-600 font-bold' : ''}>
                      {answers[q.id] !== undefined ? '✓ تمت الإجابة' : '○ لم تتم الإجابة'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="p-8 border-t-2 border-gray-200">
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              onClick={onSubmit} disabled={submitting}
              className="w-full py-5 rounded-xl font-black text-xl text-white shadow-xl"
              style={{ background: `linear-gradient(135deg, ${accentColor}, ${accentColor}bb)` }}
            >{submitting ? '⏳ جاري الإرسال...' : '📤 تسليم الإجابات'}</motion.button>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

// ─── Layout 5: Grid ───────────────────────────────────────────────────────────
function GridLayout({ exam, questions, answers, setAnswer, accentColor, onSubmit, submitting }: LayoutProps) {
  const [focused, setFocused] = useState<string | null>(null)
  const answered = Object.keys(answers).length

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 pb-20" dir="rtl">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats */}
        <div className="flex gap-6 mb-8 text-white flex-wrap">
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl px-6 py-4">
            <p className="text-sm text-gray-300">الأسئلة</p>
            <p className="text-3xl font-black">{questions.length}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl px-6 py-4">
            <p className="text-sm text-gray-300">تمت الإجابة</p>
            <p className="text-3xl font-black" style={{ color: accentColor }}>{answered}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl px-6 py-4">
            <p className="text-sm text-gray-300">متبقي</p>
            <p className="text-3xl font-black text-yellow-400">{questions.length - answered}</p>
          </div>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {questions.map((q, idx) => {
            const done = answers[q.id] !== undefined
            const active = focused === q.id
            return (
              <motion.div key={q.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.03 }}
                whileHover={{ y: -4 }}
                className={`bg-white rounded-3xl shadow-xl p-6 cursor-pointer transition-all ${active ? 'ring-4 ring-current' : ''}`}
                onClick={() => setFocused(active ? null : q.id)}
              >
                <div className="flex items-center gap-3 mb-4">
                  <span className="w-10 h-10 rounded-2xl flex items-center justify-center font-black text-white text-sm"
                    style={{ background: done ? '#22c55e' : accentColor }}>
                    {done ? '✓' : idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-gray-400 uppercase mb-1">{
                      q.type === 'mcq' ? 'اختيار من متعدد' :
                      q.type === 'true_false' ? 'صح أو خطأ' :
                      q.type === 'essay' ? 'مقالي' :
                      q.type === 'fill' ? 'تعبئة' : q.type
                    }</p>
                    <span className="text-xs font-bold" style={{ color: accentColor }}>{q.points} درجة</span>
                  </div>
                </div>
                <p className="text-gray-700 font-semibold text-sm mb-4 line-clamp-2">{q.content}</p>
                <AnimatePresence>
                  {active && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                      <QuestionView q={q} idx={idx} answer={answers[q.id]} onChange={v => setAnswer(q.id, v)} accentColor={accentColor} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )
          })}
        </div>

        {/* Submit */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
        >
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            onClick={onSubmit} disabled={submitting}
            className="px-16 py-5 rounded-2xl font-black text-xl text-white shadow-2xl backdrop-blur-sm"
            style={{ background: `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)` }}
          >{submitting ? '⏳' : `✅ إرسال (${answered}/${questions.length})`}</motion.button>
        </motion.div>
      </div>
    </div>
  )
}

// ─── Layout 6: Cinematic ──────────────────────────────────────────────────────
function CinematicLayout({ exam, questions, answers, setAnswer, accentColor, onSubmit, submitting }: LayoutProps) {
  const [current, setCurrent] = useState(0)
  const q = questions[current]

  return (
    <div className="min-h-screen flex items-center justify-center overflow-hidden relative" dir="rtl"
      style={{ background: `radial-gradient(ellipse at center, ${accentColor}22 0%, #0f0f1a 70%)` }}>
      {/* Animated particles */}
      {[...Array(8)].map((_, i) => (
        <motion.div key={i}
          className="absolute w-2 h-2 rounded-full opacity-20"
          style={{ background: accentColor, top: `${Math.random() * 100}%`, left: `${Math.random() * 100}%` }}
          animate={{ y: [-20, 20, -20], opacity: [0.1, 0.4, 0.1] }}
          transition={{ duration: 3 + i, repeat: Infinity, delay: i * 0.4 }}
        />
      ))}

      <div className="w-full max-w-2xl px-6 relative z-10">
        {/* Question counter */}
        <motion.div
          key={current}
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <span className="text-gray-400 font-bold text-sm">سؤال {current + 1} من {questions.length}</span>
        </motion.div>

        {/* Question Card */}
        <AnimatePresence mode="wait">
          <motion.div key={current}
            initial={{ opacity: 0, scale: 0.8, rotateX: 15 }}
            animate={{ opacity: 1, scale: 1, rotateX: 0 }}
            exit={{ opacity: 0, scale: 0.8, rotateX: -15 }}
            transition={{ duration: 0.5, type: 'spring', stiffness: 200 }}
            className="bg-white/10 backdrop-blur-2xl border border-white/20 rounded-3xl p-5 sm:p-10 text-white shadow-2xl"
          >
            <QuestionView q={q} idx={current} answer={answers[q.id]} onChange={v => setAnswer(q.id, v)} accentColor={accentColor} />
          </motion.div>
        </AnimatePresence>

        {/* Controls */}
        <div className="flex justify-between mt-8 gap-4">
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            onClick={() => setCurrent(p => Math.max(0, p - 1))} disabled={current === 0}
            className="px-8 py-4 rounded-2xl font-black text-white bg-white/10 hover:bg-white/20 disabled:opacity-20 backdrop-blur-sm"
          >←</motion.button>

          {current === questions.length - 1 ? (
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={onSubmit} disabled={submitting}
              className="flex-1 py-4 rounded-2xl font-black text-white shadow-2xl"
              style={{ background: `linear-gradient(135deg, ${accentColor}, ${accentColor}99)` }}
            >{submitting ? '⏳' : '✅ إرسال الإجابات'}</motion.button>
          ) : (
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={() => setCurrent(p => Math.min(questions.length - 1, p + 1))}
              className="flex-1 py-4 rounded-2xl font-black text-white"
              style={{ background: `linear-gradient(135deg, ${accentColor}, ${accentColor}99)` }}
            >التالي →</motion.button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Layout Props ─────────────────────────────────────────────────────────────
interface LayoutProps {
  exam: Exam
  questions: Question[]
  answers: Record<string, unknown>
  setAnswer: (id: string, val: unknown) => void
  accentColor: string
  onSubmit: () => void
  submitting: boolean
}

// ─── Cheat Warning Modal ──────────────────────────────────────────────────────
function CheatWarning({ count, onDismiss, autoZero }: { count: number; onDismiss: () => void; autoZero: boolean }) {
  return (
    <AnimatePresence>
      {count > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[9999] p-4"
        >
          <motion.div
            initial={{ scale: 0.5, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            className="bg-white rounded-3xl p-10 max-w-md w-full text-center shadow-2xl"
          >
            <div className="text-7xl mb-4">{autoZero ? '🚫' : '⚠️'}</div>
            <h2 className="text-3xl font-black text-red-600 mb-3">
              {autoZero ? 'تم إلغاء الاختبار!' : 'تحذير!'}
            </h2>
            <p className="text-gray-600 mb-4 text-lg">
              {autoZero
                ? 'تم رصد محاولة الغش. سيتم إرسال الإجابات بدرجة صفر.'
                : `تم رصد مغادرة الاختبار. تحذير رقم ${count}.`}
            </p>
            {!autoZero && (
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                onClick={onDismiss}
                className="bg-red-600 text-white px-8 py-4 rounded-2xl font-black text-lg w-full hover:bg-red-700 transition-colors"
              >أفهم، سأعود للاختبار</motion.button>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ─── Main ExamPage ─────────────────────────────────────────────────────────────
export default function ExamPage() {
  const { examId } = useParams<{ examId: string }>()
  const navigate = useNavigate()
  const [exam, setExam] = useState<Exam | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [answers, setAnswers] = useState<Record<string, unknown>>({})
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [cheatLog, setCheatLog] = useState<CheatEvent[]>([])
  const [cheatWarnings, setCheatWarnings] = useState(0)
  const [showCheatWarning, setShowCheatWarning] = useState(false)
  const [autoZero, setAutoZero] = useState(false)
  const [accentColor, setAccentColor] = useState('#0d9488')
  const [deadline, setDeadline] = useState<number | null>(null)
  const [submitError, setSubmitError] = useState('')
  const submittedRef = useRef(false)
  const studentIdRef = useRef<string | null>(null)
  const submitFn = useRef<(forceZero?: boolean) => Promise<void>>(async () => {})

  useEffect(() => {
    const examCode = SessionManager.getStudentCode()
    if (!examCode || !examId) { 
      navigate('/student')
      return 
    }
    
    // ✅ SECURITY: استخدم SessionManager بدلاً من localStorage
    const loadExam = async () => {
      const studentId = await SessionManager.getStudentIdFromCode()
      if (!studentId) {
        navigate('/student')
        return
      }
      studentIdRef.current = studentId
      fetchExam(studentId)
    }
    
    loadExam()
  }, [examId])

  const fetchExam = async (studentId: string) => {
    const { data: examData } = await supabase.from('exams').select('*, teachers(subject)').eq('id', examId).single()
    const { data: questionsData } = await supabase.from('questions').select('*').eq('exam_id', examId).order('order_index')

    const { data: existingSub } = await supabase
      .from('submissions')
      .select('id')
      .eq('student_id', studentId)
      .eq('exam_id', examId!)
      .limit(1)
      .maybeSingle()

    if (existingSub) {
      navigate('/student/portal', { state: { alreadySubmitted: true } })
      return
    }

    const loaded = examData as Exam | null
    setExam(loaded)
    setQuestions((questionsData || []) as Question[])

    const draft = loadExamDraft(examId!, studentId)
    if (draft) {
      setAnswers(draft.answers || {})
      setCheatLog((draft.cheatLog || []) as CheatEvent[])
      setCheatWarnings(draft.cheatWarnings || 0)
    }

    if (loaded?.duration_mins) {
      const dl = getOrCreateDeadline(examId!, studentId, loaded.duration_mins)
      setDeadline(dl)
      if (dl && dl <= Date.now()) {
        setTimeout(() => submitFn.current(false), 400)
      }
    }

    const subjectColors: Record<string, string> = {
      physics: '#6366f1', chemistry: '#8b5cf6', biology: '#22c55e',
      math: '#3b82f6', science: '#06b6d4', history: '#f59e0b',
      geography: '#10b981', psychology: '#ec4899', english: '#f97316',
      arabic: '#ef4444', philosophy: '#a855f7', social: '#14b8a6', other: '#6b7280'
    }
    const subject = (examData as Record<string, unknown>)?.teachers as { subject?: string } | undefined
    if (subject?.subject) setAccentColor(subjectColors[subject.subject] || '#0d9488')
    setLoading(false)
  }

  const handleSubmitInternal = useCallback(async (isAutoZero = false) => {
    if (submittedRef.current) return
    submittedRef.current = true
    const studentId = studentIdRef.current
    if (!studentId || !exam) {
      submittedRef.current = false
      return
    }
    setSubmitting(true)
    setSubmitError('')

    const result = await submitExamAttempt({
      studentId,
      examId: exam.id,
      answers,
      cheatLog,
      forceZero: isAutoZero,
      questions,
    })

    if (!result.ok) {
      submittedRef.current = false
      setSubmitting(false)
      setSubmitError('تعذر إرسال الاختبار. تحقق من الإنترنت ثم أعد المحاولة.')
      return
    }

    clearExamSession(exam.id, studentId)
    navigate('/student/portal', {
      state: {
        justSubmitted: true,
        totalScore: result.scored.total_score,
        pendingEssay: result.scored.pendingEssay,
      },
    })
  }, [exam, answers, cheatLog, questions, navigate])

  submitFn.current = handleSubmitInternal

  const handleCheat = useCallback((event: CheatEvent) => {
    if (submittedRef.current) return
    setCheatLog(prev => [...prev, event])
    setCheatWarnings(prev => {
      const next = prev + 1
      if (next >= 3) {
        setAutoZero(true)
        setShowCheatWarning(true)
        window.setTimeout(() => submitFn.current(true), 3500)
      } else {
        setShowCheatWarning(true)
      }
      return next
    })
  }, [])

  useAntiCheat(!loading && !submitting, handleCheat)

  useEffect(() => {
    if (loading || !examId || !studentIdRef.current) return
    saveExamDraft(examId, studentIdRef.current, { answers, cheatLog, cheatWarnings })
  }, [answers, cheatLog, cheatWarnings, examId, loading])

  useEffect(() => {
    if (loading) return
    const onLeave = (e: BeforeUnloadEvent) => {
      if (!submittedRef.current) {
        e.preventDefault()
        e.returnValue = 'الاختبار ما زال مفتوحاً. إجاباتك محفوظة على هذا الجهاز.'
      }
    }
    window.addEventListener('beforeunload', onLeave)
    return () => window.removeEventListener('beforeunload', onLeave)
  }, [loading])

  const setAnswer = (id: string, val: unknown) => {
    setAnswers(prev => ({ ...prev, [id]: val }))
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900" dir="rtl">
        <div className="text-center text-white">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="w-16 h-16 border-4 border-teal-500 border-t-transparent rounded-full mx-auto mb-6"
          />
          <p className="text-xl font-bold text-gray-300">جاري تحميل الاختبار...</p>
        </div>
      </div>
    )
  }

  if (!exam || questions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50" dir="rtl">
        <div className="text-center">
          <div className="text-6xl mb-4">😕</div>
          <p className="text-gray-600 text-xl font-bold">لم يتم العثور على الاختبار</p>
          <button onClick={() => navigate('/student/portal')} className="mt-4 bg-teal-600 text-white px-6 py-3 rounded-xl font-bold">
            العودة
          </button>
        </div>
      </div>
    )
  }

  const layoutProps: LayoutProps = {
    exam, questions, answers, setAnswer, accentColor,
    onSubmit: () => {
      if (submitting) return
      if (!window.confirm('تأكيد إرسال الإجابات الآن؟')) return
      handleSubmitInternal(false)
    },
    submitting,
  }

  const layouts: Record<number, React.ReactNode> = {
    1: <ClassicLayout {...layoutProps} />,
    2: <CardsLayout {...layoutProps} />,
    3: <StepLayout {...layoutProps} />,
    4: <PaperLayout {...layoutProps} />,
    5: <GridLayout {...layoutProps} />,
    6: <CinematicLayout {...layoutProps} />,
  }

  return (
    <div className="relative">
      {/* Sticky Header */}
      <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between gap-2 px-3 sm:px-6 py-2.5 sm:py-3 backdrop-blur-xl pt-[max(0.6rem,env(safe-area-inset-top))]"
        style={{ background: `${accentColor}ee` }}>
        <h1 className="text-white font-black text-sm sm:text-lg truncate min-w-0 flex-1">{exam.title}</h1>
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          {deadline && (
            <ExamTimer deadline={deadline} onExpire={() => handleSubmitInternal(false)} />
          )}
          <div className="bg-white/20 text-white px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl text-xs sm:text-sm font-bold">
            {Object.keys(answers).length}/{questions.length}
          </div>
        </div>
      </div>

      {submitError && (
        <div className="fixed top-16 left-3 right-3 z-50 bg-red-600 text-white text-sm font-bold rounded-xl p-3 text-center">
          {submitError}
        </div>
      )}

      <div className="pt-[4.25rem] sm:pt-16">
        {layouts[exam.layout_type] || layouts[1]}
      </div>

      {/* Cheat Warning */}
      <CheatWarning
        count={showCheatWarning ? cheatWarnings : 0}
        onDismiss={() => setShowCheatWarning(false)}
        autoZero={autoZero}
      />
    </div>
  )
}
